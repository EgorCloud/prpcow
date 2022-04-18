/* eslint-disable quote-props,prettier/prettier */
const ModelResolver = require("./index");

module.exports = class DefaultModelResolver extends ModelResolver {
  constructor() {
    super();
    this.primitiveBuilder = (Type, isClass = true) => (value) => {
      if (isClass) {
        return new Type(value).valueOf();
      }
      return Type(value).valueOf();
    };
    this.genericCreatures = {
      "Boolean": this.primitiveBuilder(Boolean),
      "Number": this.primitiveBuilder(Number),
      "String": this.primitiveBuilder(String),
      "Symbol": this.primitiveBuilder(Symbol, false),
      "BigInt": this.primitiveBuilder(BigInt, false),
      "Array": Array,
      "RegExp": RegExp,
      "Error": Error,
      "EvalError": EvalError,
      "RangeError": RangeError,
      "ReferenceError": ReferenceError,
      "SyntaxError": SyntaxError,
      "TypeError": TypeError,
      "URIError": URIError,
      "Math": Math,
      "Set": Set,
      "Map": Map,
      "WeakSet": WeakSet,
      "WeakMap": WeakMap,
      "Int8Array": Int8Array,
      "Uint8Array": Uint8Array,
      "Uint8ClampedArray": Uint8ClampedArray,
      "Int16Array": Int16Array,
      "Uint16Array": Uint16Array,
      "Int32Array": Int32Array,
      "Uint32Array": Uint32Array,
      "Float32Array": Float32Array,
      "Float64Array": Float64Array,
      "ArrayBuffer": ArrayBuffer,
      "SharedArrayBuffer": SharedArrayBuffer,
      "DataView": DataView,
    };
    this.overloadedTypes = {
      "Date": {
        serialize: (model) => model.toISOString(),
        deserialize: (model) => new Date(model),
      },

    };
    this.unsupportedTypes = ["Promise"];
    this.primitiveValues = ["Boolean", "Number", "String", "BigInt", "Symbol"];
    this.baseIgnoredTypesFromExtendedCopy = ["Function", "Object"];
    this.valuesToIgnoreProcess = {
      "null": null,
      "undefined": undefined
    };
  }

  serialize(model, getFunction) {
    const returnValue = {};
    if (Object.values(this.valuesToIgnoreProcess).indexOf(model) === -1) {
      returnValue.type = model.constructor.name;

      if (this.unsupportedTypes.indexOf(returnValue.type) !== -1) {
        throw new Error(`Unsupported type: ${returnValue.type}`);
      }

      if (this.overloadedTypes[returnValue.type]) {
        returnValue.value = this.overloadedTypes[returnValue.type].serialize(model);
      } else if (this.primitiveValues.indexOf(returnValue.type) === -1) {
        returnValue.value = {};
        if (returnValue.type === "Function") {
          returnValue.id = getFunction(model);
        }
        Object.getOwnPropertyNames(model)
            .forEach((item) => item !== "prototype" && (returnValue.value[item] = this.serialize(model[item], getFunction)));
        if ([...Object.keys(this.genericCreatures), ...this.baseIgnoredTypesFromExtendedCopy].indexOf(returnValue.type) === -1) {
          Object.getOwnPropertyNames(Object.getPrototypeOf(model)).forEach((item) => item !== "constructor" && (returnValue.value[item] = this.serialize(model[item], getFunction)));
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
    if (Object.keys(this.valuesToIgnoreProcess).indexOf(model.type) !== -1) {
      return model.value;
    }

    if (this.overloadedTypes[model.type]) {
      return this.overloadedTypes[model.type].deserialize(model.value);
    }

    if (this.primitiveValues.indexOf(model.type) !== -1) {
      return this.genericCreatures[model.type](model.value);
    }

    if (model.type === "Function") {
      return getFunction(model.id);
    }

    let genericCreature;

    if (model.type === "Object") {
      genericCreature = {};
    } else if (Object.keys(this.genericCreatures).indexOf(model.type) !== -1) {
      genericCreature = new this.genericCreatures[model.type]();
    } else {
      const className = model.type.replace(/(^[0-9])/g, "_").replace(/([^A-Za-z0-9_])/g, "_");
      // eslint-disable-next-line no-eval
      genericCreature = eval(`()=>{
           class ${className} {}
            return new ${className}
        }`)();
    }
    Object.keys(model.value).forEach((item) => {
      genericCreature[item] = this.deserialize(model.value[item], getFunction);
    });
    return genericCreature;
  }
};
