import { v4 as uuidv4 } from "uuid";
import { IdResolver } from "./index";

export default class UuidIdResolver extends IdResolver {
    public static typeName(): string {
        return "UuidResolver";
    }

    public static isCompatibleWith(type: string): boolean {
        return [this.typeName(), "PureUuidResolver"].indexOf(type) !== -1;
    }

    // eslint-disable-next-line class-methods-use-this
    public async gen() {
        return uuidv4();
    }

    // eslint-disable-next-line class-methods-use-this
    close(): void {}
}
