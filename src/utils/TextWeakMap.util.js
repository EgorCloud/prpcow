module.exports = class TextWeakMap extends WeakMap {
    constructor(iterable) {
        super(iterable);
        this.textAdapter = new Map();
    }

    set(key, value) {
        let realKey = key;
        if (typeof key === "string") {
            // eslint-disable-next-line no-new-wrappers
            realKey = new String(value);
            this.textAdapter.set(key, realKey);
        }
        return super.set(realKey, value);
    }

    delete(key) {
        let realKey = key;
        if (typeof key === "string") {
            realKey = this.textAdapter.get(key);
            this.textAdapter.delete(key);
        }
        return super.delete(realKey);
    }

    get(key) {
        let realKey = key;
        if (typeof key === "string") {
            realKey = this.textAdapter.get(key);
        }
        return super.get(realKey);
    }

    has(key) {
        let realKey = key;
        if (typeof key === "string") {
            realKey = this.textAdapter.get(key);
            if (!realKey) return false;
        }
        return super.has(realKey);
    }

    getTextAdapter() {
        return this.textAdapter;
    }

    getTextAdapterKeys() {
        return Array.from(this.textAdapter.keys());
    }
};
