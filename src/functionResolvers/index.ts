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

    static typeName(): string {
        throw new Error("typeName() implementation is required");
    }
    public abstract onMessage(message: DataObject): void;

    public abstract setOurs(executor: Function): string;

    public abstract getOurs(id: string): Function | null;

    public abstract setTheirs(id: string): FunctionResolverFunction;

    public abstract getTheirs(id: string): FunctionResolverFunction | null;

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
