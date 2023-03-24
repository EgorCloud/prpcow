import UUID from "pure-uuid";
import { IdResolver } from "./index";

export default class PureUuidIdResolver extends IdResolver {
    public static typeName(): string {
        return "PureUuid";
    }

    public static isCompatibleWith(type: string): boolean {
        return [this.typeName(), "Uuid"].indexOf(type) !== -1;
    }

    // eslint-disable-next-line class-methods-use-this
    close(): void {}

    // eslint-disable-next-line class-methods-use-this
    public gen(): string {
        return new UUID(4).format();
    }
}
