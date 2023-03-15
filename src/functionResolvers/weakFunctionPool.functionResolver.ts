// eslint-disable-next-line max-classes-per-file
import { v4 as uuid } from "uuid";
import typeAssert, { DataObject } from "../utils/typeAssert.util";
import { FunctionResolver } from "./index";
import { ModifiedWebSocket } from "../utils/websocketModifier.util";
import { ModelResolver } from "../modelResolvers";
import { LoggerLevels } from "../utils/logger.util";

const constants = {
    errors: {
        CONNECTION_LOST: "CONNECTION_LOST",
    },
};

export class TextWeakMap extends WeakMap {
    private readonly textAdapter: Map<any, any>;

    constructor(entries?: readonly [object, any][] | null) {
        super(entries);
        this.textAdapter = new Map();
    }

    set(key: any | string, value: any) {
        // eslint-disable-next-line no-new-wrappers
        const ObjectKey = new String(key);
        this.textAdapter.set(key, ObjectKey);
        return super.set(ObjectKey, value);
    }

    delete(key: any | string) {
        const result = super.delete(this.textAdapter.get(key));
        this.textAdapter.delete(key);
        return result;
    }

    get(key: any | string) {
        return super.get(this.textAdapter.get(key));
    }

    has(key: any) {
        return super.has(this.textAdapter.get(key));
    }

    getTextAdapter() {
        return this.textAdapter;
    }

    getTextAdapterKeys() {
        return Array.from(this.textAdapter.keys());
    }
}

export default class WeakFunctionPool extends FunctionResolver {
    static typeName() {
        return "WeakFunctionPool";
    }

    private readonly timeoutSize: number;

    private readonly oursFunctions: { [x: string]: Function };

    private readonly theirsFunctionsWaitPool: {
        [x: string]: Function;
    };

    private theirsFunctionsIds: string[];

    private theirsFunctions: TextWeakMap;

    private findUnusedTimeout: any;

    constructor(options: {
        session: ModifiedWebSocket;
        sendMessage: (message: any) => any;
        deSerializeObject: ModelResolver["deserialize"];
        serializeObject: ModelResolver["serialize"];
        logger:
            | {
                  level?: LoggerLevels;
                  transports?: any;
                  parentLogger?: any;
              }
            | boolean;
    }) {
        super(options);
        this.oursFunctions = {};
        this.theirsFunctions = new TextWeakMap();
        this.theirsFunctionsIds = [];
        this.theirsFunctionsWaitPool = {};
        this.timeoutSize = 600 * 1000;

        this.findUnusedTimeout = setTimeout(
            function findUnused() {
                this.findUnusedFunctions();
                this.findUnusedTimeout = setTimeout(
                    findUnused.bind(this),
                    this.timeoutSize
                );
            }.bind(this),
            this.timeoutSize
        );
        this.logger.silly("Created findUnusedTimeout with", {
            timeoutSize: this.timeoutSize,
        });
        // If connection was closed, we need to reject all promises
        this.options.session.on("close", (code, message) =>
            Object.values(this.theirsFunctionsWaitPool).forEach((item) => {
                const err = new Error(
                    `Session Connection was closed with code "${code}" ${
                        message ? `and message: "${message}"` : ""
                    }`
                );
                // @ts-ignore
                err.type = constants.errors.CONNECTION_LOST;
                // @ts-ignore
                err.__from = "theirs";
                item(err);
            })
        );
        this.logger.silly("Mounted event listener on close event");

        this.logger.silly("Ready to use");
    }

    // eslint-disable-next-line class-methods-use-this
    private messageBuilder = (type: string, requestId: string, data: any) => ({
        type,
        requestId,
        data,
    });

    // eslint-disable-next-line class-methods-use-this
    private baseMessageBuilder = (type: string, data: any) => ({
        type,
        data,
    });

    // eslint-disable-next-line class-methods-use-this
    executeFunctionCatcher = async (executor: Function, ...params: any[]) => {
        try {
            return executor(...params);
        } catch (e) {
            e.__from = "theirs";
            e.type = "unexpected";
            return e;
        }
    };

