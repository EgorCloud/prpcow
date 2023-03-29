import { DataObject } from "../utils/typeAssert.util";
import { ModifiedWebSocket } from "../utils/websocketModifier.util";
import { Logger, LoggerOptions } from "../utils/logger.util";
import { ModelResolver } from "../modelResolvers";
import { FunctionResolverFunction, IResolverStatic, Resolver } from "../types";
import { IdResolver } from "../idResolvers";

export abstract class FunctionResolver extends Resolver {
    protected options: {
        session: ModifiedWebSocket;
        sendMessage: (message: any) => Promise<void>;
        deSerializeObject: ModelResolver["deserialize"];
        serializeObject: ModelResolver["serialize"];
        uuid: IdResolver["gen"];
        logger: LoggerOptions | boolean;
    };

    protected logger: Logger;

    constructor(options: {
        session: ModifiedWebSocket;
        sendMessage: (message: any) => Promise<void>;
        deSerializeObject: ModelResolver["deserialize"];
        serializeObject: ModelResolver["serialize"];
        uuid: IdResolver["gen"];
        logger: LoggerOptions | boolean;
    }) {
        super();
        this.options = options;
        if (typeof this.options.logger !== "boolean") {
            this.logger = new Logger({
                ...this.options.logger,
                name: `${Object.getPrototypeOf(this).constructor.typeName()}`,
            });
        } else {
            this.logger = new Logger();
        }
    }

    public abstract onMessage(message: DataObject): Promise<void> | void;

    public abstract setOurs(executor: Function): Promise<string>;

    public abstract getOurs(id: string): Promise<Function | null>;

    public abstract setTheirs(id: string): Promise<FunctionResolverFunction>;

    public abstract getTheirs(
        id: string
    ): Promise<FunctionResolverFunction | null>;

    public abstract close(): void;
}

export interface IFunctionResolver extends IResolverStatic {
    new (options: {
        session: ModifiedWebSocket;
        sendMessage: (message: any) => Promise<void>;
        deSerializeObject: ModelResolver["deserialize"];
        serializeObject: ModelResolver["serialize"];
        uuid: IdResolver["gen"];
        logger: LoggerOptions | boolean;
    }): FunctionResolver;
}
