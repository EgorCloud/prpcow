/* eslint-disable no-param-reassign */
import WebSocket from "isomorphic-ws";
import resultAdapter from "./resultAdapter.util";

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

export type ModifiedWebSocket = Omit<WebSocket, "send"> & {
    send: (message: any, cb?: (err?: Error) => void) => Promise<BufferLike>;
    sendWithPrepare: (
        message: any,
        prepare?: (message: BufferLike) => Promise<BufferLike>,
        cb?: (err?: Error) => void
    ) => Promise<void>;
    sessionId: string;
};

export default function websocketModifier(
    websocket: WebSocket
): ModifiedWebSocket {
    // @ts-ignore
    websocket.__send = websocket.send;
    websocket.send = async function send(...params: any[]) {
        return this.__send(
            await resultAdapter(params[0]),
            {},
            ...params.slice(1)
        );
    }.bind(websocket);

    // @ts-ignore
    websocket.sendWithPrepare = async function send(...params: any[]) {
        return this.__send(
            await params[1](await resultAdapter(params[0])),
            {},
            ...params.slice(2)
        );
    }.bind(websocket);

    // @ts-ignore
    return websocket;
}
