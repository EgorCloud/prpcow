const EventEmitter = require("events");
const crypto = require("crypto");
const versionChecker = require("./utils/versionChecker.util");
const badRequestUtil = require("./utils/badRequest.util");
const RuntimeError = require("./utils/error.utils");
const resultAdapter = require("./utils/resultAdapter.util");
const UniversalRPC = require("./universalRPC");
const logger = require("./utils/loggerAppender.util");

module.exports = class RPCServer {
    constructor(websocketInstance, options) {
        this.websocketInstance = websocketInstance;
        this.options = options;
        this.logger = logger(
            this.options?.logger?.enabled || false,
            this.options?.logger?.instance || null
        );
        this.activeSessions = {};
        this.eventEmitter = new EventEmitter();
        this.websocketInstance.on("connection", (ws, request) => {
            // eslint-disable-next-line no-param-reassign
            ws.__send = ws.send;
            // eslint-disable-next-line no-param-reassign
            ws.send = async (message) =>
                ws.__send(await resultAdapter(message));
            const key = crypto.randomBytes(20).toString("hex");
            // eslint-disable-next-line no-param-reassign
            ws.sessionId = key;
            this.logger.silly(`Generated session key: ${key}`);
            this.logger.silly("Updated websocket.send");

            this.logger.info(`New connection (${key}})`);
            this.onConnection(ws, request);
        });
    }

    onConnection(websocket) {
        const key = websocket.sessionId;
        const keyPart = key.slice(-4);
        const send = (type, data) =>
            websocket.send(JSON.stringify({ type, data }));

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

                if (clientRequest.type === "init") {
                    this.logger.silly(`[${keyPart}] type is init`);

                    if (
                        versionChecker(
                            this.options.version,
                            clientRequest.data.version,
                            this.options.versionAcceptType
                        )
                    ) {
                        this.logger.silly(`[${keyPart}] version is ok`);

                        const universalRPC = new UniversalRPC(websocket, {
                            logger: {
                                ...this.options.logger,
                                instance: this.logger,
                            },
                            ...this.options.universalRPC,
                        });
                        this.logger.silly(
                            `[${keyPart}] UniversalRPC instance created`
                        );

                        websocket.removeEventListener(
                            "message",
                            initMessageOperator
                        );
                        this.logger.silly("Removed init message listener");

                        send("ready", { key });
                        this.logger.silly(`[${keyPart}] Sent ready message`);

                        this.emitOnNewSession(universalRPC);
                        this.logger.silly(`[${keyPart}] Emitted onNewSession`);

                        this.logger.debug(
                            `[${keyPart}] Ready to receive messages`
                        );
                    } else {
                        this.logger.silly(`[${keyPart}] version is not ok`);
                        this.logger.debug(
                            `[${keyPart}] Sent bad request due to version mismatch and closed connection`
                        );

                        throw new RuntimeError(
                            "Version mismatch",
                            400,
                            "Bad Request"
                        );
                    }
                } else {
                    this.logger.silly(`Unknown message received`);
                    throw new RuntimeError(
                        "Could not understand request",
                        400,
                        "Bad request"
                    );
                }
            } catch (e) {
                this.logger.error(e);
                websocket.send(badRequestUtil(e));
                websocket.close();
            }
        };

        websocket.addEventListener("message", initMessageOperator);
        this.logger.silly(`[${keyPart}]  Added init message listener`);

        const initPayload = {
            key,
            version: this.options.version,
            functionResolver: this.options.universalRPC.FunctionResolver.name,
        };

        send("init", initPayload);
        this.logger.verbose(
            `[${keyPart}]  Sent init status with message:`,
            initPayload
        );
    }

    /**
     * Adds the `listener` function to the end of the listeners array for the
     * event named `eventName`. No checks are made to see if the `listener` has
     * already been added. Multiple calls passing the same combination of `eventName`and `listener` will result in the `listener` being added, and called, multiple
     * times.
     *
     *
     * Returns a reference to the `EventEmitter`, so that calls can be chained.
     *
     * By default, event listeners are invoked in the order they are added. The`emitter.prependListener()` method can be used as an alternative to add the
     * event listener to the beginning of the listeners array.
     *
     * @param eventName The name of the event.
     * @param listener The callback function
     */
    on(eventName, listener) {
        return this.eventEmitter.on(eventName, listener);
    }

    /**
     * New Session Event
     *
     * @event RPCServer#newSession
     * @type {UniversalRPC}
     */
    emitOnNewSession(universalRPC) {
        universalRPC.on("close", () => {
            this.logger.debug(
                "UniversalRPC session closed, removing session from active sessions"
            );
            Reflect.deleteProperty(this.activeSessions, universalRPC.sessionId);
        });
        this.activeSessions[universalRPC.sessionId] = universalRPC;
        this.eventEmitter.emit("newSession", universalRPC);
    }

    async close() {
        await Promise.all(
            Object.values(this.activeSessions).map(async (universalRPC) =>
                universalRPC.requestClose()
            )
        );

        this.websocketInstance.close();
        this.logger.debug("Closed websocket server");
    }
};
