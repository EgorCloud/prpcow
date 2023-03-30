import { SessionStoreResolver, SessionStoreResolverOptions } from "./index";
import UniversalRPC from "../universalRPC";

export default class DefaultSessionStoreResolver extends SessionStoreResolver {
    private sessionStore: Record<string, UniversalRPC>;

    static typeName() {
        return "DefaultSessionStoreResolver";
    }

    constructor(options: SessionStoreResolverOptions) {
        super(options);
        this.sessionStore = {};
    }

    async clear() {
        this.sessionStore = {};
    }

    async delete(key: string) {
        Reflect.deleteProperty(this.sessionStore, key);
    }

    async get(key: string) {
        return Reflect.get(this.sessionStore, key);
    }

    async getAll() {
        return Object.freeze(this.sessionStore);
    }

    async set(key: string, value: UniversalRPC) {
        Reflect.set(this.sessionStore, key, value);
    }
}
