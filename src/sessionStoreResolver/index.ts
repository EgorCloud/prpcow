import { Logger, LoggerOptions } from "../utils/logger.util";
import UniversalRPC from "../universalRPC";
import { Resolver } from "../types";

export type SessionStoreResolverOptions = {
    logger: LoggerOptions | boolean;
};
export abstract class SessionStoreResolver extends Resolver {
    options: SessionStoreResolverOptions;

    protected logger: Logger;

    constructor(options: SessionStoreResolverOptions) {
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

    public abstract get(key: string): Promise<UniversalRPC | null>;
    public abstract getAll(): Promise<Record<string, UniversalRPC>>;
    public abstract set(key: string, value: UniversalRPC): Promise<void>;
    public abstract delete(key: string): Promise<void>;
    public abstract clear(): Promise<void>;
}

export interface ISessionStoreResolver {
    new (options: SessionStoreResolverOptions): SessionStoreResolver;
}
