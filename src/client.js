const badRequestUtil = require("./utils/badRequest.util");
const RuntimeError = require("./utils/error.utils");
const resultAdapter = require("./utils/resultAdapter.util");
const versionChecker = require("./utils/versionChecker.util");
const UniversalRPC = require("./universalRPC");
const logger = require("./utils/loggerAppender.util");

module.exports = class RPCClient {
    constructor(websocketInstance, options) {
        this.options = options;
        this.logger = logger(
            this.options.logger?.enabled || false,
            this.options.logger?.instance || false
        );
        this.websocketInstance = websocketInstance;
        this.websocketInstance.__send = this.websocketInstance.send;
        this.websocketInstance.send = async (message) => {
            this.websocketInstance.__send(await resultAdapter(message));
        };
        this.logger.silly("Updated websocket.send");
        return (async () =>
            new Promise((resolve, reject) => {
                const initMessageOperator = (messageText) => {
                    this.logger.debug("Received init message");
                    try {
                        const clientRequest = JSON.parse(messageText.data);

                        if (clientRequest.type === "init") {
                            this.key = clientRequest.data.key;
                            this.logger.silly(
                                `Server key: ${this.key} received from Server`
                            );

                            if (
                                versionChecker(
                                    this.options.version,
                                    clientRequest.data.version,
                                    this.options.versionAcceptType
                                ) &&
                                this.options.FunctionResolver.name ===
                                    clientRequest.data.functionResolver
                            ) {
                                this.logger.silly(
                                    `Server version and server function resolver are ok`
                                );

                                this.send("init", {
                                    version: this.options.version,
                                    key: this.key,
                                });
                                this.logger.debug(
                                    `Sent init message to server with message`,
                                    {
                                        version: this.options.version,
                                        key: this.key,
                                    }
                                );
                            } else {
                                throw new RuntimeError(
                                    "Client version is not compatible with server version",
                                    400,
                                    "Bad request"
                                );
                            }
                        } else if (clientRequest.type === "ready") {
                            this.logger.silly(`Server ready message received`);
                            this.websocketInstance.sessionId = this.key;
                            const universalSession = new UniversalRPC(
                                this.websocketInstance,
                                this.options
                            );
                            this.logger.silly(`UniversalRPC instance created`);

                            if (!this.options.callback)
                                resolve(universalSession);
                            else {
                                this.options.callback(null, universalSession);
                                resolve();
                            }
                            this.websocketInstance.removeEventListener(
                                "message",
                                initMessageOperator
                            );
                            this.logger.silly(`initMessageOperator removed`);
                            this.logger.debug(`Ready to receive messages`);
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
                        this.websocketInstance.send(badRequestUtil(e));
                        this.websocketInstance.close();
                        if (!this.options.callback) reject(e);
                        else {
                            this.options.callback(e, null);
                            resolve();
                        }
                    }
                };
                this.websocketInstance.addEventListener(
                    "message",
                    initMessageOperator
                );
                this.logger.silly("Added initMessageOperator event listener");
            }))();
    }

    send(type, data) {
        return this.websocketInstance.send(
            JSON.stringify({
                type,
                data,
            })
        );
    }
};
