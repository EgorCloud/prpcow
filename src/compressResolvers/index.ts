import WebSocket from "ws";
import { BufferLike, ModifiedWebSocket } from "../utils/websocketModifier.util";
import { Logger, LoggerOptions } from "../utils/logger.util";

export abstract class CompressResolver {
    options: {
        session: ModifiedWebSocket;
        logger: LoggerOptions | boolean;
    };

    private logger: Logger;

    constructor(options: {
        session: ModifiedWebSocket;
        logger: LoggerOptions | boolean;
    }) {
        this.options = options;
        if (typeof this.options.logger !== "boolean") {
            this.logger = new Logger({
                ...this.options.logger,
                name: `${Object.getPrototypeOf(
                    this
                ).constructor.typeName()} ${this.options.session.sessionId.slice(
                    -4
                )}`,
            });
        } else {
            this.logger = new Logger();
        }
    }

    static typeName(): string {
        throw new Error("typeName() implementation is required");
    }
    public abstract compress(messageEvent: object): Promise<BufferLike>;
    public abstract decompress(
        messageEvent: WebSocket.MessageEvent
    ): Promise<object>;
}

export interface ICompressResolver {
    new (options: {
        session: ModifiedWebSocket;
        logger: LoggerOptions | boolean;
    }): CompressResolver;
    typeName(): string;
}
