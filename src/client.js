const badRequestUtil = require("./utils/badRequest.util");
const RuntimeError = require("./utils/error.utils");
const resultAdapter = require("./utils/resultAdapter.util");
const versionChecker = require("./utils/versionChecker.util");
const UniversalRPC = require("./universalRPC");
const logger = require("./utils/loggerAppender.util");

module.exports = class RPCClient {
    constructor(websocketInstance, options) {
        this.websocketInstance = websocketInstance;
        this.options = options;
        this.logger = logger(
            this.options.logger?.enabled || false,
            this.options.logger?.instance || false
        );

        this.websocketInstance.__send = this.websocketInstance.send;
        this.websocketInstance.send = async (message) => {
            this.websocketInstance.__send(await resultAdapter(message));
        };
        this.logger.silly("Updated websocket.send");

        const send = (type, data) =>
            this.websocketInstance.send(JSON.stringify({ type, data }));

        return (async () =>
            new Promise((resolve, reject) => {
                const initMessageOperator = (messageText) => {
                    this.logger.debug("Received message from server");
                    try {
                        const clientRequest = JSON.parse(messageText.data);

                        if (clientRequest.type === "init") {
                            this.logger.silly("type is init");

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
                                this.options.universalRPC.FunctionResolver
                                    .name ===
                                    clientRequest.data.functionResolver
                            ) {
                                this.logger.silly(
                                    `Server version and server function resolver are ok`
                                );

                                const initPayload = {
                                    version: this.options.version,
                                    key: this.key,
                                };
                                send("init", initPayload);
                                this.logger.verbose(
                                    `Sent init message to server with payload`,
                                    initPayload
                                );
                            } else {
                                throw new RuntimeError(
                                    "Version mismatch",
                                    400,
                                    "Bad Request"
                                );
                            }
                        } else if (clientRequest.type === "ready") {
                            this.logger.silly(`Server ready message received`);

                            this.websocketInstance.sessionId = this.key;
                            const universalSession = new UniversalRPC(
                                this.websocketInstance,
                                {
                                    logger: {
                                        ...this.options.logger,
                                        instance: this.logger,
                                    },
                                    ...this.options.universalRPC,
                                }
                            );
                            this.logger.silly(`UniversalRPC instance created`);

                            this.websocketInstance.removeEventListener(
                                "message",
                                initMessageOperator
                            );
                            this.logger.silly(`initMessageOperator removed`);

                            if (!this.options.callback) {
                                resolve(universalSession);
                            } else {
                                this.options.callback(null, universalSession);
                                resolve();
                            }
                            this.logger.silly("callback completed");

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
                        if (!this.options.callback) {
                            reject(e);
                        } else {
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
};