    public async onMessage(message: DataObject) {
        this.logger.debug("WFP onmessage", message);
        typeAssert(
            message,
            {
                clear: () => {
                    this.logger.silly("Clear message received");
                    message.data.ids.map((id: string) =>
                        Reflect.deleteProperty(this.oursFunctions, id)
                    );
                    this.logger.debug(`Cleared ${message.data.ids} functions`);
                },
                execute: async () => {
                    this.logger.silly("Execute message received");
                    this.options.sendMessage(
                        this.messageBuilder(
                            "executeResponse",
                            message.requestId,
                            {
                                id: message.data.id,
                                payload: await this.options.serializeObject(
                                    await this.executeFunctionCatcher(
                                        await this.getOurs(message.data.id),
                                        ...(await this.options.deSerializeObject(
                                            message.data.payload,
                                            this.setTheirs.bind(this)
                                        ))
                                    ),

                                    this.setOurs.bind(this)
                                ),
                            }
                        )
                    );
                },
                executeResponse: async () => {
                    this.logger.silly(
                        `Got Response on execute (${message.requestId})`
                    );
                    this.theirsFunctionsWaitPool[message.requestId](
                        await this.options.deSerializeObject(
                            message.data.payload,
                            this.setTheirs.bind(this)
                        )
                    );
                    Reflect.deleteProperty(
                        this.theirsFunctionsWaitPool,
                        message.requestId
                    );
                    this.logger.silly(
                        `Remove from wait pool (${message.requestId})`
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

    async setOurs(executor: Function) {
        const ident = uuid();
        this.oursFunctions[ident] = executor;
        return ident;
    }

    async setTheirs(id: string) {
        this.logger.silly("setTheirs", id);
        this.theirsFunctions.set(
            id,
            (...params: any[]) =>
                new Promise(async (resolve, reject) => {
                    this.logger.debug(
                        "Theirs function wrapper called",
                        id,
                        params
                    );
                    const requestId = uuid();
                    this.theirsFunctionsWaitPool[requestId] = (
                        response: any
                    ) => {
                        this.logger.silly(
                            `Got Response by function response Handler (${id})`
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
                        `Theirs function wrapper added in que (${requestId})`
                    );
                    try {
                        await this.options.sendMessage(
                            this.messageBuilder("execute", requestId, {
                                id,
                                payload: await this.options.serializeObject(
                                    params,
                                    this.setOurs.bind(this)
                                ),
                            })
                        );
                        this.logger.silly(
                            `Theirs function wrapper request sent (${requestId})`
                        );
                    } catch (e) {
                        this.logger.silly(
                            `Theirs function wrapper request failed (${requestId})`
                        );
                        Reflect.deleteProperty(
                            this.theirsFunctionsWaitPool,
                            requestId
                        );
                        this.logger.silly(
                            `Remove from wait pool (${requestId})`
                        );
                        reject(e);
                    }
                })
        );
        this.theirsFunctionsIds.push(id);
        return this.theirsFunctions.get(id);
    }

    /**
     * @private
     */
    public findUnusedFunctions() {
        this.logger.debug("finding unused functions");
        const functionIds = this.theirsFunctionsIds
            .map((id) => ({ id, presented: this.theirsFunctions.has(id) }))
            .filter((item) => !item.presented)
            .map((item) => item.id);
        if (functionIds.length) {
            this.options.sendMessage(
                this.baseMessageBuilder("clear", { ids: functionIds })
            );
            this.logger.debug(`Found ${functionIds.length} functions`);
            this.logger.silly("Clear request sent");
        }
    }

    async getOurs(id: string) {
        return this.oursFunctions[id] || null;
    }

    getTheirs(id: string) {
        return this.theirsFunctions.has(id)
            ? this.theirsFunctions.get(id)
            : null;
    }

    close() {
        this.findUnusedTimeout.clearTimeout();
    }
}
