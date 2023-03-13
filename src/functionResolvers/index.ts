import winston from "winston";
import { DataObject } from "../utils/typeAssert.util";
import { ModifiedWebSocket } from "../utils/websocketModifier.util";
import { Logger, LoggerLevels } from "../utils/logger.util";
import { ModelResolver } from "../modelResolvers";
import { FunctionResolverFunction } from "../types";

export abstract class FunctionResolver {
    protected options: {
        session: ModifiedWebSocket;
        sendMessage: (message: any) => Promise<void>;
        deSerializeObject: ModelResolver["deserialize"];
        serializeObject: ModelResolver["serialize"];
        logger:
            | {
                  level?: LoggerLevels;
                  transports?: winston.transport[];
                  parentLogger?: winston.Logger;
              }
            | boolean;
    };

    protected logger: Logger;

    constructor(options: {
        session: ModifiedWebSocket;
        sendMessage: (message: any) => Promise<void>;
        deSerializeObject: ModelResolver["deserialize"];
        serializeObject: ModelResolver["serialize"];
        logger:
            | {
                  level?: LoggerLevels;
                  transports?: winston.transport[];
                  parentLogger?: winston.Logger;
              }
            | boolean;
    }) {
        this.options = options;
        if (typeof this.options.logger !== "boolean") {
            this.logger = new Logger(
                `${Object.getPrototypeOf(this).constructor.typeName()}`,
                this.options.logger.level,
                this.options.logger.transports,
                this.options.logger.parentLogger
            );
        } else {
            this.logger = new Logger(false, "info", []);
        }
    }

    static typeName(): string {
        throw new Error("typeName() implementation is required");
    }
    public abstract onMessage(message: DataObject): Promise<void>;

    public abstract setOurs(executor: Function): Promise<string>;

    public abstract getOurs(id: string): Promise<Function> | Promise<null>;

    public abstract setTheirs(id: string): Promise<FunctionResolverFunction>;

    public abstract getTheirs(
        id: string
    ): Promise<FunctionResolverFunction> | Promise<null>;

    public abstract close(): void;
}

export interface IFunctionResolver {
    new (options: {
        session: ModifiedWebSocket;
        sendMessage: (message: any) => Promise<void>;
        deSerializeObject: ModelResolver["deserialize"];
        serializeObject: ModelResolver["serialize"];
        logger:
            | {
                  level?: LoggerLevels;
                  transports?: winston.transport[];
                  parentLogger?: winston.Logger;
              }
            | boolean;
    }): FunctionResolver;

    typeName(): string;
}
