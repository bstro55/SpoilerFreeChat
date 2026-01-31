/**
 * Database Service
 *
 * Provides a singleton Prisma client instance for database access.
 * This ensures we reuse the same connection pool across the application.
 *
 * Usage:
 *   const prisma = require('./database');
 *   const rooms = await prisma.room.findMany();
 */

const { PrismaClient } = require('@prisma/client');

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

// Graceful shutdown - close database connection when server stops
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

module.exports = prisma;
