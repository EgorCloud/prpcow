import WebSocket from "ws";
import { CompressResolver } from "./index";
import { BufferLike } from "../utils/websocketModifier.util";

export default class NoCompressionResolver extends CompressResolver {
    public static typeName(): string {
        return "NoCompression";
    }

    // eslint-disable-next-line class-methods-use-this
    public async compress(messageEvent: object): Promise<BufferLike> {
        return JSON.stringify(messageEvent);
    }

    // eslint-disable-next-line class-methods-use-this
    public async decompress(
        messageEvent: WebSocket.MessageEvent,
    ): Promise<object> {
        return JSON.parse(<string>messageEvent.data);
    }
}
