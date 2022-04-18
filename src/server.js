const EventEmitter = require("events");
const md5 = require("md5");
const versionChecker = require("./utils/versionChecker.util");
const badRequestUtil = require("./utils/badRequest.util");
const RuntimeError = require("./utils/error.utils");
const resultAdapter = require("./utils/resultAdapter.util");
const UniversalRPC = require("./universalRPC");
const logger = require("./utils/loggerAppender.util");

module.exports = class RPCServer {
  constructor(websocketServer, options) {
    this.websocketInstance = websocketServer;
    this.options = options;
    this.logger = logger(
      this.options.logger.enabled,
      this.options.logger.instance
    );
    this.eventEmitter = new EventEmitter();
    this.websocketInstance.on("connection", (ws, request) => {
      this.logger.info(`New connection`);
      this.onConnection(ws, request);
    });
  }

  onConnection(websocket) {
    websocket.__send = websocket.send;
    websocket.send = async (message) =>
      websocket.__send(await resultAdapter(message));
    const send = (type, data) => websocket.send(JSON.stringify({ type, data }));
    this.logger.silly("Updated websocket.send");

    const key = md5(new Date().valueOf());

    this.logger.silly(`Generated key: ${key}`);

    send("init", {
      key,
      version: this.options.version,
      functionResolver: this.options.FunctionResolver.name,
    });

    this.logger.debug("Sent init status with message:", {
      key,
      version: this.options.version,
      functionResolver: this.options.FunctionResolver.name,
    });

    const initMessageOperator = (messageText) => {
      this.logger.debug("Received new message by init operator");

      try {
        const clientRequest = JSON.parse(messageText.data);

        this.logger.debug(
          "Received message with Client request message:",
          clientRequest
        );

        if (clientRequest.type === "init") {
          this.logger.silly("type is init");
          if (
            versionChecker(
              this.options.version,
              clientRequest.data.version,
              this.options.versionAcceptType
            )
          ) {
            this.logger.silly("version is ok");

            websocket.send(JSON.stringify({ type: "ready", data: { key } }));
            this.logger.silly("Sent ready message");

            this.logger.silly(`UniversalRPC instance created`);
            this.emitOnNewSession(new UniversalRPC(websocket, this.options));
            this.logger.silly("Emitted onNewSession");

            websocket.removeEventListener("message", initMessageOperator);
            this.logger.silly("Removed init message listener");
            this.logger.debug("Ready to receive messages");
          } else {
            this.logger.silly("version is not ok");
            websocket.send(
              badRequestUtil(
                new RuntimeError("Version mismatch", 400, "Bad Request")
              )
            );
            websocket.close();
            this.logger.debug(
              "Sent bad request due to version mismatch and closed connection"
            );
          }
        }
      } catch (e) {
        this.logger.error(e);
        websocket.send(badRequestUtil(e));
        websocket.close();
      }
    };

    websocket.addEventListener("message", initMessageOperator);
    this.logger.silly("Added init message listener");
  }

  /**
   * Adds the `listener` function to the end of the listeners array for the
   * event named `eventName`. No checks are made to see if the `listener` has
   * already been added. Multiple calls passing the same combination of `eventName`and `listener` will result in the `listener` being added, and called, multiple
   * times.
   *
   *
   * Returns a reference to the `EventEmitter`, so that calls can be chained.
   *
   * By default, event listeners are invoked in the order they are added. The`emitter.prependListener()` method can be used as an alternative to add the
   * event listener to the beginning of the listeners array.
   *
   * @param eventName The name of the event.
   * @param listener The callback function
   */
  on(eventName, listener) {
    return this.eventEmitter.on(eventName, listener);
  }

  /**
   * New Session Event
   *
   * @event RPCServer#newSession
   * @type {UniversalRPC}
   */
  emitOnNewSession(universalRPC) {
    this.eventEmitter.emit("newSession", universalRPC);
  }
};
