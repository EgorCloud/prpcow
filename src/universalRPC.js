const EventEmitter = require("events");
const badRequestUtil = require("./utils/badRequest.util");
const logger = require("./utils/loggerAppender.util");
const RuntimeError = require("./utils/error.utils");
const typeAssert = require("./utils/typeAssert.util");

module.exports = class UniversalRPC extends EventEmitter {
    constructor(session, options) {
        super();
        EventEmitter.init.bind(this);
        this.options = options;
        this.logger = logger(
            this.options?.logger?.level || false,
            this.options?.logger?.instance || null,
            `URPC ${session.sessionId.slice(-4)}`
        );

        // CloseRequest-specific params
        this._closeRequestSides = [];

        // Session Params
        this.session = session;
        this.sessionId = session.sessionId;

        // Mount null on TheirsModel
        this.#makeTheirsModel(null);

        // create modelResolver
        this.modelResolver = new this.options.ModelResolver({
            session: this.session,
            logger: {
                level: this.options.logger?.level || null,
                instance: this.logger,
            },
        });

        // create functionResolver
        this.functionResolver = new this.options.FunctionResolver({
            session: this.session,
            sendMessage: this.#sendFunctionResolver.bind(this),
            deSerializeObject: this.modelResolver.deserialize.bind(
                this.modelResolver
            ),
            serializeObject: this.modelResolver.serialize.bind(
                this.modelResolver
            ),
            logger: {
                level: this.options.logger?.level || null,
                instance: this.logger,
            },
        });

        this.session.addEventListener("message", this.#onMessage.bind(this));
        this.logger.silly("Session event listener added");
        this.session.addEventListener("close", this.#close.bind(this));
        this.logger.info("UniversalRPC initialized");
    }

    send(data) {
        if (this.session.readyState !== this.session.OPEN)
            throw new Error("Session is not in opened state");
        return this.session.send(data);
    }

    #makeTheirsModel(newModel) {
        if (
            (typeof newModel === "object" || typeof newModel === "function") &&
            newModel !== null
        ) {
            this._theirsModel = new Proxy(newModel, {
                get: (target, prop) => {
                    const value = Reflect.get(target, prop);
                    if (value) {
                        return value;
                    }
                    throw new Error("Cannot get non-existed element");
                },
                set: () => {
                    throw new Error("Cannot change values in TheirsModel");
                },
            });
        } else {
            this._theirsModel = newModel;
        }
    }

    async #onMessage(messageText) {
        this.logger.debug(`Message received`, messageText.data);
        if (this.session.readyState !== this.session.OPEN)
            throw new Error("Session is not in opened state");

        try {
            const requestData = JSON.parse(messageText.data);
            typeAssert(
                requestData,
                {
                    upgradeModel: () => {
                        this.logger.silly(`Upgrade model received`);
                        this.#makeTheirsModel(
                            Object.seal(
                                this.modelResolver.deserialize(
                                    requestData.data,
                                    this.functionResolver.setTheirs.bind(
                                        this.functionResolver
                                    )
                                )
                            )
                        );
                        this.#theirsModelChange();
                    },
                    functionResolver: () => {
                        this.logger.silly(`"functionResolver" type received`);
                        this.functionResolver.onMessage(requestData.data);
                    },
                    error: () => {
                        const generatedError = new RuntimeError(
                            requestData.error.message,
                            requestData.error.status,
                            requestData.error.name
                        );
                        this.logger.error(`Error received`, generatedError);
                        this.#error(generatedError);
                    },
                    closeRequest: async () => {
                        this.logger.silly(`"closeRequest" type received`);
                        /**
                         * close Request event
                         *
                         * @event UniversalRPC#closeRequest
                         */
                        await Promise.all(
                            this.listeners("closeRequest").map((item) => item())
                        );
                        this.send(
                            JSON.stringify({
                                type: "closeRequestConfirm",
                            })
                        );
                    },
                    closeRequestConfirm: async () => {
                        this.logger.silly(
                            `"requestCloseConfirm" type received`
                        );
                        if (this._closeRequestSides.length) {
                            await Promise.all(
                                this._closeRequestSides.map((resolve) =>
                                    resolve()
                                )
                            );
                            this.logger.silly(`Close requests resolved`);

                            await this.session.close();
                            this.logger.silly(`Session closed`);
                        } else {
                            throw new Error("Close request not created");
                        }
                    },
                },
                () => {
                    throw new Error("Unexpected Type");
                }
            );
        } catch (e) {
            this.logger.error(e);
            this.send(badRequestUtil(e));
            this.#error(e);
            this.logger.silly(`Event "error" emitted`);
            this.session.close();
            this.logger.silly(`Session closed`);
            this.#close();
            this.logger.silly(`Event "close" emitted`);
        }
    }

    /**
     * @private
     */
    async #sendUpgradeModel(model) {
        this.logger.debug("Sending upgrade model:", model);
        this.send({
            type: "upgradeModel",
            data: model,
        });
    }

    /**
     * @private
     */
    async #sendFunctionResolver(data) {
        this.send({
            type: "functionResolver",
            data,
        });
    }

    /**
     * @private
     */
    #error(e) {
        /**
         * Error Event
         *
         * @event UniversalRPC#error
         * @type {Error}
         */
        this.emit("error", e);
        this.logger.debug("Error event emitted");
    }

    /**
     * @private
     */
    #close() {
        /**
         * Close Event
         *
         * @event UniversalRPC#close
         */
        this.emit("close");
        this.logger.debug("Close Event emitted");
    }

    /**
     * @private
     */
    #theirsModelChange() {
        /**
         * Theirs model change event
         *
         * @event UniversalRPC#theirsModelChange
         */
        this.logger.verbose(`Model upgraded`, this.theirsModel);
        this.emit("theirsModelChange", this.theirsModel);
        this.logger.silly(`Event "theirsModelChange" emitted`);
    }

    /**
     * Close request
     * Making a request to graceful close connection
     * @public
     */
    async closeRequest() {
        this.logger.debug("Requesting close");
        const closeLength = this._closeRequestSides.length;
        const requestClosePromise = new Promise((resolve) => {
            this._closeRequestSides.push(() => resolve());
        });
        this.logger.silly("Request close promise added");

        if (!closeLength) {
            this.send({
                type: "closeRequest",
            });
            this.logger.silly("Request close sent");
        }
        return requestClosePromise;
    }

    addEventlistener(event, listener) {
        return this.addListener(event, listener);
    }

    /**
     * Set ours model
     * @param newModel {any} - new model
     * @public
     */
    setOursModel(newModel) {
        this.oursModel = newModel;
    }

    set oursModel(newModel) {
        this.logger.silly("Fully Upgrade oursModel");

        this._oursModel = new Proxy(newModel, {
            set: (target, prop, value) => {
                this.logger.silly(`Upgrade ${prop} to ${value}`);
                Reflect.set(target, prop, value);
                this.#sendUpgradeModel(
                    this.modelResolver.serialize(
                        this.oursModel,
                        this.functionResolver.setOurs.bind(
                            this.functionResolver
                        )
                    )
                );
                return true;
            },
        });
        this.logger.silly("Upgrade oursModel done");

        this.#sendUpgradeModel(
            this.modelResolver.serialize(
                this.oursModel,
                this.functionResolver.setOurs.bind(this.functionResolver)
            )
        );
        this.logger.debug("Sent upgrade model");
    }

    get oursModel() {
        return this._oursModel || {};
    }

    get theirsModel() {
        return this._theirsModel;
    }
};
