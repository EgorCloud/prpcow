const loggerLevels = ["error", "warn", "info", "verbose", "debug", "silly"];
module.exports = (loggerUserLevel, instance, prefix = false) => {
  const loggerLevel =
    loggerLevels.indexOf(loggerUserLevel) > -1
      ? +loggerLevels.indexOf(loggerUserLevel)
      : false;
  return {
    error: (...params) => {
      if (loggerLevel >= 0) {
        instance.error(...[...(prefix ? [`[${prefix}]`] : []), ...params]);
      }
    },
    warn: (...params) => {
      if (loggerLevel >= 1) {
        instance.warn(...[...(prefix ? [`[${prefix}]`] : []), ...params]);
      }
    },
    info: (...params) => {
      if (loggerLevel >= 2) {
        instance.info(...[...(prefix ? [`[${prefix}]`] : []), ...params]);
      }
    },
    verbose: (...params) => {
      if (loggerLevel >= 3) {
        instance.verbose(...[...(prefix ? [`[${prefix}]`] : []), ...params]);
      }
    },
    debug: (...params) => {
      if (loggerLevel >= 4) {
        instance.debug(...[...(prefix ? [`[${prefix}]`] : []), ...params]);
      }
    },
    silly: (...params) => {
      if (loggerLevel >= 5) {
        instance.silly(...[...(prefix ? [`[${prefix}]`] : []), ...params]);
      }
    },
  };
};
