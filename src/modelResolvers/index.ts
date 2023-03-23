import { ModifiedWebSocket } from "../utils/websocketModifier.util";
import { Logger, LoggerLevels, LoggerOptions } from "../utils/logger.util";
import { FunctionResolverFunction } from "../types";

export abstract class ModelResolver {
    options: {
        session: ModifiedWebSocket;
        logger: LoggerOptions | boolean;
    };

    private logger: Logger;

    constructor(options: {
        session: ModifiedWebSocket;
        logger: LoggerOptions | boolean;
    }) {
        this.options = options;
        if (typeof this.options.logger !== "boolean") {
            this.logger = new Logger({
                ...this.options.logger,
                name: `${Object.getPrototypeOf(
                    this
                ).constructor.typeName()} ${this.options.session.sessionId.slice(
                    -4
                )}`,
            });
        } else {
            this.logger = new Logger();
        }
    }

    static typeName(): string {
        throw new Error("typeName() implementation is required");
    }
    public abstract serialize(
        model: any,
        getFunctionId: (executor: Function) => Promise<string> | string
    ): Promise<object> | object;

    public abstract deserialize(
        model: any,
        getFunctionWrapper: (
            id: string
        ) => Promise<FunctionResolverFunction> | FunctionResolverFunction
    ): Promise<any> | any;
}

export interface IModelResolver {
    new (options: {
        session: ModifiedWebSocket;
        logger:
            | {
                  level?: LoggerLevels;
                  transports?: any;
                  parentLogger?: any;
              }
            | boolean;
    }): ModelResolver;
    typeName(): string;
}
