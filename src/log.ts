import pino, { Logger } from 'pino';

/** -----------------------------------------------------------
 * Logger
 * ---------------------------------------------------------- */
export class LoggerFactory {
  static create(): Logger {
    return pino({
      transport: {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: true, hideObject: false },
      },
      level: process.env.LOG_LEVEL ?? 'info',
    });
  }
}
