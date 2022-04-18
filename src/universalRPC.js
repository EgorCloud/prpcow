const EventEmitter = require("events");
const badRequestUtil = require("./utils/badRequest.util");
const logger = require("./utils/loggerAppender.util");
const RuntimeError = require("./utils/error.utils");

module.exports = class UniversalRPC {
  constructor(session, options) {
    this.session = session;
    this.options = options;
    this.logger = logger(
      this.options.logger.enabled,
      this.options.logger.instance,
      "URPC"
    );
    this.eventEmitter = new EventEmitter();
    this._theirsModel = new Proxy(
      {},
      {
        get: (target, prop) => {
          const value = Reflect.get(target, prop);
          if (value) {
            return value;
          }
          throw new Error("Cannot get non-existed element");
        },
        set: () => {
          throw new Error("Cannot change values in TheirsModel");
        },
      }
    );
    this.modelResolver = new this.options.ModelResolver();
    this.functionResolver = new this.options.FunctionResolver({
      sendMessage: this.sendFunctionResolver.bind(this),
      deSerializeObject: this.modelResolver.deserialize.bind(
        this.modelResolver
      ),
      serializeObject: this.modelResolver.serialize.bind(this.modelResolver),
      logger: {
        enabled: this.options.logger.enabled,
        instance: this.logger,
      },
    });
    this.session.addEventListener("message", this.onMessage.bind(this));
    this.logger.silly("Session event listener added");
    this.session.addEventListener("close", this.onClose.bind(this));
    this.logger.info("UniversalRPC initialized");
  }

  async onMessage(messageText) {
    this.logger.debug(`Message received`, messageText.data);
    if (this.session.readyState === this.session.OPEN) {
      try {
        const clientRequest = JSON.parse(messageText.data);
        if (clientRequest.type === "upgradeModel") {
          this.logger.silly(`Upgrade model received`);
          this._theirsModel = Object.seal(
            this.modelResolver.deserialize(
              clientRequest.data,
              this.functionResolver.setTheirs.bind(this.functionResolver)
            )
          );
          this.logger.silly(`Model upgraded`, this._theirsModel);
          this.onUpgradeModel(this._theirsModel);
          this.logger.silly(`Event "theirsModelChange" emitted`);
        } else if (clientRequest.type === "functionResolver") {
          this.logger.silly(`"functionResolver" type received`);
          this.functionResolver.onmessage(clientRequest.data);
        } else if (clientRequest.type === "error") {
          const generatedError = new RuntimeError(
            clientRequest.error.message,
            clientRequest.error.status,
            clientRequest.error.name
          );
          this.logger.error(`Error received`, generatedError);
          this.onError(generatedError);
        } else {
          // noinspection ExceptionCaughtLocallyJS
          throw new Error("Unexpected Type");
        }
      } catch (e) {
        this.logger.error(e);
        this.session.send(badRequestUtil(e));
        this.onError(e);
        this.logger.silly(`Event "error" emitted`);
        this.session.close();
        this.logger.silly(`Session closed`);
        this.onClose();
        this.logger.silly(`Event "close" emitted`);
      }
    }
  }

  async sendUpgradeModel(model) {
    this.logger.debug("Sending upgrade model:", model);
    this.session.send({
      type: "upgradeModel",
      data: model,
    });
  }

  async sendFunctionResolver(data) {
    this.session.send({
      type: "functionResolver",
      data,
    });
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
    this.eventEmitter.on(eventName, listener);
  }

  /**
   * Theirs Model Upgrade
   *
   * @event UniversalRPC#onUpgradeModel
   * @type {Object}
   */
  onUpgradeModel(newModel) {
    this.eventEmitter.emit("theirsModelChange", newModel);
  }

  /**
   * Error Event
   *
   * @event UniversalRPC#onClose
   * @type {Object}
   */
  onError(e) {
    this.eventEmitter.emit("error", e);
    this.logger.debug("Error event emitted");
  }

  /**
   * Close event
   *
   * @event UniversalRPC#onClose
   * @type {Object}
   */
  onClose() {
    this.eventEmitter.emit("close");
    this.logger.debug("Close Event emitted");
  }

  set oursModel(newModel) {
    this.logger.silly("Fully Upgrade oursModel");

    this._oursModel = new Proxy(newModel, {
      set: (target, prop, value) => {
        this.logger.silly(`Upgrade ${prop} to ${value}`);
        Reflect.set(target, prop, value);
        this.sendUpgradeModel(
          this.modelResolver.serialize(
            this.oursModel,
            this.functionResolver.setOurs.bind(this.functionResolver)
          )
        );
        return true;
      },
    });
    this.logger.silly("Upgrade oursModel done");

    this.sendUpgradeModel(
      this.modelResolver.serialize(
        this.oursModel,
        this.functionResolver.setOurs.bind(this.functionResolver)
      )
    );
    this.logger.debug("Sent upgrade model");
  }

  get oursModel() {
    return this._oursModel || {};
  }

  get theirsModel() {
    return this._theirsModel;
  }
};
