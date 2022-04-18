const Websocket = require("ws");
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
    this.version = process.env.NODE_CURRENT_VERSION || "1.0.0";
  }

  /**
   * Create a `PRPC` server instance.
   *
   * @param {Object} options Configuration options
   * @param {Object} options.ws Websocket configuration
   * @param {Object} options.server  PRPC server configuration
   * @param {String} [options.versionAcceptType]=identical version type (`identical`, `patch`, `minor`, `major`) that server will accept
   * @param {FunctionResolver} [options.functionResolver]=WeakFunctionPool type of function resolver
   * @param {Object} [options.logger] Logger for any events
   * @param {String|Boolean} [options.logger.level]=false Logger Status (`false`, "error", "warn", "info", "verbose", "debug", "silly")
   * @param {Console} [options.logger.instance] Logger Instance
   * @param {ModelResolver} [options.ModelResolver]=DefaultResolver type of model resolver
   * @param {Number} [options.ws.backlog=511] The maximum length of the queue of
   *     pending connections
   * @param {Boolean} [options.ws.clientTracking=true] Specifies whether or not to
   *     track clients
   * @param {Function} [options.ws.handleProtocols] A hook to handle protocols
   * @param {String} [options.ws.host] The hostname where to bind the server
   * @param {Number} [options.ws.maxPayload=104857600] The maximum allowed message
   *     size
   * @param {String} [options.ws.path] Accept only connections matching this path
   * @param {(Boolean|Object)} [options.ws.perMessageDeflate=false] Enable/disable
   *     permessage-deflate
   * @param {Number} [options.ws.port] The port where to bind the server
   * @param {(http.Server|https.Server)} [options.ws.server] A pre-created HTTP/S
   *     server to use
   * @param {Boolean} [options.ws.skipUTF8Validation=false] Specifies whether or
   *     not to skip UTF-8 validation for text and close messages
   * @return {RPCServer}
   */
  sever(options) {
    return new RPCServer(new this.UsedWebsocket.WebSocketServer(options.ws), {
      versionAcceptType: "identical",
      FunctionResolver: WeakFunctionPool,
      ModelResolver: DefaultResolver,
      ...options,
      version: this.version,
    });
  }

  /**
   * Create a new `PRPC` client.
   *
   * @param {(String|URL)} address The URL to which to connect
   * @param {(String|String[])} [protocols] The subprotocols
   * @param {Object} [options] `PRPC` options
   * @param {callback} callback emit callback, when connection successful
   * @param {String} [options.versionAcceptType]=identical version type (`identical`, `patch`, `minor`, `major`) that client will accept
   * @param {FunctionResolver} [options.functionResolver]=WeakFunctionPool type of function resolver
   * @param {ModelResolver} [options.ModelResolver]=DefaultResolver type of model resolver
   * @param {Object} [options.logger] Logger for any events
   * @param {String|Boolean} [options.logger.level]=false Logger Status (`false`, "error", "warn", "info", "verbose", "debug", "silly")
   * @param {Console} [options.logger.instance] Logger Instance
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
        FunctionResolver: WeakFunctionPool,
        ModelResolver: DefaultResolver,
        ...options,
        address,
        protocols,
        callback,
        version: this.version,
      }
    );
  }
};
