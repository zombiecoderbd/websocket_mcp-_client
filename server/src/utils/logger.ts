import winston from 'winston';
import path from 'path';

export class Logger {
  private logger: winston.Logger;

  constructor() {
    // Create logs directory if it doesn't exist
    const logDir = path.join(process.cwd(), 'logs');
    
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'uas-typescript-server' },
      transports: [
        // Write all logs to console
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              let msg = `${timestamp} [${level}]: ${message}`;
              if (Object.keys(meta).length > 0) {
                msg += ` ${JSON.stringify(meta)}`;
              }
              return msg;
            })
          )
        }),
        
        // Write error logs to file
        new winston.transports.File({
          filename: path.join(logDir, 'error.log'),
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        }),
        
        // Write all logs to file
        new winston.transports.File({
          filename: path.join(logDir, 'combined.log'),
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        })
      ]
    });

    // Handle uncaught exceptions and unhandled rejections
    this.logger.exceptions.handle(
      new winston.transports.File({ filename: path.join(logDir, 'exceptions.log') })
    );

    this.logger.rejections.handle(
      new winston.transports.File({ filename: path.join(logDir, 'rejections.log') })
    );
  }

  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  error(message: string, meta?: any): void {
    this.logger.error(message, meta);
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  // HTTP request logging
  logRequest(method: string, url: string, statusCode: number, responseTime: number, userAgent?: string): void {
    this.info('HTTP Request', {
      method,
      url,
      statusCode,
      responseTime: `${responseTime}ms`,
      userAgent
    });
  }

  // API call logging
  logApiCall(endpoint: string, method: string, success: boolean, responseTime?: number, error?: string): void {
    const level = success ? 'info' : 'error';
    this.logger.log(level, 'API Call', {
      endpoint,
      method,
      success,
      responseTime: responseTime ? `${responseTime}ms` : undefined,
      error
    });
  }

  // Ollama service logging
  logOllamaCall(operation: string, model: string, success: boolean, responseTime?: number, error?: string): void {
    const level = success ? 'info' : 'error';
    this.logger.log(level, 'Ollama Call', {
      operation,
      model,
      success,
      responseTime: responseTime ? `${responseTime}ms` : undefined,
      error
    });
  }
}
