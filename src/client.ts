import semver from "semver";
import WebSocket from "ws";
import websocketModifier, {
    ModifiedWebSocket,
} from "./utils/websocketModifier.util";
import WeakFunctionPool from "./functionResolvers/weakFunctionPool.functionResolver";
import DefaultResolver from "./modelResolvers/Default.modelResolver";
import packageJson from "../package.json";
import typeAssert from "./utils/typeAssert.util";
import RuntimeError from "./utils/error.utils";
import UniversalRPC from "./universalRPC";
import badRequestUtil from "./utils/badRequest.util";
import { Logger, LoggerOptions } from "./utils/logger.util";
import NoCompressionResolver from "./compressResolvers/noCompression.compressionResolver";
import { ICompressResolver } from "./compressResolvers";
import { IFunctionResolver } from "./functionResolvers";
import { IModelResolver } from "./modelResolvers";

interface WebsocketProto {
    prototype: WebSocket;
    new (address: string | URL, protocols: String | String[]): WebSocket;
}

export type ClientOptions = {
    callback?: Function;
    universalRPC?: {
        FunctionResolver?: IFunctionResolver;
        ModelResolver?: IModelResolver;
        CompressResolver?: ICompressResolver;
    };
    logger?: LoggerOptions | boolean;
};

type ClientInnerOptions = ClientOptions & {
    callback: Function;
    universalRPC: {
        FunctionResolver: IFunctionResolver;
        ModelResolver: IModelResolver;
        CompressResolver: ICompressResolver;
    };
    version: string;
};

export class Client {
    private readonly WebsocketImplementation: WebsocketProto;

    private callback: Function;

    websocket: ModifiedWebSocket;

    private readonly logger: Logger;

    public key: string;

    private options: ClientInnerOptions;

    constructor(
        WebsocketImplementation: WebsocketProto,
        address: string | URL,
        protocols: String | String[],
        options: ClientOptions,
        callback: Function = () => {}
    ) {
        const finalOptions = options || {};
        this.options = {
            callback,
            ...finalOptions,
            universalRPC: {
                FunctionResolver: WeakFunctionPool,
                ModelResolver: DefaultResolver,
                CompressResolver: NoCompressionResolver,
                ...finalOptions.universalRPC,
            },
            version: packageJson.version,
        };
        this.WebsocketImplementation = WebsocketImplementation;
        this.callback = options.callback || callback;

        if (typeof this.options.logger !== "boolean") {
            this.logger = new Logger({
                ...this.options.logger,
                name: "Client",
            });
        } else {
            this.logger = new Logger();
        }

        this.websocket = websocketModifier(
            new this.WebsocketImplementation(address, [
                ...(Array.isArray(protocols) ? protocols : [protocols]),
                `prpc`,
            ])
        );
        this.logger.silly("Websocket created and modified");
        // @ts-ignore
        return this.init();
    }

