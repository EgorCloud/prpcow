const EventEmitter = require("events");
const crypto = require("crypto");
const versionChecker = require("./utils/versionChecker.util");
const badRequestUtil = require("./utils/badRequest.util");
const RuntimeError = require("./utils/error.utils");
const typeAssert = require("./utils/typeAssert.util");
const websocketModifier = require("./utils/websocketModifier.util");
const UniversalRPC = require("./universalRPC");
const logger = require("./utils/loggerAppender.util");

module.exports = class RPCServer extends EventEmitter {
    constructor(websocketServerInstance, options) {
        super();
        this.websocketServerInstance = websocketServerInstance;
        this.options = options;
        this.logger = logger(
            this.options?.logger?.level || false,
            this.options?.logger?.instance || null
        );
        this.activeSessions = {};
        this.websocketServerInstance.on(
            "connection",
            (websocketInstance, request) => {
                websocketModifier(websocketInstance);
                this.logger.silly("Updated websocket.send");
                const key = crypto.randomBytes(20).toString("hex");
                // eslint-disable-next-line no-param-reassign
                websocketInstance.sessionId = key;
                this.logger.silly(`Generated and set session key: ${key}`);
                this.logger.debug(`New connection (${key}})`);

                this.#onConnection(websocketInstance, request);
            }
        );
    }

    #onConnection(websocketConnection) {
        const key = websocketConnection.sessionId;
        const keyPart = key.slice(-4);

        const initMessageOperator = (messageText) => {
            this.logger.verbose(
                `[${keyPart}] Received new message by init operator`
            );

            try {
                const clientRequest = JSON.parse(messageText.data);
                this.logger.debug(
                    `[${keyPart}] Received message with Client request message:`,
                    clientRequest
                );

                typeAssert(
                    clientRequest,
                    {
                        init: () => {
                            this.logger.silly(`[${keyPart}] type is init`);

                            if (
                                !versionChecker(
                                    this.options.version,
                                    clientRequest.data.version,
                                    this.options.versionAcceptType
                                )
                            ) {
                                this.logger.silly(
                                    `[${keyPart}] version is not ok`
                                );

                                throw new RuntimeError(
                                    "Version mismatch",
                                    400,
                                    "Bad Request"
                                );
                            }

                            this.logger.silly(`[${keyPart}] version is ok`);

                            const universalRPC = new UniversalRPC(
                                websocketConnection,
                                {
                                    logger: {
                                        ...this.options.logger,
                                        instance: this.logger,
                                    },
                                    ...this.options.universalRPC,
                                }
                            );
                            this.logger.silly(
                                `[${keyPart}] UniversalRPC instance created`
                            );

                            websocketConnection.removeEventListener(
                                "message",
                                initMessageOperator
                            );
                            this.logger.silly("Removed init message listener");

                            websocketConnection.addEventListener("ping", () => {
                                this.logger.silly("Ping Received");
                                websocketConnection.pong();
                                this.logger.silly("Pong sent");
                            });
                            this.logger.silly("Added ping listener");

                            websocketConnection.send({
                                type: "ready",
                                data: { key },
                            });

                            this.logger.silly(
                                `[${keyPart}] Sent ready message`
                            );

                            this.#newSession(universalRPC);
                            this.logger.silly(
                                `[${keyPart}] Emitted onNewSession`
                            );

                            this.logger.debug(
                                `[${keyPart}] Ready to receive messages`
                            );
                        },
                    },
                    () => {
                        this.logger.silly(`Unknown message received`);
                        throw new RuntimeError(
                            "Could not understand request",
                            400,
                            "Bad request"
                        );
                    }
                );
            } catch (e) {
                this.logger.error(e);
                websocketConnection.send(badRequestUtil(e));
                websocketConnection.close();
            }
        };

        websocketConnection.addEventListener("message", initMessageOperator);
        this.logger.silly(`[${keyPart}]  Added init message listener`);

        const initPayload = {
            key,
            version: this.options.version,
            functionResolver: this.options.universalRPC.FunctionResolver.name(),
        };
        websocketConnection.send({ type: "init", data: initPayload });
        this.logger.verbose(
            `[${keyPart}]  Sent init status with message:`,
            initPayload
        );
    }

    /**
     * New Session Event
     * @private
     * @event RPCServer#newSession
     */
    #newSession(universalRPC) {
        universalRPC.addListener("close", () => {
            this.logger.debug(
                "UniversalRPC session closed, removing session from active sessions"
            );
            Reflect.deleteProperty(this.activeSessions, universalRPC.sessionId);
        });
        this.activeSessions[universalRPC.sessionId] = universalRPC;
        this.emit("newSession", universalRPC);
    }

    /**
     * close all connections
     * @param [closeWebsocketServer=true] {boolean} - should also close websocket instance
     * @public
     */
    async close(closeWebsocketServer = true) {
        await Promise.all(
            Object.values(this.activeSessions).map(async (universalRPC) =>
                universalRPC.closeRequest()
            )
        );

        if (closeWebsocketServer) {
            this.websocketServerInstance.close();
            this.logger.debug("Closed websocket server");
        }
    }
};
