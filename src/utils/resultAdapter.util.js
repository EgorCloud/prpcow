module.exports = async function resultAdapter(result) {
    if (result instanceof Error) throw result;
    if (typeof result === "object")
        try {
            return JSON.stringify(result);
        } catch (e) {
            return result;
        }
    if (typeof result === "function") return resultAdapter(await result());
    return result;
};
