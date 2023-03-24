import { MessageEvent } from "ws";
import brotli from "brotli";
import { Buffer } from "buffer";
import { BufferLike } from "../utils/websocketModifier.util";
import { CompressResolver } from "./index";

export default class PureBrotliCompressionResolver extends CompressResolver {
    public static typeName(): string {
        return "PureBrotli";
    }

    public static isCompatibleWith(type: string): boolean {
        return [this.typeName(), "WasmBrotli"].indexOf(type) !== -1;
    }

    // eslint-disable-next-line class-methods-use-this
    public async compress(messageEvent: object): Promise<BufferLike> {
        return brotli.compress(Buffer.from(JSON.stringify(messageEvent)), {
            quality: 0,
        });
    }

    // eslint-disable-next-line class-methods-use-this
    public async decompress(messageEvent: MessageEvent): Promise<object> {
        return JSON.parse(
            brotli.decompress(<Buffer>messageEvent.data).toString()
        );
    }
}
