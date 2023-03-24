export type FunctionResolverFunction = (...args: any[]) => Promise<any>;

export abstract class Resolver {
    static typeName(): string {
        throw new Error("typeName() implementation is required");
    }

    static isCompatibleWith(type: string): boolean {
        return type === this.typeName();
    }
}

export interface IResolverStatic {
    typeName(): string;
    isCompatibleWith(type: string): boolean;
}
