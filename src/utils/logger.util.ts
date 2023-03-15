export type LoggerLevels =
    | "error"
    | "warn"
    | "info"
    | "http"
    | "verbose"
    | "debug"
    | "silly";

const compatibilityLevels = {
    error: "error",
    warn: "warn",
    info: "log",
    http: "http",
    verbose: "log",
    debug: "log",
    silly: "log",
};
export class Logger {
    logger: any;

    meta: any;

    static child(parentLogger: Logger, name: string | boolean = false): Logger {
        return new Logger(name, undefined, undefined, parentLogger);
    }

    constructor(
        name: string | boolean = false,
        level?: LoggerLevels,
        transports?: any[],
        parentLogger?: Logger
    ) {
        this.logger = console;
    }

    public error(...message: any[]) {
        this.logger.error(...message);
    }

    public warn(...message: any[]) {
        this.logger.warn(...message);
    }

    public info(...message: any[]) {
        this.logger.log(...message);
    }

    public log(...message: any[]) {
        this.logger.log(...message);
    }

    public req(...message: any[]) {
        this.logger.log(...message);
    }

    public http(...message: any[]) {
        this.logger.log(...message);
    }

    public verbose(...message: any[]) {
        this.logger.log(...message);
    }

    public debug(...message: any[]) {
        this.logger.log(...message);
    }

    public silly(...message: any[]) {
        this.logger.log(...message);
    }
}
