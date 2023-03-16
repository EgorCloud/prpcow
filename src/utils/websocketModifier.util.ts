/* eslint-disable no-param-reassign */
import WebSocket from "ws";

export type BufferLike =
    | string
    | Buffer
    | DataView
    | number
    | ArrayBufferView
    | Uint8Array
    | ArrayBuffer
    | SharedArrayBuffer
    | ReadonlyArray<any>
    | ReadonlyArray<number>
    | { valueOf(): ArrayBuffer }
    | { valueOf(): SharedArrayBuffer }
    | { valueOf(): Uint8Array }
    | { valueOf(): ReadonlyArray<number> }
    | { valueOf(): string }
    | { [Symbol.toPrimitive](hint: string): string };

export type ModifiedWebSocket = WebSocket & {
    sessionId: string;
};

export default function websocketModifier(
    websocket: WebSocket
): ModifiedWebSocket {
    const modifiedWebsocket: ModifiedWebSocket =
        websocket as unknown as ModifiedWebSocket;
    modifiedWebsocket.sessionId = null;

    return modifiedWebsocket;
}
