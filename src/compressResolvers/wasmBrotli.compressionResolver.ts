import WebSocket from "ws";
import * as brotli from "brotli-wasm";
import { Buffer } from "buffer";
import { CompressResolver } from "./index";
import { BufferLike } from "../utils/websocketModifier.util";

export default class WasmBrotliCompressionResolver extends CompressResolver {
    public static typeName(): string {
        return "WasmBrotli";
    }

    public static isCompatibleWith(type: string): boolean {
        return [this.typeName(), "PureBrotli"].indexOf(type) !== -1;
    }

    // eslint-disable-next-line class-methods-use-this
    public async compress(messageEvent: object): Promise<BufferLike> {
        return brotli.compress(Buffer.from(JSON.stringify(messageEvent)), {
            quality: 0,
        });
    }

    // eslint-disable-next-line class-methods-use-this
    public async decompress(
        messageEvent: WebSocket.MessageEvent
    ): Promise<object> {
        return JSON.parse(
            brotli.decompress(<Uint8Array>messageEvent.data).toString()
        );
    }
}
