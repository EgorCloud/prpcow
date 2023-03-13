import winston from "winston";
// @ts-ignore
import stream from "stream-browserify";
import util from "util";

export type LoggerLevels =
    | "error"
    | "warn"
    | "info"
    | "http"
    | "verbose"
    | "debug"
    | "silly";

const enumerateErrorFormat = winston.format((info) => {
    if (info.message instanceof Error) {
        // eslint-disable-next-line no-param-reassign
        info.message = {
            message: info.message.message,
            stack: info.message.stack,
            ...info.message,
        };
    }

    if (info instanceof Error) {
        return { message: info.message, stack: info.stack, ...info };
    }

    return info;
});

function consoleToLoggerMessage(params: any[] = []) {
    return params
        .map((item) => {
            if (item) {
                if (typeof item === "object")
                    return util.inspect(item, false, 3, true);
                return item;
            }
            return typeof item;
        })
        .join("  ");
}

const compatibilityLevels = {
    error: "error",
    warn: "warn",
    info: "log",
    http: "http",
    verbose: "log",
    debug: "log",
    silly: "log",
};

export function consoleTransports() {
    const generateLevelInput = (level: string, size = 15) =>
        `${Array.from({ length: size - level.length }, () => " ").join(
            ""
        )}${level}`;

    return [
        new winston.transports.Stream({
            stream: new stream.PassThrough(),
            eol: "",
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple(),
                winston.format.printf((data) => {
                    const clearDataLevel = data.level.replace(
                        // eslint-disable-next-line no-control-regex
                        /(\u001b\[\d+m)/g,
                        ""
                    );
                    // console.log(data);
                    const prpcLevel = (
                        data.__prpcAssignParam
                            ? Object.entries(data)
                                  .filter((item) =>
                                      item[0].includes(data.__prpcAssignParam)
                                  )
                                  .map((item) => [
                                      +item[0].replace(
                                          data.__prpcAssignParam,
                                          ""
                                      ),
                                      item[1],
                                  ])
                                  .sort((a, b) => a[0] - b[0])
                                  .map((item) => item[1])
                            : []
                    )
                        .map((item: string) => `[${item}]`)
                        .join(" ");
                    // @ts-ignore
                    console[compatibilityLevels[clearDataLevel]](
                        `[${data.timestamp}] ${generateLevelInput(
                            data.level
                        )} ${prpcLevel}: ${data.message}`
                    );

                    return null;
                })
            ),
        }),
    ];
}
export class Logger {
    logger: winston.Logger;

    static child(
        parentLogger: winston.Logger,
        name: string | boolean = false
    ): Logger {
        return new Logger(name, undefined, undefined, parentLogger);
    }

    constructor(
        name: string | boolean = false,
        level?: LoggerLevels,
        transports?: winston.transport[],
        parentLogger?: winston.Logger
    ) {
        if (parentLogger) {
            if (parentLogger.defaultMeta.__prpcAssignParam) {
                const paramLastIndex = Object.keys(
                    parentLogger.defaultMeta
                ).filter((item) =>
                    item.includes(parentLogger.defaultMeta.__prpcAssignParam)
                ).length;
                this.logger = parentLogger.child({});
                this.logger.defaultMeta = {
                    ...this.logger.defaultMeta,
                    [`${parentLogger.defaultMeta.__prpcAssignParam}${paramLastIndex}`]:
                        name,
                };
            } else {
                this.logger = parentLogger.child({
                    __prpcAssignParam: "prpcLevel",
                    prpcLevel0: name,
                });
            }
        } else {
            this.logger = winston.createLogger({
                defaultMeta: {
                    ...(name ? { name0: name } : {}),
                    __prpcAssignParam: "name",
                },
                level,
                format: winston.format.combine(
                    enumerateErrorFormat(),
                    winston.format.timestamp(),
                    winston.format.json()
                ),
                transports,
            });
        }
    }

    public error(...message: any[]) {
        this.logger.error(consoleToLoggerMessage(message));
    }

    public warn(...message: any[]) {
        this.logger.warn(consoleToLoggerMessage(message));
    }

    public info(...message: any[]) {
        this.logger.info(consoleToLoggerMessage(message));
    }

    public log(...message: any[]) {
        this.logger.info(consoleToLoggerMessage(message));
    }

    public req(...message: any[]) {
        this.logger.info(consoleToLoggerMessage(message));
    }

    public http(...message: any[]) {
        this.logger.info(consoleToLoggerMessage(message));
    }

    public verbose(...message: any[]) {
        this.logger.verbose(consoleToLoggerMessage(message));
    }

    public debug(...message: any[]) {
        this.logger.debug(consoleToLoggerMessage(message));
    }

    public silly(...message: any[]) {
        this.logger.silly(consoleToLoggerMessage(message));
    }
}
