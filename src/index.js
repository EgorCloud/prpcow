const Websocket = require("isomorphic-ws");
const RPCServer = require("./server");
const RPCClient = require("./client");
const WeakFunctionPool = require("./functionResolvers/weakFunctionPool.functionResolver");
const DefaultResolver = require("./modelResolvers/Default.modelResolver");

module.exports = class PRPC {
    /**
     * Create a `PRPC` instance
     * @param [WebsocketSource] define Websocket
     */
    constructor(WebsocketSource) {
        this.UsedWebsocket = WebsocketSource || Websocket;
        this.version = "1.0.0";
    }

    // noinspection JSValidateJSDoc
    /**
     * Create a `PRPC` server instance.
     *
     * @param {{}} options Configuration options
     * @param {String} [options.versionAcceptType=identical] version type (`identical`, `patch`, `minor`, `major`) that server will accept
     * @param {{}} options.ws Websocket configuration
     * @param {Number} [options.ws.backlog=511] The maximum length of the queue of pending connections
     * @param {Boolean} [options.ws.clientTracking=true] Specifies whether to track clients
     * @param {Function} [options.ws.handleProtocols] A hook to handle protocols
     * @param {String} [options.ws.host] The hostname where to bind the server
     * @param {Number} [options.ws.maxPayload=104857600] The maximum allowed message size
     * @param {Boolean} [options.ws.noServer=false] Enable no server mode
     * @param {String} [options.ws.path] Accept only connections matching this path
     * @param {(Boolean|{})} [options.ws.perMessageDeflate=false] Enable/disable permessage-deflate
     * @param {Number} [options.ws.port] The port where to bind the server
     * @param {(http.Server|https.Server)} [options.ws.server] A pre-created HTTP/S server to use
     * @param {Boolean} [options.ws.skipUTF8Validation=false] Specifies whether to skip UTF-8 validation for text and close messages
     * @param {Function} [options.ws.verifyClient] A hook to reject connections
     * @param {Function} [options.ws.WebSocket=WebSocket] Specifies the `WebSocket` class to use. It must be the `WebSocket` class or class that extends it
     * @param {{}} options.universalRPC  universalRPC configuration
     * @param {FunctionResolver} [options.universalRPC.FunctionResolver]=WeakFunctionPool type of function resolver
     * @param {ModelResolver} [options.universalRPC.ModelResolver]=DefaultResolver type of model resolver
     * @param {{}} [options.logger] Logger for any events
     * @param {String|Boolean} [options.logger.level]=false Logger Status (`false`, "error", "warn", "info", "verbose", "debug", "silly")
     * @param {Console} [options.logger.instance] Logger Instance
     * @return {RPCServer}
     */
    server(options) {
        return new RPCServer(
            new this.UsedWebsocket.WebSocketServer(options.ws),
            {
                versionAcceptType: "identical",
                ...options,
                universalRPC: {
                    FunctionResolver: WeakFunctionPool,
                    ModelResolver: DefaultResolver,
                    ...options.universalRPC,
                },
                version: this.version,
            }
        );
    }

    /**
     * Create a new `PRPC` client.
     *
     * @param {(String|URL)} address The URL to which to connect
     * @param {(String|String[])} [protocols] The subprotocols
     * @param {{}} [options] `PRPC` options
     * @param {String} [options.versionAcceptType]=identical version type (`identical`, `patch`, `minor`, `major`) that client will accept
     * @param {Function} [options.callback] emit callback, when connection is successful
     * @param {{}} options.universalRPC  universalRPC configuration
     * @param {FunctionResolver} [options.universalRPC.FunctionResolver]=WeakFunctionPool type of function resolver
     * @param {ModelResolver} [options.universalRPC.ModelResolver]=DefaultResolver type of model resolver
     * @param {{}} [options.logger] Logger for any events
     * @param {String|Boolean} [options.logger.level]=false Logger Status (`false`, "error", "warn", "info", "verbose", "debug", "silly")
     * @param {Console} [options.logger.instance] Logger Instance
     * @param {callback} callback emit callback, when connection is successful
     * @return {RPCClient}
     */
    client(address, protocols, options, callback = () => {}) {
        // eslint-disable-next-line no-param-reassign
        if (!protocols) protocols = [];
        // eslint-disable-next-line no-param-reassign
        if (!options) options = {};

        return new RPCClient(
            new this.UsedWebsocket.WebSocket(address, [...protocols, `prpc`]),
            {
                versionAcceptType: "identical",
                callback,
                ...options,
                universalRPC: {
                    FunctionResolver: WeakFunctionPool,
                    ModelResolver: DefaultResolver,
                    ...options.universalRPC,
                },
                version: this.version,
            }
        );
    }
};
