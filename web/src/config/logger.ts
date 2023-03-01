import { createLogger, format, transports } from "winston";
import { isDev } from "../utils/common";

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
      filename: "InfoLog",
      format: format.combine(
        format((info) => (info.level === "error" ? false : info))()
      ),
    })
  );
  logger.add(
    new transports.File({
      level: "error",
      filename: "ErrorLog"
    })
  );
}

export default logger;
