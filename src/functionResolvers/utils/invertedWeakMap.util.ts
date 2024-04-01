import { UniversalFinalizationRegistry } from "./UniversalFinalizationRegistry.util";

export default class InvertedWeakMap<
    K extends string | symbol = string,
    V extends object = object,
> extends Map<K, any> {
    private registry: UniversalFinalizationRegistry<K>;

    constructor(
        onFinalizeCallback?: (key: K) => void | any | Promise<void | any>,
    ) {
        super();

        this.registry = new UniversalFinalizationRegistry(async (key) => {
            this.delete(key);
            try {
                if (onFinalizeCallback) await onFinalizeCallback(key);
            } catch (e) {
                //     ignore
            }
        });
    }

    set(key: K, value: V) {
        this.registry.register(value, key);
        return super.set(key, new WeakRef(value));
    }

    async get(key: K): Promise<V | undefined> {
        return super.get(key)?.deref();
    }

    has(key: K) {
        return super.has(key);
    }

    async presented(key: K): Promise<boolean> {
        return super.has(key) && (await this.get(key)) !== undefined;
    }

    delete(key: K) {
        const ref = super.get(key);
        if (ref) {
            const deref = ref.deref();
            if (deref) this.registry.unregister(deref);

            return super.delete(key);
        }
        return false;
    }
}
