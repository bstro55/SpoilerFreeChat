/**
 * Logger Service
 *
 * Provides structured JSON logging using pino.
 * In development, logs are pretty-printed for readability.
 * In production, logs are JSON for easy parsing by log aggregation tools.
 *
 * Usage:
 *   const logger = require('./services/logger');
 *   logger.info({ roomId, nickname }, 'User joined room');
 *   logger.error({ err: error }, 'Database connection failed');
 */

const pino = require('pino');

// Configure pino based on environment
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',

  // Base properties included in every log
  base: {
    service: 'spoilerfreechat-backend',
    env: process.env.NODE_ENV || 'development',
  },

  // Use pretty printing in development for readability
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname,service,env',
      },
    },
  }),
});

module.exports = logger;
