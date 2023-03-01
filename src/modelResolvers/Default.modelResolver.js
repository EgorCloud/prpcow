const ModelResolver = require("./index");

module.exports = class DefaultModelResolver extends ModelResolver {
    constructor() {
        super();
        this.primitiveBuilder =
            (Type, isClass = true) =>
            (value) => {
                if (isClass) {
                    return new Type(value).valueOf();
                }
                return Type(value).valueOf();
            };

        this.primitiveValues = [
            "Boolean",
            "Number",
            "String",
            "BigInt",
            "Symbol",
            "Buffer",
        ];
        this.unsupportedTypes = ["Promise"];
        this.ignoredTypesFromExtendedCopy = ["Function", "Object"];
        this.ignoredTypes = {
            null: null,
            undefined,
        };
        this.genericTypes = {
            Boolean: this.primitiveBuilder(Boolean),
            Number: this.primitiveBuilder(Number),
            String: this.primitiveBuilder(String),
            Symbol: this.primitiveBuilder(Symbol, false),
            BigInt: this.primitiveBuilder(BigInt, false),
            Array,
            RegExp,
            Error,
            EvalError,
            RangeError,
            ReferenceError,
            SyntaxError,
            TypeError,
            URIError,
            Math,
            Set,
            Map,
            WeakSet,
            WeakMap,
            Int8Array,
            Uint8Array,
            Uint8ClampedArray,
            Int16Array,
            Uint16Array,
            Int32Array,
            Uint32Array,
            Float32Array,
            Float64Array,
            ArrayBuffer,
            SharedArrayBuffer,
            DataView,
            Buffer: Buffer.from,
        };
        this.overloadedTypes = {
            Date: {
                serialize: (model) => model.toISOString(),
                deserialize: (model) => new Date(model.value),
            },
            Function: {
                deserialize: (model, getFunction) => getFunction(model.id),
            },
            AsyncFunction: {
                deserialize: (model, getFunction) => getFunction(model.id),
            },
        };
        this.typesModifier = {
            PassThrough: {
                serialize: (model) => {
                    if (!model.__on) {
                        // eslint-disable-next-line no-param-reassign
                        model.__on = model.on;
                        // eslint-disable-next-line no-param-reassign
                        model.on = (...params) => model.__on(...params);
                    }
                },
            },
            Function: {
                serialize: (model, getFunction) => ({ id: getFunction(model) }),
            },
            AsyncFunction: {
                serialize: (model, getFunction) => ({ id: getFunction(model) }),
            },
        };
    }

    serialize(affectedModel, getFunction) {
        const model = affectedModel;
        const returnValue = {};
        if (Object.values(this.ignoredTypes).indexOf(model) === -1) {
            returnValue.type = model.constructor?.name || "Object";

            if (this.unsupportedTypes.indexOf(returnValue.type) !== -1) {
                throw new Error(`Unsupported type: ${returnValue.type}`);
            }

            if (this.overloadedTypes[returnValue.type]?.serialize) {
                returnValue.value =
                    this.overloadedTypes[returnValue.type].serialize(model);
            } else if (this.primitiveValues.indexOf(returnValue.type) === -1) {
                returnValue.value = {};

                if (this.typesModifier[returnValue.type]) {
                    const result = this.typesModifier[
                        returnValue.type
                    ].serialize?.(model, getFunction);
                    if (result && typeof result === "object") {
                        Object.keys(result).forEach(
                            (key) => (returnValue[key] = result[key])
                        );
                    }
                }

                Object.getOwnPropertyNames(model).forEach(
                    (item) =>
                        item !== "prototype" &&
                        (returnValue.value[item] = this.serialize(
                            model[item],
                            getFunction
                        ))
                );
                if (
                    [
                        ...Object.keys(this.genericTypes),
                        ...this.ignoredTypesFromExtendedCopy,
                    ].indexOf(returnValue.type) === -1
                ) {
                    Object.getOwnPropertyNames(
                        Object.getPrototypeOf(model)
                    ).forEach(
                        (item) =>
                            item !== "constructor" &&
                            (returnValue.value[item] = this.serialize(
                                model[item],
                                getFunction
                            ))
                    );
                }
            } else {
                returnValue.value = model;
            }
        } else {
            returnValue.type = `${model}`;
            returnValue.value = model;
        }
        return returnValue;
    }

    deserialize(model, getFunction) {
        if (Object.keys(this.ignoredTypes).indexOf(model.type) !== -1) {
            return model.value;
        }

        if (this.overloadedTypes[model.type]?.deserialize) {
            return this.overloadedTypes[model.type].deserialize(
                model,
                getFunction
            );
        }

        if (this.primitiveValues.indexOf(model.type) !== -1) {
            return this.genericTypes[model.type](model.value);
        }

        let genericCreature;

        if (model.type === "Object") {
            genericCreature = {};
        } else if (Object.keys(this.genericTypes).indexOf(model.type) !== -1) {
            genericCreature = new this.genericTypes[model.type]();
        } else {
            const className = model.type
                .replace(/(^[0-9])/g, "_")
                .replace(/([^A-Za-z0-9_])/g, "_");
            // eslint-disable-next-line no-eval
            genericCreature = eval(`()=>{
                   class ${className} {}
                    return new ${className}
            }`)();
        }
        Object.keys(model.value).forEach((item) => {
            genericCreature[item] = this.deserialize(
                model.value[item],
                getFunction
            );
        });
        return genericCreature;
    }
};
