import { Buffer } from "buffer";
import { ModelResolver } from "./index";
import { FunctionResolver } from "../functionResolvers";
import { ModifiedWebSocket } from "../utils/websocketModifier.util";
import { LoggerOptions } from "../utils/logger.util";

export default class DefaultModelResolver extends ModelResolver {
    private primitiveValues: string[];

    private unsupportedTypes: string[];

    private ignoredTypesFromExtendedCopy: string[];

    private ignoredTypes: { null: null; undefined: undefined };

    private readonly genericTypes: {
        [key: string]: any;
    };

    private readonly overloadedTypes: {
        [key: string]: {
            deserialize?: (
                model: any,
                getFunction: FunctionResolver["setTheirs"]
            ) => any;
            serialize?: (
                model: any,
                getFunctionId: FunctionResolver["setOurs"]
            ) => string;
        };
    };

    private readonly typesModifier: {
        [key: string]: {
            serialize?: (
                model: any,
                getFunctionId: FunctionResolver["setOurs"]
            ) => any | void;
        };
    };

    static typeName() {
        return "DefaultModelResolver";
    }

    constructor(options: {
        session: ModifiedWebSocket;
        logger: LoggerOptions | boolean;
    }) {
        super(options);
        const primitiveBuilder =
            (Type: any, isClass: boolean = true) =>
            (value: any) => {
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
        this.unsupportedTypes = ["Promise", "SharedArrayBuffer"];
        this.ignoredTypesFromExtendedCopy = ["Function", "Object"];
        this.ignoredTypes = {
            null: null,
            undefined,
        };
        this.genericTypes = {
            Boolean: primitiveBuilder(Boolean),
            Number: primitiveBuilder(Number),
            String: primitiveBuilder(String),
            Symbol: primitiveBuilder(Symbol, false),
            BigInt: primitiveBuilder(BigInt, false),
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
                        model.on = (...params: any[]) => model.__on(...params);
                    }
                },
            },
            Function: {
                serialize: (model, getFunctionId) => ({
                    id: getFunctionId(model),
                }),
            },
            AsyncFunction: {
                serialize: (model, getFunctionId) => ({
                    id: getFunctionId(model),
                }),
            },
        };
    }

    serialize(affectedModel: any, getFunction: FunctionResolver["setOurs"]) {
        const model = affectedModel;
        const returnValue: {
            type?: string;
            value?: any;
            [x: string]: any;
        } = {};
        if (Object.values(this.ignoredTypes).indexOf(model) === -1) {
            returnValue.type = model.constructor?.name || "Object";

            if (this.unsupportedTypes.indexOf(returnValue.type) !== -1) {
                throw new Error(`Unsupported type: ${returnValue.type}`);
            }

            if (this.overloadedTypes[returnValue.type]?.serialize) {
                returnValue.value = this.overloadedTypes[
                    returnValue.type
                ].serialize(model, getFunction);
            } else if (this.primitiveValues.indexOf(returnValue.type) === -1) {
                returnValue.value = {};

                if (this.typesModifier[returnValue.type]) {
                    const result = this.typesModifier[
                        returnValue.type
                    ].serialize?.(model, getFunction);
                    if (result && typeof result === "object") {
                        Object.keys(result).forEach(
                            (key: string) => (returnValue[key] = result[key])
                        );
                    }
                }

                for (
                    let i = 0;
                    i < Object.getOwnPropertyNames(model).length;
                    i++
                ) {
                    const item = Object.getOwnPropertyNames(model)[i];
                    item !== "prototype" &&
                        (returnValue.value[item] = this.serialize(
                            model[item],
                            getFunction
                        ));
                }
                if (
                    [
                        ...Object.keys(this.genericTypes),
                        ...this.ignoredTypesFromExtendedCopy,
                    ].indexOf(returnValue.type) === -1
                ) {
                    for (
                        let i = 0;
                        i <
                        Object.getOwnPropertyNames(Object.getPrototypeOf(model))
                            .length;
                        i++
                    ) {
                        const item = Object.getOwnPropertyNames(
                            Object.getPrototypeOf(model)
                        )[i];
                        item !== "constructor" &&
                            (returnValue.value[item] = this.serialize(
                                model[item],
                                getFunction
                            ));
                    }
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

    async deserialize(
        model: { type?: string; value?: any },
        getFunction: FunctionResolver["setTheirs"]
    ) {
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

        let genericCreature: any;

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
        for (let i = 0; i < Object.keys(model.value).length; i++) {
            const item = Object.keys(model.value)[i];
            genericCreature[item] = await this.deserialize(
                model.value[item],
                getFunction
            );
        }
        return genericCreature;
    }
}
