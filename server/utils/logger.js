import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';

const logDir = 'server/logs';

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(
    (info) => `[${info.timestamp}] [${info.level.toUpperCase()}] ${info.message}`
  )
);

const logger = winston.createLogger({
  level: 'info',
  format,
  transports: [
    // Combined log for all activity
    new winston.transports.DailyRotateFile({
      filename: path.join(logDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
    }),
    // Error log for only system errors
    new winston.transports.DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      level: 'error',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d',
    }),
    // Console log for development visibility
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(
          (info) => `[${info.timestamp}] [${info.level}] ${info.message}`
        )
      ),
    }),
  ],
});

export default logger;
