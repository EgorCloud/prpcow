const crypto = require("crypto");
const FunctionResolver = require("./index");
const TextWeakMap = require("../utils/TextWeakMap.util");
const loggerGenerator = require("../utils/loggerAppender.util");

module.exports = class WeakFunctionPool extends FunctionResolver {
    constructor({ sendMessage, deSerializeObject, serializeObject, logger }) {
        super();
        this.sendMessage = sendMessage;
        this.logger = loggerGenerator(logger.enabled, logger.instance, "WFP");
        this.deSerializeObject = deSerializeObject;
        this.serializeObject = serializeObject;
        this.oursFunctions = {};
        this.theirsFunctions = new TextWeakMap();
        this.theirsFunctionsIds = [];
        this.theirsFunctionsWaitPool = {};
        this.executeFunctionCatcher = async (executor, ...params) => {
            try {
                const functionResult = await executor(...params);
                return functionResult;
            } catch (e) {
                e.__from = "theirs";
                e.type = "unexpected";
                return e;
            }
        };
        this.messageBuilder = (type, requestId, data) => ({
            type,
            requestId,
            data,
        });
        this.logger.silly("WFP initialized");
    }

    async onmessage(message) {
        this.logger.debug("WFP onmessage", message);
        switch (message.type) {
            case "clear":
                Reflect.deleteProperty(this.oursFunctions, message.data.id);
                break;
            case "execute":
                this.logger.silly("Execute message received");
                this.sendMessage(
                    this.messageBuilder("executeResponse", message.requestId, {
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
                    })
                );
                break;
            case "executeResponse":
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
                break;
            default:
                this.sendMessage();
        }
    }

    setOurs(executor) {
        const ident = crypto
            .createHash("sha256")
            .update(
                new Date().valueOf() + crypto.randomBytes(20).toString("hex")
            )
            .digest("hex");
        this.oursFunctions[ident] = executor;
        return ident;
    }

    setTheirs(id) {
        this.logger.silly("setTheirs", id);
        const resolveFunction = (...params) =>
            new Promise((resolve, reject) => {
                this.logger.debug("Theirs function wrapper called", id, params);
                const requestId = crypto
                    .createHash("sha256")
                    .update(
                        new Date().valueOf() +
                            crypto.randomBytes(20).toString("hex")
                    )
                    .digest("hex");
                this.theirsFunctionsWaitPool[requestId] = (response) => {
                    this.logger.silly(
                        "Got Response by function response Handler",
                        id
                    );
                    if (
                        typeof response === "object" &&
                        response.type === "unexpected" &&
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
                this.sendMessage(
                    this.messageBuilder("execute", requestId, {
                        id,
                        payload: this.serializeObject(
                            params,
                            this.setOurs.bind(this)
                        ),
                    })
                );
                this.logger.silly(
                    "Theirs function wrapper request sent",
                    `${id}-${requestId}`
                );
            });

        this.theirsFunctions.set(id, resolveFunction);
        this.theirsFunctionsIds.push(id);
        return resolveFunction;
    }

    getOurs(id) {
        return this.oursFunctions[id] || null;
    }

    getTheirs(id) {
        return this.theirsFunctions.has(id)
            ? this.theirsFunctions.get(id)
            : null;
    }
};
