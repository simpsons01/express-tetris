import { createLogger, format, transports } from "winston";
import { isDev } from "../common/utils";
import os from "os"

const logger = createLogger({
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
});

if (isDev()) {
  logger.add(
    new transports.Console({
      level: "info",
      format: format.combine(format.colorize(), format.simple()),
    })
  );
} else {
  logger.add(
    new transports.File({
      level: "info",
      filename: `${os.homedir()}/server-log/InfoLog`,
      format: format.combine(
        format.colorize(), 
        format.simple(),
        format((info) => (info.level === "error" ? false : info))()
      ),
    })
  );
  logger.add(
    new transports.File({
      level: "error",
      format: format.combine(format.colorize(), format.simple()),
      filename: `${os.homedir()}/server-log/ErrorLog`
    })
  );
}

export default logger;
