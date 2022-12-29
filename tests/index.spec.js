const { expect, it, describe } = require("@jest/globals");
const stream = require("stream");
const PRPC = require("../src/index");

const logger = (prefix) => ({
    error(...args) {
        console.error(`[${prefix}]    ERROR:`, ...args);
    },
    warn(...args) {
        console.warn(`[${prefix}]    WARN: `, ...args);
    },
    info(...args) {
        console.log(`[${prefix}]    INFO:`, ...args);
    },
    verbose(...args) {
        console.log(`[${prefix}] VERBOSE:`, ...args);
    },
    debug(...args) {
        console.log(`[${prefix}] DEBUG:`, ...args);
    },
    silly(...args) {
        console.log(`[${prefix}] SILLY:`, ...args);
    },
});

describe("Base tests", () => {
    it("should create server", () => {
        const server = new PRPC().server({
            ws: {
                port: 9090,
            },
            logger: {
                level: "silly",
                instance: logger("server"),
            },
        });
        expect(server).toBeDefined();
    });
    it("should create server and client can connect", async () => {
        const server = new PRPC().server({
            ws: {
                port: 9091,
            },
            logger: {
                level: "silly",
                instance: logger("server"),
            },
        });
        expect(server).toBeDefined();
        const client = await new Promise((resolve, reject) => {
            new PRPC().client(
                "ws://localhost:9091",
                [],
                {
                    logger: {
                        level: "silly",
                        instance: logger("client"),
                    },
                },
                (err, session) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(session);
                    }
                }
            );
        });
        expect(client).toBeDefined();
    });
    it("should create server and client can connect and send message", async () => {
        const server = new PRPC().server({
            ws: {
                port: 9092,
            },
            logger: {
                level: "silly",
                instance: logger("server"),
            },
        });
        server.on("newSession", (session) => {
            console.log("server session connected");
            session.setOursModel({
                name: "server",
                some: {
                    ping: async () => "pong",
                },
            });
        });
        expect(server).toBeDefined();
        const client = await new Promise((resolve, reject) => {
            new PRPC().client(
                "ws://localhost:9092",
                [],
                {
                    logger: {
                        level: "silly",
                        instance: logger("client"),
                    },
                },
                (err, session) => {
                    if (err) {
                        reject(err);
                    } else {
                        session.on("theirsModelChange", async (model) => {
                            console.log(
                                "client session theirsModelChange",
                                model
                            );
                            resolve(session);
                        });
                    }
                }
            );
        });
        expect(client).toBeDefined();
        const result = await client.theirsModel.some.ping();
        expect(result).toEqual("pong");
    });
    it("should create server and client can connect and use stream", async () => {
        const server = new PRPC().server({
            ws: {
                port: 9093,
            },
            logger: {
                level: "silly",
                instance: logger("server"),
            },
        });
        server.on("newSession", (session) => {
            console.log("server session connected");
            session.setOursModel({
                name: "server",
                makeStream: async () => {
                    const createdStream = new stream.PassThrough();
                    setTimeout(() => {
                        createdStream.write("Hello");
                        setTimeout(() => {
                            createdStream.write(" ");
                            setTimeout(() => {
                                createdStream.write("World");
                                setTimeout(() => {
                                    createdStream.end();
                                }, 100);
                            }, 100);
                        }, 100);
                    }, 100);

                    return createdStream;
                },
            });
        });
        expect(server).toBeDefined();
        const client = await new Promise((resolve, reject) => {
            new PRPC().client(
                "ws://localhost:9093",
                [],
                {
                    logger: {
                        level: "silly",
                        instance: logger("client"),
                    },
                },
                (err, session) => {
                    if (err) {
                        reject(err);
                    } else {
                        session.on("theirsModelChange", async () => {
                            resolve(session);
                        });
                    }
                }
            );
        });
        expect(client).toBeDefined();

        const serverStream = await client.theirsModel.makeStream();
        const chunks = [];
        serverStream.on("data", async (data) => {
            chunks.push(data.toString("utf-8"));
        });

        const result = await new Promise((resolve) => {
            serverStream.on("end", () => {
                console.log("serverStream end", chunks);
                resolve(chunks.join(""));
            });
        });

        expect(result).toEqual("Hello World");
    });

    it("should close connection by .close on server", async () => {
        const server = new PRPC().server({
            ws: {
                port: 9094,
            },
            logger: {
                level: "silly",
                instance: logger("server"),
            },
        });
        server.on("newSession", (session) => {
            console.log("server session connected");
            session.setOursModel({
                name: "server",
                some: {
                    ping: async () => "pong",
                    makeServerClose: async () => {
                        setTimeout(() => {
                            server.close();
                        }, 0);
                        return "closed";
                    },
                },
            });
        });

        const client = await new Promise((resolve, reject) => {
            new PRPC().client(
                "ws://localhost:9094",
                [],
                {
                    logger: {
                        level: "silly",
                        instance: logger("client"),
                    },
                },
                (err, session) => {
                    if (err) {
                        reject(err);
                    } else {
                        session.on("theirsModelChange", async () => {
                            resolve(session);
                        });
                    }
                }
            );
        });
        let isClientGotClosed = false;
        client.on("closeRequest", async () => {
            isClientGotClosed = true;
        });

        const closePromise = new Promise((resolve) => {
            client.on("close", () => {
                resolve();
            });
        });

        expect(client).toBeDefined();
        expect(await client.theirsModel.some.ping()).toEqual("pong");
        const makeCloseResponse =
            await client.theirsModel.some.makeServerClose();

        expect(makeCloseResponse).toEqual("closed");
        await closePromise;

        expect(isClientGotClosed).toBeTruthy();
    });
    it("should send function removing after cleanup check", async () => {
        const server = new PRPC().server({
            ws: {
                port: 9095,
            },
            logger: {
                level: "silly",
                instance: logger("server"),
            },
        });
        let sessionId = null;
        server.on("newSession", (session) => {
            console.log("server session connected");
            sessionId = session.sessionId;
            session.setOursModel({
                name: "server",
                some: {
                    ping: async () => {
                        setTimeout(() => {
                            session.setOursModel({
                                otherPing: () => "otherPong",
                            });
                        }, 100);
                        return "pong";
                    },
                    test: () => "1",
                },
            });
        });
        expect(server).toBeDefined();
        const client = await new Promise((resolve, reject) => {
            new PRPC().client(
                "ws://localhost:9095",
                [],
                {
                    logger: {
                        level: "silly",
                        instance: logger("client"),
                    },
                },
                (err, session) => {
                    if (err) {
                        reject(err);
                    } else {
                        session.once("theirsModelChange", async (model) => {
                            console.log(
                                "client session theirsModelChange",
                                model
                            );
                            resolve(session);
                        });
                    }
                }
            );
        });
        expect(client).toBeDefined();
        const newModelEvent = new Promise((resolve) => {
            client.once("theirsModelChange", async (model) => {
                console.log("client session theirsModelChange", model);
                resolve(client);
            });
        });
        const result = await client.theirsModel.some.ping();
        expect(result).toEqual("pong");
        await newModelEvent;
        expect(client.theirsModel.otherPing).toBeTruthy();
        expect(
            Object.keys(
                server.activeSessions[sessionId].functionResolver.oursFunctions
            ).length
        ).toEqual(3);
        if (global.gc) {
            global.gc();
        } else {
            throw new Error("global.gc is Required for this test.");
        }
        client.functionResolver.findUnusedFunctions();
        await new Promise((resolve) => {
            setTimeout(resolve, 100);
        });
        expect(
            Object.keys(
                server.activeSessions[sessionId].functionResolver.oursFunctions
            ).length
        ).toEqual(2);
    });
    it("should create server and client can connect and got an error when connection is lost", async () => {
        const server = new PRPC().server({
            ws: {
                port: 9096,
            },
            logger: {
                level: "silly",
                instance: logger("server"),
            },
        });
        server.on("newSession", (session) => {
            console.log("server session connected");
            session.setOursModel({
                name: "server",
                some: {
                    ping: async () => {
                        setTimeout(() => session.session.close(4000), 100);
                        return new Promise(() => {});
                    },
                },
            });
        });
        expect(server).toBeDefined();
        const client = await new Promise((resolve, reject) => {
            new PRPC().client(
                "ws://localhost:9096",
                [],
                {
                    logger: {
                        level: "silly",
                        instance: logger("client"),
                    },
                },
                (err, session) => {
                    if (err) {
                        reject(err);
                    } else {
                        session.on("theirsModelChange", async (model) => {
                            console.log(
                                "client session theirsModelChange",
                                model
                            );
                            resolve(session);
                        });
                    }
                }
            );
        });
        let isGotError = false;
        expect(client).toBeDefined();
        try {
            await client.theirsModel.some.ping();
        } catch (e) {
            isGotError = true;
        }
        expect(isGotError).toBeTruthy();

        let isGotSecondError = false;
        try {
            await client.theirsModel.some.ping();
        } catch (e) {
            isGotSecondError = true;
        }
        expect(isGotSecondError).toBeTruthy();
    });
});
