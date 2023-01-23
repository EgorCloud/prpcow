const typeAssert = require("./utils/typeAssert.util");
const badRequestUtil = require("./utils/badRequest.util");
const RuntimeError = require("./utils/error.utils");
const websocketModifier = require("./utils/websocketModifier.util");
const versionChecker = require("./utils/versionChecker.util");
const UniversalRPC = require("./universalRPC");
const logger = require("./utils/loggerAppender.util");

module.exports = class RPCClient {
    constructor(websocketInstance, options) {
        this.websocket = websocketInstance;
        this.options = options;
        this.logger = logger(
            this.options.logger?.level || false,
            this.options.logger?.instance || false
        );

        // Modify websocket
        websocketModifier(this.websocket);
        this.logger.silly("Updated websocket.send");
        return this._init();
    }

    _init = () =>
        new Promise((resolve, reject) => {
            const initMessageOperator = (messageText) => {
                this.logger.debug("Received message from server");
                try {
                    const clientRequest = JSON.parse(messageText.data);
                    typeAssert(
                        clientRequest,
                        {
                            init: () => {
                                this.logger.silly("type is init");

                                // set the session key
                                this.key = clientRequest.data.key;
                                this.logger.silly(
                                    `Server key: ${this.key} received from Server`
                                );

                                if (
                                    !(
                                        versionChecker(
                                            this.options.version,
                                            clientRequest.data.version,
                                            this.options.versionAcceptType
                                        ) &&
                                        clientRequest.data.functionResolver ===
                                            this.options.universalRPC.FunctionResolver.name()
                                    )
                                ) {
                                    throw new RuntimeError(
                                        "Version mismatch",
                                        400,
                                        "Bad Request"
                                    );
                                }

                                this.logger.silly(
                                    `Server version and server function resolver are ok`
                                );

                                const initPayload = {
                                    version: this.options.version,
                                    key: this.key,
                                };
                                this.websocket.send({
                                    type: "init",
                                    data: initPayload,
                                });
                                this.logger.verbose(
                                    `Sent init message to server with payload`,
                                    initPayload
                                );
                            },
                            ready: () => {
                                this.logger.silly(
                                    `Server ready message received`
                                );

                                this.websocket.sessionId = this.key;
                                const universalSession = new UniversalRPC(
                                    this.websocket,
                                    {
                                        logger: {
                                            ...this.options.logger,
                                            instance: this.logger,
                                        },
                                        ...this.options.universalRPC,
                                    }
                                );
                                this.logger.silly(
                                    `UniversalRPC instance created`
                                );

                                this.websocket.removeEventListener(
                                    "message",
                                    initMessageOperator
                                );
                                this.logger.silly(
                                    `initMessageOperator removed`
                                );

                                if (!this.options.callback) {
                                    resolve(universalSession);
                                } else {
                                    this.options.callback(
                                        null,
                                        universalSession
                                    );
                                    resolve();
                                }
                                this.logger.silly(
                                    "callback (and Promise) resolved"
                                );
                                this.logger.debug(`Ready to receive messages`);
                            },
                        },
                        () => {
                            this.logger.silly(`Unknown message received`);
                            throw new RuntimeError(
                                `Could not understand request. "${
                                    clientRequest.type
                                        ? `Received type: ${clientRequest.type}`
                                        : "No type received"
                                }"`,
                                400,
                                "Bad request"
                            );
                        }
                    );
                } catch (e) {
                    this.logger.error(e);
                    this.websocket.send(badRequestUtil(e));
                    this.websocket.close();
                    if (!this.options.callback) {
                        reject(e);
                    } else {
                        this.options.callback(e, null);
                        resolve();
                    }
                }
            };

            this.websocket.addEventListener("message", initMessageOperator);
            this.logger.silly("Added initMessageOperator event listener");
        });
};
