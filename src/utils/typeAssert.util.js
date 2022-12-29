/**
 * @param { { type:string, data: any, any } } data
 * @param { { any:function(data)|any } } typeObject
 * @param {function} noDefined
 */
module.exports = function typeAssert(data, typeObject, noDefined) {
    const keys = Object.keys(typeObject);
    if (data.type) {
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            if (data.type === key) {
                return typeObject[key](data);
            }
        }
        return noDefined(data);
    }
    return noDefined(data);
};
