/* eslint-disable no-restricted-globals */
module.exports = function whereami() {
    const isBrowser =
        // eslint-disable-next-line no-undef
        typeof window !== "undefined" && typeof window.document !== "undefined";

    const isNode =
        typeof process !== "undefined" &&
        process.versions != null &&
        process.versions.node != null;

    const isWebWorker =
        typeof self === "object" &&
        // eslint-disable-next-line no-undef
        self.constructor &&
        // eslint-disable-next-line no-undef
        self.constructor.name === "DedicatedWorkerGlobalScope";

    if (isWebWorker) return "webWorker";
    if (isBrowser) return "browser";
    if (isNode) return "node";
    return false;
};
