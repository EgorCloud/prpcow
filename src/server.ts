import Websocket from "isomorphic-ws";
import { EventEmitter } from "events";
import { v4 as uuid } from "uuid";
import winston from "winston";
import semver from "semver";
import * as http from "http";
import WeakFunctionPool from "./functionResolvers/weakFunctionPool.functionResolver";
import DefaultResolver from "./modelResolvers/Default.modelResolver";
import packageJson from "../package.json";
import websocketModifier, {
    ModifiedWebSocket,
} from "./utils/websocketModifier.util";
import typeAssert from "./utils/typeAssert.util";
import RuntimeError from "./utils/error.utils";
import UniversalRPC from "./universalRPC";
import badRequestUtil from "./utils/badRequest.util";
import { Logger, LoggerLevels } from "./utils/logger.util";
import NoCompressionResolver from "./compressResolvers/noCompression.compressionResolver";
import { IFunctionResolver } from "./functionResolvers";
import { IModelResolver } from "./modelResolvers";
import { ICompressResolver } from "./compressResolvers";

export default class Server extends EventEmitter {
    websocket: Websocket.Server<Websocket.WebSocket>;

    private readonly logger: Logger;

    private readonly activeSessions: { [x: string]: UniversalRPC };

    private options: {
        logger?:
            | {
                  level: LoggerLevels;
                  transports: winston.transport[];
                  parentLogger: winston.Logger;
              }
            | boolean;
        universalRPC: {
            FunctionResolver: IFunctionResolver;
            ModelResolver: IModelResolver;
            CompressResolver: ICompressResolver;
        };
        ws: Websocket.ServerOptions;
        version: string;
    };

    constructor(options: {
        ws: Websocket.ServerOptions;
        universalRPC?: {
            FunctionResolver?: IFunctionResolver;
            ModelResolver?: IModelResolver;
            CompressResolver?: ICompressResolver;
        };
        logger?:
            | {
                  level: LoggerLevels;
                  transports: winston.transport[];
                  parentLogger: winston.Logger;
              }
            | boolean;
    }) {
        super();
        this.options = {
            ws: {},
            ...options,
            universalRPC: {
                FunctionResolver: WeakFunctionPool,
                ModelResolver: DefaultResolver,
                CompressResolver: NoCompressionResolver,
                ...options.universalRPC,
            },
            version: packageJson.version,
        };
        this.activeSessions = {};

        if (typeof this.options.logger !== "boolean") {
            this.logger = new Logger(
                "Server",
                this.options.logger.level,
                this.options.logger.transports,
                this.options.logger.parentLogger
            );
        } else {
            this.logger = new Logger(false, "info", []);
        }

        this.websocket = new Websocket.Server(options.ws);

        this.websocket.on("connection", (websocketInstance, request) => {
            this.logger.silly("New connection");
            const modifiedWebsocket = websocketModifier(websocketInstance);
            this.logger.silly("Modified websocket");
            const key = uuid();
            this.logger.silly(`Generated session key: ${key}`);
            modifiedWebsocket.sessionId = key;
            this.logger.debug(`New connection (${key}})`);

            this.onConnection(modifiedWebsocket, request);
        });
    }

    private onConnection(
        websocketInstance: ModifiedWebSocket,
        request?: http.IncomingMessage
    ) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/naming-convention
        const _request = request;
        const key = websocketInstance.sessionId;
        const keyPart = key.slice(-4);
        const requestLogger = Logger.child(this.logger.logger, `${keyPart}`);
        requestLogger.silly("onConnection event emitted");

