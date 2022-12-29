const crypto = require("crypto");
const FunctionResolver = require("./index");
const TextWeakMap = require("../utils/TextWeakMap.util");
const loggerGenerator = require("../utils/loggerAppender.util");
const typeAssert = require("../utils/typeAssert.util");

const uuid = () =>
    crypto
        .createHash("sha256")
        .update(new Date().valueOf() + crypto.randomBytes(20).toString("hex"))
        .digest("hex");

const constants = {
    errors: {
        CONNECTION_LOST: "CONNECTION_LOST",
    },
};

module.exports = class WeakFunctionPool extends FunctionResolver {
    constructor({
        sendMessage,
        deSerializeObject,
        serializeObject,
        logger,
        session,
    }) {
        super();
        this.session = session;
        this.sendMessage = sendMessage;
        this.logger = loggerGenerator(logger.level, logger.instance, "WFP");
        this.deSerializeObject = deSerializeObject;
        this.serializeObject = serializeObject;
        this.oursFunctions = {};
        this.theirsFunctions = new TextWeakMap();
        this.theirsFunctionsIds = [];
        this.theirsFunctionsWaitPool = {};
        this.timeoutSize = 600 * 1000;

        this.findUnusedTimeout = setTimeout(
            function findUnused() {
                this.#findUnusedFunctions();
                this.findUnusedTimeout = setTimeout(
                    findUnused.bind(this),
                    this.timeoutSize
                );
            }.bind(this),
            this.timeoutSize
        );
        // If Session close connection, emit all waiting functions with `connectionLost` Error
        this.session.addEventListener("close", (code, message) =>
            Object.values(this.theirsFunctionsWaitPool).forEach((item) => {
                const err = new Error(
                    `Session Connection was closed with code "${code}" ${
                        message ? `and message: "${message}"` : ""
                    }`
                );
                err.type = constants.errors.CONNECTION_LOST;
                err.__from = "theirs";
                item(err);
            })
        );

        this.logger.silly("WFP initialized");
    }

    // eslint-disable-next-line class-methods-use-this
    messageBuilder = (type, requestId, data) => ({
        type,
        requestId,
        data,
    });

    // eslint-disable-next-line class-methods-use-this
    baseMessageBuilder = (type, data) => ({
        type,
        data,
    });

    // eslint-disable-next-line class-methods-use-this
    executeFunctionCatcher = async (executor, ...params) => {
        try {
            return executor(...params);
        } catch (e) {
            e.__from = "theirs";
            e.type = "unexpected";
            return e;
        }
    };

    async onMessage(message) {
        this.logger.debug("WFP onmessage", message);
        typeAssert(
            message,
            {
                clear: () => {
                    this.logger.silly("Clear message received");
                    message.data.ids.map((id) =>
                        Reflect.deleteProperty(this.oursFunctions, id)
                    );
                    this.logger.debug(`Cleared ${message.data.ids} functions`);
                },
                execute: async () => {
                    this.logger.silly("Execute message received");
                    this.sendMessage(
                        this.messageBuilder(
                            "executeResponse",
                            message.requestId,
                            {
                                id: message.data.id,
                                payload: this.serializeObject(
                                    await this.executeFunctionCatcher(
                                        this.getOurs(message.data.id),
                                        ...this.deSerializeObject(
                                            message.data.payload,
                                            this.setTheirs.bind(this)
                                        )
                                    ),

                                    this.setOurs.bind(this)
                                ),
                            }
                        )
                    );
                },
                executeResponse: () => {
                    this.logger.silly(
                        `Got Response on execute =>  ${message.data.id}-${message.requestId}`
                    );
                    this.theirsFunctionsWaitPool[message.requestId](
                        this.deSerializeObject(
                            message.data.payload,
                            this.setTheirs.bind(this)
                        )
                    );
                    Reflect.deleteProperty(
                        this.theirsFunctionsWaitPool,
                        message.requestId
                    );
                    this.logger.silly(
                        `Remove from wait pool ${message.data.id}-${message.requestId}`
                    );
                },
            },
            () => {
                this.logger.silly(
                    `Bad type ${message.type} received. Throw an error`
                );
                throw new Error(
                    `Could not understand request. ${
                        message.type
                            ? `Type is "${message.type}"`
                            : "No type presented"
                    }`
                );
            }
        );
    }

    setOurs(executor) {
        const ident = uuid();
        this.oursFunctions[ident] = executor;
        return ident;
    }

    setTheirs(id) {
        this.logger.silly("setTheirs", id);
        this.theirsFunctions.set(
            id,
            (...params) =>
                new Promise((resolve, reject) => {
                    this.logger.debug(
                        "Theirs function wrapper called",
                        id,
                        params
                    );
                    const requestId = uuid();
                    this.theirsFunctionsWaitPool[requestId] = (response) => {
                        this.logger.silly(
                            "Got Response by function response Handler",
                            id
                        );
                        if (
                            typeof response === "object" &&
                            (response.type === "unexpected" ||
                                response.type ===
                                    constants.errors.CONNECTION_LOST) &&
                            response.__from === "theirs"
                        ) {
                            reject(response);
                        } else {
                            resolve(response);
                        }
                    };
                    this.logger.silly(
                        "Theirs function wrapper added in que",
                        `${id}-${requestId}`
                    );
                    try {
                        this.sendMessage(
                            this.messageBuilder("execute", requestId, {
                                id,
                                payload: this.serializeObject(
                                    params,
                                    this.setOurs.bind(this)
                                ),
                            })
                        );
                    } catch (e) {
                        reject(e);
                    }
                    this.logger.silly(
                        "Theirs function wrapper request sent",
                        `${id}-${requestId}`
                    );
                })
        );
        this.theirsFunctionsIds.push(id);
        return this.theirsFunctions.get(id);
    }

    /**
     * @private
     */
    #findUnusedFunctions() {
        this.logger.debug("finding unused functions");
        const functionIds = this.theirsFunctionsIds
            .map((id) => ({ id, presented: this.theirsFunctions.has(id) }))
            .filter((item) => !item.presented)
            .map((item) => item.id);
        if (functionIds.length) {
            this.sendMessage(
                this.baseMessageBuilder("clear", { ids: functionIds })
            );
            this.logger.debug(`Found ${functionIds.length} functions`);
            this.logger.silly("Clear request sent");
        }
    }

    findUnusedFunctions() {
        return this.#findUnusedFunctions();
    }

    getOurs(id) {
        return this.oursFunctions[id] || null;
    }

    getTheirs(id) {
        return this.theirsFunctions.has(id)
            ? this.theirsFunctions.get(id)
            : null;
    }

    close() {
        this.findUnusedTimeout.clearTimeout();
    }
};
