const PRPC = require("../src/index");

const logger = (prefix) => ({
  error(...args) {
    console.error(`[${prefix}] ERROR:`, ...args);
  },
  warn(...args) {
    console.warn(`[${prefix}] WARN: `, ...args);
  },
  info(...args) {
    console.log(`[${prefix}] INFO: `, ...args);
  },
  verbose(...args) {
    console.log(`[${prefix}] VERBO:`, ...args);
  },
  debug(...args) {
    console.log(`[${prefix}] DEBUG:`, ...args);
  },
  silly(...args) {
    console.log(`[${prefix}] SILLY:`, ...args);
  },
});
const server = new PRPC().sever({
  ws: {
    port: 9090,
  },
  logger: {
    enabled: "silly",
    instance: logger("server"),
  },
});
server.on("newSession", (session) => {
  console.log("server session connected");
  session.oursModel = {
    name: "server",
    age: 18,
    createDate: () => {
      const uaq = new Date(0);
      console.log("ehre", uaq);
      return uaq;
    },
  };
});

const client = new PRPC().client(
  "ws://localhost:9090",
  [],
  {
    logger: {
      enabled: "silly",
      instance: logger("client"),
    },
  },
  (err, session) => {
    session.on("theirsModelChange", async (model) => {
      console.log("client session theirsModelChange", model);
      const a = await model.createDate();
      console.log("client session createDate", a);
    });
    console.log("client connected");
  }
);