    private init = () =>
        new Promise((resolve, reject) => {
            const initMessageOperator = (event: WebSocket.MessageEvent) => {
                this.logger.silly("Got message from server");
                try {
                    const clientRequest = JSON.parse(event.data as string);
                    this.logger.debug(
                        `Received message from server: ${JSON.stringify(
                            clientRequest
                        )}`
                    );
                    typeAssert(
                        clientRequest,
                        {
                            init: () => {
                                this.logger.silly("type is init");
                                this.key = clientRequest.data.key;
                                this.logger.debug(
                                    `Received key from server: ${this.key}`
                                );

                                if (
                                    !(
                                        semver.eq(
                                            this.options.version,
                                            clientRequest.data.version
                                        ) ||
                                        clientRequest.data.functionResolver ===
                                            this.options.universalRPC.FunctionResolver.typeName() ||
                                        clientRequest.data.modelResolver ===
                                            this.options.universalRPC.ModelResolver.typeName() ||
                                        clientRequest.data.CompressResolver ===
                                            this.options.universalRPC.CompressResolver.typeName()
                                    )
                                ) {
                                    this.logger.silly(
                                        `Server version or functionResolver or modelResolver or CompressResolver is not compatible with client version`
                                    );
                                    this.logger.debug(
                                        `Client version: ${this.options.version}, Server version: ${clientRequest.data.version}`,
                                        `Client functionResolver: ${this.options.universalRPC.FunctionResolver.typeName()}, Server functionResolver: ${
                                            clientRequest.data.functionResolver
                                        }`,
                                        `Client modelResolver: ${this.options.universalRPC.ModelResolver.typeName()}, Server modelResolver: ${
                                            clientRequest.data.modelResolver
                                        }`,
                                        `Client compressResolver: ${this.options.universalRPC.CompressResolver.typeName()}, Server compressResolver: ${
                                            clientRequest.data.CompressResolver
                                        }`
                                    );
                                    throw new RuntimeError(
                                        `server version or functionResolver or modelResolver or compressResolver is not compatible with client version. ${
                                            !semver.eq(
                                                this.options.version,
                                                clientRequest.data.version
                                            )
                                                ? ""
                                                : `Client version: ${this.options.version}, Server version: ${clientRequest.data.version}`
                                        } ${
                                            clientRequest.data
                                                .functionResolver !==
                                            this.options.universalRPC.FunctionResolver.typeName()
                                                ? ""
                                                : `Client functionResolver: ${this.options.universalRPC.FunctionResolver.typeName()}, Server functionResolver: ${
                                                      clientRequest.data
                                                          .functionResolver
                                                  }`
                                        } ${
                                            clientRequest.data.modelResolver !==
                                            this.options.universalRPC.ModelResolver.typeName()
                                                ? ""
                                                : `Client modelResolver: ${this.options.universalRPC.ModelResolver.typeName()}, Server modelResolver: ${
                                                      clientRequest.data
                                                          .modelResolver
                                                  }`
                                        } ${
                                            clientRequest.data
                                                .CompressResolver !==
                                            this.options.universalRPC.CompressResolver.typeName()
                                                ? ""
                                                : `Client compressResolver: ${this.options.universalRPC.CompressResolver.typeName()}, Server compressResolver: ${
                                                      clientRequest.data
                                                          .CompressResolver
                                                  }`
                                        }`,
                                        400,
                                        "Bad Request"
                                    );
                                }

                                this.logger.silly(
                                    `Server version, functionResolver, modelResolver and compressResolver is compatible with client version`
                                );

                                const initPayload = {
                                    version: this.options.version,
                                    functionResolver:
                                        this.options.universalRPC.FunctionResolver.typeName(),
                                    modelResolver:
                                        this.options.universalRPC.ModelResolver.typeName(),
                                    compressResolver:
                                        this.options.universalRPC.CompressResolver.typeName(),
                                    key: this.key,
                                };

                                this.logger.debug(
                                    `Sending init message to server with payload: ${JSON.stringify(
                                        initPayload
                                    )}`
                                );
                                this.websocket.send(
                                    JSON.stringify({
                                        type: "init",
                                        data: initPayload,
                                    })
                                );
                                this.logger.silly(
                                    `Init message sent to server`
                                );
                            },
                            ready: () => {
                                this.logger.silly(
                                    `Server ready message received`
                                );

                                // @ts-ignore
                                this.websocket.sessionId = this.key;

                                const universalSession = new UniversalRPC(
                                    this.websocket,
                                    {
                                        logger: {
                                            parentLogger: this.logger,
                                        },
                                        ...this.options.universalRPC,
                                    }
                                );

                                this.logger.silly(
                                    `UniversalRPC instance created`
                                );

                                this.websocket.removeEventListener(
                                    "message",
                                    initMessageOperator
                                );
                                this.logger.silly(
                                    `initMessageOperator removed`
                                );

                                this.options.callback(null, universalSession);
                                resolve(universalSession);

                                this.logger.silly(
                                    "callback (and Promise) resolved"
                                );
                                this.logger.info(`Ready to use`);
                            },
                        },
                        () => {
                            this.logger.silly(`Unknown message received`);
                            throw new RuntimeError(
                                `Could not understand request. "${
                                    clientRequest.type
                                        ? `Received type: ${clientRequest.type}`
                                        : "No type received"
                                }"`,
                                400,
                                "Bad request"
                            );
                        }
                    );
                } catch (e) {
                    this.logger.silly(`Error occurred`);
                    this.logger.error(e);
                    this.websocket.send(JSON.stringify(badRequestUtil(e)));
                    this.logger.silly(`Bad request sent to server`);
                    this.websocket.close();
                    this.logger.silly(`Websocket closed`);

                    if (!this.options.callback) {
                        reject(e);
                        this.logger.silly(`Promise rejected`);
                    } else {
                        this.options.callback(e, null);
                        resolve(e);
                        this.logger.silly(
                            `Promise resolved. callback rejected`
                        );
                    }
                }
            };
            this.websocket.addEventListener("message", initMessageOperator);
            this.logger.silly("Added initMessageOperator event listener");
        });
}
