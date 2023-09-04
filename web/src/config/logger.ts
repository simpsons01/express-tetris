import { createLogger, format, transports } from "winston";

const logger = createLogger({
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
});

logger.add(
  new transports.Console({
    level: "info",
    format: format.combine(format.colorize(), format.simple()),
  })
);

export default logger;
