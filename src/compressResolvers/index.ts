import Websocket from "isomorphic-ws";
import { BufferLike, ModifiedWebSocket } from "../utils/websocketModifier.util";
import { Logger, LoggerLevels } from "../utils/logger.util";

export abstract class CompressResolver {
    options: {
        session: ModifiedWebSocket;
        logger:
            | {
                  level?: LoggerLevels;
                  transports?: any;
                  parentLogger?: any;
              }
            | boolean;
    };

    private logger: Logger;

    constructor(options: {
        session: ModifiedWebSocket;
        logger:
            | {
                  level?: LoggerLevels;
                  transports?: any;
                  parentLogger?: any;
              }
            | boolean;
    }) {
        this.options = options;
        if (typeof this.options.logger !== "boolean") {
            this.logger = new Logger(
                `${Object.getPrototypeOf(
                    this
                ).constructor.typeName()} ${this.options.session.sessionId.slice(
                    -4
                )}`,
                this.options.logger.level,
                this.options.logger.transports,
                this.options.logger.parentLogger
            );
        } else {
            this.logger = new Logger(false, "info", []);
        }
    }

    static typeName(): string {
        throw new Error("typeName() implementation is required");
    }
    public abstract compress(messageEvent: BufferLike): Promise<BufferLike>;
    public abstract decompress(
        messageEvent: Websocket.MessageEvent
    ): Promise<object>;
}

export interface ICompressResolver {
    new (options: {
        session: ModifiedWebSocket;
        logger:
            | {
                  level?: LoggerLevels;
                  transports?: any;
                  parentLogger?: any;
              }
            | boolean;
    }): CompressResolver;
    typeName(): string;
}
