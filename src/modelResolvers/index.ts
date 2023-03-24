import { ModifiedWebSocket } from "../utils/websocketModifier.util";
import { Logger, LoggerLevels, LoggerOptions } from "../utils/logger.util";
import { FunctionResolverFunction, IResolverStatic, Resolver } from "../types";

export abstract class ModelResolver extends Resolver {
    options: {
        session: ModifiedWebSocket;
        logger: LoggerOptions | boolean;
    };

    private logger: Logger;

    constructor(options: {
        session: ModifiedWebSocket;
        logger: LoggerOptions | boolean;
    }) {
        super();
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
        getFunctionId: (executor: Function) => string
    ): object;

    public abstract deserialize(
        model: any,
        getFunctionWrapper: (id: string) => FunctionResolverFunction
    ): any;
}

export interface IModelResolver extends IResolverStatic {
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
}
