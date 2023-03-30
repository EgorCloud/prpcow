// Integrated Resolvers
import NoCompressionResolver from "./compressResolvers/noCompression.compressionResolver";
import WeakFunctionPool from "./functionResolvers/weakFunctionPool.functionResolver";
import DefaultModelResolver from "./modelResolvers/default.modelResolver";
import UuidIdResolver from "./idResolvers/uuid.idResolver";
import PureUuidIdResolver from "./idResolvers/pureUuid.idResolver";
import DefaultSessionStoreResolver from "./sessionStoreResolver/default.sessionStoreResolver";
// Utils
export * from "./utils/logger.util";
// Resolvers
export * from "./functionResolvers";
export * from "./modelResolvers";
export * from "./compressResolvers";
export * from "./idResolvers";
export * from "./sessionStoreResolver";

export const compressResolvers = {
    NoCompressionResolver,
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

export const sessionStoreResolvers = {
    DefaultSessionStoreResolver,
};

// Default export
export * from "./types";
export * from "./client";
export * from "./server";
