/* eslint-disable no-new */
const { expect, it, describe } = require("@jest/globals");
const stream = require("stream");
const {
    Client,
    Server,
    consoleLogTransport,
    modelResolvers: { DefaultModelResolver },
} = require("prpcow");
const WebSocket = require("ws");

describe("Base tests", () => {
    it("should create server", async () => {
        const server = new Server({
            ws: {
                port: 9090,
            },
            logger: { level: "silly", callback: consoleLogTransport },
        });
        expect(server).toBeDefined();
        await server.close();
    });
    it("should create server and client can connect", async () => {
        const server = new Server({
            ws: {
                port: 9091,
            },
            logger: {
                level: "silly",
                callback: consoleLogTransport,
            },
        });
        expect(server).toBeDefined();
        const client = await new Promise((resolve, reject) => {
            new Client(
                WebSocket,
                "ws://localhost:9091",
                [],
                {
                    logger: {
                        level: "silly",
                        callback: consoleLogTransport,
                    },
                },
                (err, session) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(session);
                    }
                },
            ).init();
        });
        expect(client).toBeDefined();
        await server.close();
    });
    it("should create server and client can connect and send message", async () => {
        const server = new Server({
            ws: {
                port: 9092,
            },
            logger: {
                level: "silly",
                callback: consoleLogTransport,
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
            new Client(
                WebSocket,
                "ws://localhost:9092",
                [],
                {
                    logger: {
                        level: "silly",
                        callback: consoleLogTransport,
                    },
                },
                (err, session) => {
                    if (err) {
                        reject(err);
                    } else {
                        session.on("theirsModelChange", async (model) => {
                            console.log(
                                "client session theirsModelChange",
                                model,
                            );
                            resolve(session);
                        });
                    }
                },
            ).init();
        });
        expect(client).toBeDefined();
        const result = await client.theirsModel.some.ping();
        expect(result).toEqual("pong");
        await server.close();
    });
    it("should create server and client can connect and use stream from server", async () => {
        const server = new Server({
            ws: {
                port: 9093,
            },
            logger: {
                level: "silly",
                callback: consoleLogTransport,
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
            new Client(
                WebSocket,
                "ws://localhost:9093",
                [],
                {
                    logger: {
                        level: "silly",
                        callback: consoleLogTransport,
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
                },
            ).init();
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
        await server.close();
    });
    it("should send client stream to the server", async () => {
        const jsonData = JSON.stringify({ success: true });
        const server = new Server({
            ws: {
                port: 9097,
            },
            logger: {
                level: "silly",
                callback: consoleLogTransport,
            },
        });
        expect(server).toBeDefined();
        server.on("newSession", (session) => {
            session.setOursModel({
                sendStream: async (clientStream) => {
                    console.log("[sendStream()]: Received stream");
                    expect(clientStream).toBeDefined();
                    const buffer = [];
                    clientStream.on("data", (chunk) => {
                        buffer.push(chunk);
                    });
                    await new Promise((resolve) => {
                        clientStream.on("end", () => {
                            resolve();
                        });
                    });
                    const data = Buffer.concat(buffer).toString("utf-8");
                    expect(data).toBe(jsonData);
                    return "ok";
                },
            });
        });
        const client = await new Promise((resolve, reject) => {
            // eslint-disable-next-line no-new
            new Client(
                WebSocket,
                "ws://localhost:9097",
                [],
                {
                    logger: {
                        level: "silly",
                        callback: consoleLogTransport,
                    },
                },
                (err, session) => {
                    if (err) {
                        reject(err);
                    } else {
                        session.on("theirsModelChange", async (model) => {
                            console.log(
                                "client session theirsModelChange",
                                model,
                            );
                            resolve(session);
                        });
                    }
                },
            ).init();
        });
        expect(client).toBeDefined();
        const passThrough = new stream.PassThrough();
        const chunks = 5;
        const chunkSize = Math.ceil(jsonData.length / chunks);
        const result = client.theirsModel.sendStream(passThrough);
        setTimeout(() => {
            for (let i = 0; i < chunks; i++) {
                passThrough.write(
                    jsonData.slice(i * chunkSize, (i + 1) * chunkSize),
                );
            }
            setTimeout(() => {
                passThrough.end();
            }, 100);
        }, 100);

        expect(await result).toBe("ok");
        await server.close();
    });
    it("should close connection by .close on server", async () => {
        const server = new Server({
            ws: {
                port: 9094,
            },
            logger: {
                level: "silly",
                callback: consoleLogTransport,
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
            new Client(
                WebSocket,
                "ws://localhost:9094",
                [],
                {
                    logger: {
                        level: "silly",
                        callback: consoleLogTransport,
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
                },
            ).init();
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
        const server = new Server({
            ws: {
                port: 9095,
            },
            logger: {
                level: "silly",
                callback: consoleLogTransport,
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
        let client = await new Promise((resolve, reject) => {
            new Client(
                WebSocket,
                "ws://localhost:9095",
                [],
                {
                    logger: {
                        level: "silly",
                        callback: consoleLogTransport,
                    },
                },
                (err, session) => {
                    if (err) {
                        reject(err);
                    } else {
                        session.once("theirsModelChange", async (model) => {
                            console.log(
                                "client session theirsModelChange",
                                model,
                            );
                            resolve(session);
                        });
                    }
                },
            ).init();
        });
        expect(client).toBeDefined();
        const newModelEvent = new Promise((resolve) => {
            client.once("theirsModelChange", async (model) => {
                console.log(
                    "client session theirsModelChange secondary",
                    model,
                );
                resolve(client);
            });
        });
        expect(
            Object.keys(
                (await server.sessionStoreResolver.get(sessionId))
                    .functionResolver.oursFunctions,
            ).length,
        ).toEqual(2);
        const result = await client.theirsModel.some.ping();

        expect(result).toEqual("pong");
        client = await newModelEvent;
        expect(client.theirsModel.otherPing).toBeTruthy();

        await new Promise((resolve) => {
            setTimeout(resolve, 100);
        });

        if (global.gc) {
            global.gc();
        } else {
            throw new Error("global.gc is Required for this test.");
        }
        client.functionResolver.findUnusedFunctions();
        await new Promise((resolve) => {
            setTimeout(resolve, 100);
        });
        client.functionResolver.findUnusedFunctions();
        await new Promise((resolve) => {
            setTimeout(resolve, 100);
        });

        expect(
            Object.keys(
                (await server.sessionStoreResolver.get(sessionId))
                    .functionResolver.oursFunctions,
            ).length,
        ).toEqual(1);
        await server.close();
    });
    it("should create server and client can connect and got an error when connection is lost", async () => {
        const server = new Server({
            ws: {
                port: 9096,
            },
            logger: {
                level: "silly",
                callback: consoleLogTransport,
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
            new Client(
                WebSocket,
                "ws://localhost:9096",
                [],
                {
                    logger: {
                        level: "silly",
                        callback: consoleLogTransport,
                    },
                },
                (err, session) => {
                    if (err) {
                        reject(err);
                    } else {
                        session.on("theirsModelChange", async (model) => {
                            console.log(
                                "client session theirsModelChange",
                                model,
                            );
                            resolve(session);
                        });
                    }
                },
            ).init();
        });
        let isGotError = false;
        expect(client).toBeDefined();
        try {
            await client.theirsModel.some.ping();
        } catch (e) {
            console.log("First error Got!!");
            isGotError = true;
        }
        expect(isGotError).toBeTruthy();

        let isGotSecondError = false;
        try {
            await client.theirsModel.some.ping();
        } catch (e) {
            console.log("Second error Got!!");
            isGotSecondError = true;
        }
        expect(isGotSecondError).toBeTruthy();
    });
    it("should create server and client can connect and send JSONLike message", async () => {
        const server = new Server({
            ws: {
                port: 9098,
            },
            logger: {
                level: "silly",
                callback: consoleLogTransport,
            },
        });
        server.on("newSession", (session) => {
            console.log("server session connected");
            session.setOursModel({
                name: "server",
                some: {
                    ping: async () =>
                        DefaultModelResolver.JSONLike({ coolData: "pong" }),
                },
            });
        });
        expect(server).toBeDefined();
        const client = await new Promise((resolve, reject) => {
            new Client(
                WebSocket,
                "ws://localhost:9098",
                [],
                {
                    logger: {
                        level: "silly",
                        callback: consoleLogTransport,
                    },
                },
                (err, session) => {
                    if (err) {
                        reject(err);
                    } else {
                        session.on("theirsModelChange", async (model) => {
                            console.log(
                                "client session theirsModelChange",
                                model,
                            );
                            resolve(session);
                        });
                    }
                },
            ).init();
        });
        expect(client).toBeDefined();
        const result = await client.theirsModel.some.ping();
        expect(result.coolData).toEqual("pong");
        await server.close();
    });

    it("should not catch class parameter change", async () => {
        const server = new Server({
            ws: {
                port: 9099,
            },
            logger: {
                level: "silly",
                callback: consoleLogTransport,
            },
        });
        class SomeClass {
            parameter = "initial value";

            constructor() {
                this.changeParameter = this.changeParameter.bind(this);
            }

            changeParameter(newValue) {
                console.log(this);
                console.log("changeParameter", newValue);
                this.parameter = newValue;
                return this.parameter;
            }
        }

        server.on("newSession", (session) => {
            console.log("server session connected");
            session.setOursModel({
                name: "server",
                some: {
                    greatClass: new SomeClass(),
                },
            });
        });
        expect(server).toBeDefined();
        const client = await new Promise((resolve, reject) => {
            new Client(
                WebSocket,
                "ws://localhost:9099",
                [],
                {
                    logger: {
                        level: "silly",
                        callback: consoleLogTransport,
                    },
                },
                (err, session) => {
                    if (err) {
                        reject(err);
                    } else {
                        session.on("theirsModelChange", async (model) => {
                            console.log(
                                "client session theirsModelChange",
                                model,
                            );
                            resolve(session);
                        });
                    }
                },
            ).init();
        });
        expect(client).toBeDefined();
        const result =
            await client.theirsModel.some.greatClass.changeParameter(
                "new value",
            );
        expect(client.theirsModel.some.greatClass.parameter).toEqual(
            "initial value",
        );
        expect(result).toEqual("new value");
        await server.close();
    });
});