        const initMessageOperator = (messageText: Websocket.MessageEvent) => {
            requestLogger.silly(`Received new message by init operator`);

            try {
                const clientRequest = JSON.parse(messageText.data as string);
                requestLogger.debug(
                    `Received init request with data:`,
                    clientRequest
                );

                typeAssert(
                    clientRequest,
                    {
                        init: () => {
                            requestLogger.silly(`type is init`);

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
                                requestLogger.silly(
                                    `Client version or functionResolver or modelResolver or CompressResolver is not compatible with server version`
                                );
                                requestLogger.debug(
                                    `Server version: ${this.options.version}, Client version: ${clientRequest.data.version}`,
                                    `Server functionResolver: ${this.options.universalRPC.FunctionResolver.typeName()}, Client functionResolver: ${
                                        clientRequest.data.functionResolver
                                    }`,
                                    `Server modelResolver: ${this.options.universalRPC.ModelResolver.typeName()}, Client modelResolver: ${
                                        clientRequest.data.modelResolver
                                    }`,
                                    `Server compressResolver: ${this.options.universalRPC.CompressResolver.typeName()}, Client compressResolver: ${
                                        clientRequest.data.CompressResolver
                                    }`
                                );
                                throw new RuntimeError(
                                    `Client version or functionResolver or modelResolver or compressResolver is not compatible with server version. ${
                                        !semver.eq(
                                            this.options.version,
                                            clientRequest.data.version
                                        )
                                            ? ""
                                            : `Server version: ${this.options.version}, Client version: ${clientRequest.data.version}`
                                    } ${
                                        clientRequest.data.functionResolver !==
                                        this.options.universalRPC.FunctionResolver.typeName()
                                            ? ""
                                            : `Server functionResolver: ${this.options.universalRPC.FunctionResolver.typeName()}, Client functionResolver: ${
                                                  clientRequest.data
                                                      .functionResolver
                                              }`
                                    } ${
                                        clientRequest.data.modelResolver !==
                                        this.options.universalRPC.ModelResolver.typeName()
                                            ? ""
                                            : `Server modelResolver: ${this.options.universalRPC.ModelResolver.typeName()}, Client modelResolver: ${
                                                  clientRequest.data
                                                      .modelResolver
                                              }`
                                    } ${
                                        clientRequest.data.CompressResolver !==
                                        this.options.universalRPC.CompressResolver.typeName()
                                            ? ""
                                            : `Server compressResolver: ${this.options.universalRPC.CompressResolver.typeName()}, Client compressResolver: ${
                                                  clientRequest.data
                                                      .CompressResolver
                                              }`
                                    }`,
                                    400,
                                    "Bad Request"
                                );
                            }

                            requestLogger.silly(
                                `Client version and functionResolver and modelResolver and compressResolver is compatible with server version`
                            );

                            const universalRPC = new UniversalRPC(
                                websocketInstance,
                                {
                                    logger: {
                                        parentLogger: requestLogger.logger,
                                    },
                                    ...this.options.universalRPC,
                                }
                            );
                            requestLogger.silly(
                                `UniversalRPC instance created`
                            );

                            websocketInstance.removeEventListener(
                                "message",
                                initMessageOperator
                            );
                            requestLogger.silly(
                                "Removed init message listener"
                            );

                            websocketInstance.on("pong", () => {
                                setTimeout(() => {
                                    websocketInstance.ping();
                                }, 500);
                            });
                            requestLogger.silly("Added pong listener");

                            websocketInstance.send({
                                type: "ready",
                                data: { key },
                            });

                            websocketInstance.ping();
                            requestLogger.silly("Initial Ping sent");

                            requestLogger.silly(`Sent ready message`);

                            this.newSession(universalRPC);
                            requestLogger.silly(`Emitted onNewSession`);

                            requestLogger.debug(`Ready to receive messages`);
                        },
                    },
                    () => {
                        requestLogger.silly(`Unknown message received`);
                        throw new RuntimeError(
                            "Could not understand request",
                            400,
                            "Bad request"
                        );
                    }
                );
            } catch (e) {
                requestLogger.error(e);

                websocketInstance.send(badRequestUtil(e));
                websocketInstance.close();
            }
        };

        websocketInstance.addEventListener("message", initMessageOperator);
        requestLogger.silly(`Added init message listener`);

        const initPayload = {
            key,
            version: this.options.version,
            functionResolver:
                this.options.universalRPC.FunctionResolver.typeName(),
            modelResolver: this.options.universalRPC.ModelResolver.typeName(),
            compressResolver:
                this.options.universalRPC.CompressResolver.typeName(),
        };
        websocketInstance.send({ type: "init", data: initPayload });
        requestLogger.debug(`Sent init status with message:`, initPayload);
    }

    private newSession(universalRPC: UniversalRPC) {
        universalRPC.addListener("close", () => {
            this.logger.debug(
                `UniversalRPC session closed (${universalRPC.sessionId}), removing session from active sessions`
            );
            Reflect.deleteProperty(this.activeSessions, universalRPC.sessionId);
        });
        this.activeSessions[universalRPC.sessionId] = universalRPC;
        this.logger.silly(
            `New UniversalRPC session set (${universalRPC.sessionId})`
        );

        this.emit("newSession", universalRPC);
        this.logger.silly(`New session event emitted`);
    }

    public async close(closeWebsocketServer = true) {
        await Promise.all(
            Object.values(this.activeSessions).map(async (universalRPC) =>
                universalRPC.closeRequest()
            )
        );

        if (closeWebsocketServer) {
            this.websocket.close();
            this.logger.debug("Closed websocket server");
        }
    }
}
