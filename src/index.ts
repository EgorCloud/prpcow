// Integrated Resolvers
import NoCompressionResolver from "./compressResolvers/noCompression.compressionResolver";
import WeakFunctionPool from "./functionResolvers/weakFunctionPool.functionResolver";
import DefaultModelResolver from "./modelResolvers/Default.modelResolver";
import PureBrotliCompressionResolver from "./compressResolvers/pureBrotli.compressionResolver";
import WasmBrotliCompressionResolver from "./compressResolvers/wasmBrotli.compressionResolver";
import UuidIdResolver from "./idResolvers/uuid.idResolver";
import PureUuidIdResolver from "./idResolvers/pureUuid.idResolver";
// Utils
export * from "./utils/logger.util";
// Resolvers
export * from "./functionResolvers";
export * from "./modelResolvers";
export * from "./compressResolvers";
export * from "./idResolvers";
// export * from "./sessionStoreResolver";

export const compressResolvers = {
    NoCompressionResolver,
    PureBrotliCompressionResolver,
    WasmBrotliCompressionResolver,
};

export const functionResolvers = {
    WeakFunctionPool,
};

export const modelResolvers = {
    DefaultModelResolver,
};

export const idResolvers = {
    UuidIdResolver,
    PureUuidIdResolver,
};

// Default export
export * from "./types";
export * from "./client";
export * from "./server";
