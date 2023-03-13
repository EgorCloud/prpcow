import EventEmitter from "events";
import winston from "winston";
import { FunctionResolver, IFunctionResolver } from "../functionResolvers";
import { IModelResolver, ModelResolver } from "../modelResolvers";
import { CompressResolver, ICompressResolver } from "../compressResolvers";
import { Logger, LoggerLevels } from "../utils/logger.util";
import { ModifiedWebSocket } from "../utils/websocketModifier.util";
import typeAssert, { DataObject } from "../utils/typeAssert.util";
import RuntimeError from "../utils/error.utils";
import badRequestUtil from "../utils/badRequest.util";

export default class UniversalRPC extends EventEmitter {
    private options: {
        FunctionResolver: IFunctionResolver;
        ModelResolver: IModelResolver;
        CompressResolver: ICompressResolver;
        logger:
            | {
                  level?: LoggerLevels;
                  transports?: winston.transport[];
                  parentLogger?: winston.Logger;
              }
            | boolean;
    };

    private readonly logger: Logger;

    public readonly session: ModifiedWebSocket;

    public readonly sessionId: string;

    private readonly modelResolver: ModelResolver;

    private readonly functionResolver: FunctionResolver;

    private compressResolver: CompressResolver;

    private _theirsModel: any;

    private _oursModel: {};

    private _closeRequestSides: any;

    constructor(
        session: ModifiedWebSocket,
        options: {
            FunctionResolver: IFunctionResolver;
            ModelResolver: IModelResolver;
            CompressResolver: ICompressResolver;
            logger:
                | {
                      level?: LoggerLevels;
                      transports?: winston.transport[];
                      parentLogger?: winston.Logger;
                  }
                | boolean;
        }
    ) {
        super();
        this.options = options;
        if (typeof this.options.logger !== "boolean") {
            this.logger = new Logger(
                `URPC`,
                this.options.logger.level,
                this.options.logger.transports,
                this.options.logger.parentLogger
            );
        } else {
            this.logger = new Logger(false, "info", []);
        }

        // CloseRequest-specific params
        this._closeRequestSides = [];

        // Session Params
        this.session = session;
        this.sessionId = session.sessionId;

        // Mount null on TheirsModel
        this.makeTheirsModel(null);

        // create modelResolver
        this.modelResolver = new this.options.ModelResolver({
            session: this.session,
            logger: {
                parentLogger: this.logger.logger,
            },
        });

        // create functionResolver
        this.functionResolver = new this.options.FunctionResolver({
            session: this.session,
            sendMessage: this.sendFunctionResolver.bind(this),
            deSerializeObject: this.modelResolver.deserialize.bind(
                this.modelResolver
            ),
            serializeObject: this.modelResolver.serialize.bind(
                this.modelResolver
            ),
            logger: {
                parentLogger: this.logger.logger,
            },
        });

        // create compressResolver
        this.compressResolver = new this.options.CompressResolver({
            session: this.session,
            logger: {
                parentLogger: this.logger.logger,
            },
        });

        this.session.addEventListener("message", async (data) =>
            this.onMessage.bind(this)(
                await this.compressResolver.decompress.bind(
                    this.compressResolver
                )(data)
            )
        );
        this.logger.silly("Session event listener added");
        this.session.addEventListener("close", this.close.bind(this));
        this.logger.info("UniversalRPC initialized");
    }

    private async send(data: any) {
        if (this.session.readyState !== this.session.OPEN)
            throw new Error("Session is not in opened state");
        return this.session.sendWithPrepare(
            data,
            this.compressResolver.compress.bind(this.compressResolver)
        );
    }

    private makeTheirsModel(newModel: any) {
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

    async onMessage(requestData: DataObject) {
        this.logger.debug(`Message received`, requestData);
        if (this.session.readyState !== this.session.OPEN)
            throw new Error("Session is not in opened state");

        try {
            typeAssert(
                requestData,
                {
                    upgradeModel: async () => {
                        this.logger.silly(`Upgrade model received`);
                        this.makeTheirsModel(
                            Object.seal(
                                await this.modelResolver.deserialize(
                                    requestData.data,
                                    this.functionResolver.setTheirs.bind(
                                        this.functionResolver
                                    )
                                )
                            )
                        );
                        this.theirsModelChange();
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
                        this.error(generatedError);
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
                                this._closeRequestSides.map(
                                    (resolve: Function) => resolve()
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
            this.error(e);
            this.logger.silly(`Event "error" emitted`);
            this.session.close();
            this.logger.silly(`Session closed`);
            this.close();
            this.logger.silly(`Event "close" emitted`);
        }
    }

    private async sendUpgradeModel(model: any) {
        this.logger.debug("Sending upgrade model:", model);
        this.send({
            type: "upgradeModel",
            data: model,
        });
    }

    private async sendFunctionResolver(data: any) {
        return this.send({
            type: "functionResolver",
            data,
        });
    }

    private async error(e: Error) {
        this.emit("error", e);
        this.logger.debug("Error event emitted");
    }

    private async close() {
        this.emit("close");
        this.logger.debug("Close Event emitted");
    }

    private theirsModelChange() {
        this.logger.debug(`Model upgraded`, this.theirsModel);
        this.emit("theirsModelChange", this.theirsModel);
        this.logger.silly(`Event "theirsModelChange" emitted`);
    }

    /**
     * Close request
     * Making a request to graceful close connection
     */
    public async closeRequest() {
        this.logger.debug("Requesting close");
        const closeLength = this._closeRequestSides.length;
        const requestClosePromise = new Promise((resolve: Function) => {
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

    addEventListener(
        method: "theirsModelChange",
        cb: (event: any) => void
    ): void;
    addEventListener(method: "error", cb: (error: Error) => void): void;
    addEventListener(method: "close", cb: () => void): void;

    addEventListener(event: string, listener: (...args: any[]) => void) {
        return this.addListener(event, listener);
    }

    /**
     * Set ours model
     * @param newModel - new model
     */
    public setOursModel(newModel: any) {
        this.oursModel = newModel;
    }

    set oursModel(newModel) {
        this.logger.silly("Upgrade oursModel started (set oursModel)");

        this._oursModel = new Proxy(newModel, {
            set: (target, prop, value) => {
                this.logger.silly(
                    `Upgrade ${prop as string} to ${value} in oursModel started`
                );
                Reflect.set(target, prop, value);
                // eslint-disable-next-line no-new
                new Promise(async (resolve: Function, reject) => {
                    try {
                        this.sendUpgradeModel(
                            await this.modelResolver.serialize(
                                this.oursModel,
                                this.functionResolver.setOurs.bind(
                                    this.functionResolver
                                )
                            )
                        );
                        resolve();
                        this.logger.silly(
                            `Upgrade ${
                                prop as string
                            } to ${value} in oursModel done. Waiting for send`
                        );
                    } catch (e) {
                        reject(e);
                    }
                });
                return true;
            },
        });
        this.logger.silly("Upgrade oursModel done. Waiting for send");

        // eslint-disable-next-line no-new
        new Promise(async (resolve: Function, reject) => {
            try {
                this.sendUpgradeModel(
                    await this.modelResolver.serialize(
                        this.oursModel,
                        this.functionResolver.setOurs.bind(
                            this.functionResolver
                        )
                    )
                );
                this.logger.debug("Sent upgrade model");
                resolve();
            } catch (e) {
                reject(e);
            }
        });
    }

    get oursModel() {
        return this._oursModel || {};
    }

    get theirsModel() {
        return this._theirsModel;
    }
}
