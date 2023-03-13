import winston from "winston";
import { ModifiedWebSocket } from "../utils/websocketModifier.util";
import { Logger, LoggerLevels } from "../utils/logger.util";
import { FunctionResolverFunction } from "../types";

export abstract class ModelResolver {
    options: {
        session: ModifiedWebSocket;
        logger:
            | {
                  level?: LoggerLevels;
                  transports?: winston.transport[];
                  parentLogger?: winston.Logger;
              }
            | boolean;
    };

    private logger: Logger;

    constructor(options: {
        session: ModifiedWebSocket;
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
                `${Object.getPrototypeOf(
                    this
                ).constructor.typeName()} ${this.options.session.sessionId.slice(
                    -4
                )}`,
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
    public abstract serialize(
        model: any,
        getFunctionId: (executor: Function) => Promise<string>
    ): Promise<object>;

    public abstract deserialize(
        model: any,
        getFunctionWrapper: (id: string) => Promise<FunctionResolverFunction>
    ): Promise<any>;
}

export interface IModelResolver {
    new (options: {
        session: ModifiedWebSocket;
        logger:
            | {
                  level?: LoggerLevels;
                  transports?: winston.transport[];
                  parentLogger?: winston.Logger;
              }
            | boolean;
    }): ModelResolver;
    typeName(): string;
}
