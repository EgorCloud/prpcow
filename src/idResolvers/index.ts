import { ModifiedWebSocket } from "../utils/websocketModifier.util";
import { Logger, LoggerOptions } from "../utils/logger.util";
import { IResolverStatic, Resolver } from "../types";

export type IdResolverOptions = {
    session: ModifiedWebSocket;
    logger: LoggerOptions | boolean;
};

export abstract class IdResolver extends Resolver {
    protected options: IdResolverOptions;

    protected logger: Logger;

    constructor(options: IdResolverOptions) {
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

    public abstract gen(...params: any[]): Promise<string>;
    public abstract close(): void;
}

export interface IIdResolver extends IResolverStatic {
    new (options: IdResolverOptions): IdResolver;
}
