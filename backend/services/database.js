/**
 * Database Service
 *
 * Provides a singleton Prisma client instance for database access.
 * Includes retry logic for handling transient connection errors.
 *
 * Usage:
 *   const { prisma, withRetry } = require('./database');
 *   const rooms = await prisma.room.findMany();
 *   // Or with retry for critical operations:
 *   const room = await withRetry(() => prisma.room.create({ data: {...} }));
 */

const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

// Create a single Prisma client instance
// In development, we store it on globalThis to prevent multiple instances
// during hot reloading (when the server restarts on file changes)
const globalForPrisma = globalThis;

const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['error', 'warn']  // Log errors and warnings in development
    : ['error']          // Only errors in production
});

// Store on global in development to prevent multiple instances
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Execute a database operation with retry logic
 * Handles transient connection errors (closed connections, timeouts)
 *
 * @param {Function} operation - Async function that performs the database operation
 * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
 * @param {number} delayMs - Delay between retries in ms (default: 100)
 * @returns {Promise} - Result of the operation
 */
async function withRetry(operation, maxRetries = 3, delayMs = 100) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Check if this is a retryable error (connection closed, timeout, etc.)
      const isRetryable =
        error.message?.includes('Closed') ||
        error.message?.includes('connection') ||
        error.message?.includes('timeout') ||
        error.code === 'P2024' || // Connection pool timeout
        error.code === 'P2025';   // Record not found (can happen during race conditions)

      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }

      // Wait before retrying (with exponential backoff)
      const delay = delayMs * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));

      // Log retry attempt
      logger.debug({ attempt: attempt + 1, maxRetries, delay }, 'Retrying database operation');
    }
  }

  throw lastError;
}

// Graceful shutdown - close database connection when server stops
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

// Handle SIGINT and SIGTERM for clean shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = prisma;
module.exports.prisma = prisma;
module.exports.withRetry = withRetry;
