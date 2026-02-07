/**
 * Message Queue Service
 *
 * This is the heart of SpoilerFreeChat's spoiler-prevention system.
 * It queues messages for each user based on their offset and delivers
 * them at the appropriate time.
 *
 * HOW IT WORKS:
 *
 * 1. When a message is sent, we calculate a delivery time for each recipient:
 *    deliverAt = now + recipientOffset
 *
 * 2. Messages are stored in per-user queues with their delivery timestamp.
 *
 * 3. A background interval (100ms) checks all queues and delivers any
 *    messages whose deliverAt time has passed.
 *
 * EXAMPLE:
 *   - User A is "live" (offset = 0)
 *   - User B is 30 seconds behind (offset = 30000ms)
 *   - User A sends a message at 10:00:00
 *
 *   For User A: deliverAt = 10:00:00 + 0 = immediate
 *   For User B: deliverAt = 10:00:00 + 30000ms = 10:00:30
 *
 *   User B won't see the message until 30 seconds later!
 *
 * DATA STRUCTURES:
 *
 * messageQueues: Map<socketId, Array<QueuedMessage>>
 * QueuedMessage: {
 *   message: { id, senderId, nickname, content, timestamp },
 *   deliverAt: number (timestamp when to deliver)
 * }
 */

const logger = require('./logger');

// Store queued messages per user (socketId -> array of queued messages)
const messageQueues = new Map();

// Reference to Socket.IO server (set via initialize)
let ioServer = null;

// Interval ID for the queue processor
let processorIntervalId = null;

// How often to check queues (in milliseconds)
const PROCESSOR_INTERVAL_MS = 100;

// Maximum messages to queue per user (prevents memory issues)
const MAX_QUEUE_SIZE_PER_USER = 100;

/**
 * Initialize the message queue service with the Socket.IO server instance.
 * This must be called once when the server starts.
 *
 * @param {Object} io - The Socket.IO server instance
 */
function initialize(io) {
  ioServer = io;
  startProcessor();
  logger.debug('[MessageQueue] Initialized with 100ms processor interval');
}

/**
 * Start the background processor that checks queues every 100ms.
 * Messages are delivered when their deliverAt time has passed.
 */
function startProcessor() {
  if (processorIntervalId) {
    return; // Already running
  }

  processorIntervalId = setInterval(() => {
    processQueues();
  }, PROCESSOR_INTERVAL_MS);
}

/**
 * Stop the background processor.
 * Called when shutting down the server.
 */
function stopProcessor() {
  if (processorIntervalId) {
    clearInterval(processorIntervalId);
    processorIntervalId = null;
    logger.debug('[MessageQueue] Processor stopped');
  }
}

/**
 * Process all queues and deliver ready messages.
 * This runs every 100ms.
 */
function processQueues() {
  const now = Date.now();

  for (const [socketId, queue] of messageQueues) {
    // Find all messages ready to deliver
    const readyMessages = [];
    const remainingMessages = [];

    for (const queuedMessage of queue) {
      if (queuedMessage.deliverAt <= now) {
        readyMessages.push(queuedMessage);
      } else {
        remainingMessages.push(queuedMessage);
      }
    }

    // Deliver ready messages
    for (const queuedMessage of readyMessages) {
      deliverMessage(socketId, queuedMessage.message);
    }

    // Update queue with remaining messages
    if (remainingMessages.length > 0) {
      messageQueues.set(socketId, remainingMessages);
    } else {
      messageQueues.delete(socketId);
    }
  }
}

/**
 * Deliver a message to a specific user via Socket.IO.
 *
 * @param {string} socketId - The recipient's socket ID
 * @param {Object} message - The message to deliver
 */
function deliverMessage(socketId, message) {
  if (!ioServer) {
    logger.error('[MessageQueue] Cannot deliver: Socket.IO not initialized');
    return;
  }

  // Emit to the specific socket
  ioServer.to(socketId).emit('new-message', message);
}

/**
 * Queue a message for a specific user.
 *
 * @param {string} socketId - The recipient's socket ID
 * @param {Object} message - The message object
 * @param {number} deliverAt - Timestamp when to deliver (Date.now() format)
 */
function queueMessage(socketId, message, deliverAt) {
  if (!messageQueues.has(socketId)) {
    messageQueues.set(socketId, []);
  }

  const queue = messageQueues.get(socketId);

  // Enforce max queue size to prevent memory issues
  if (queue.length >= MAX_QUEUE_SIZE_PER_USER) {
    console.warn(`[MessageQueue] Queue full for ${socketId}, dropping oldest message`);
    queue.shift(); // Remove oldest
  }

  // Add new message to queue
  queue.push({
    message,
    deliverAt
  });

  // Keep queue sorted by deliverAt (oldest first) for efficient processing
  queue.sort((a, b) => a.deliverAt - b.deliverAt);
}

/**
 * Deliver a message immediately to a specific user.
 * Used for offset=0 users and message senders.
 *
 * @param {string} socketId - The recipient's socket ID
 * @param {Object} message - The message object
 */
function deliverImmediately(socketId, message) {
  deliverMessage(socketId, message);
}

/**
 * Remove all queued messages for a user.
 * Called when a user disconnects.
 *
 * @param {string} socketId - The user's socket ID
 * @returns {number} Number of messages that were cleared
 */
function clearUserQueue(socketId) {
  const queue = messageQueues.get(socketId);
  const count = queue ? queue.length : 0;
  messageQueues.delete(socketId);
  return count;
}

/**
 * Get statistics about the message queue system.
 * Useful for debugging and monitoring.
 *
 * @returns {Object} Queue statistics
 */
function getStats() {
  let totalQueued = 0;
  const userCounts = [];

  for (const [socketId, queue] of messageQueues) {
    totalQueued += queue.length;
    userCounts.push({ socketId, count: queue.length });
  }

  return {
    usersWithQueues: messageQueues.size,
    totalQueuedMessages: totalQueued,
    userCounts,
    processorRunning: processorIntervalId !== null
  };
}

/**
 * Get the number of queued messages for a specific user.
 *
 * @param {string} socketId - The user's socket ID
 * @returns {number} Number of queued messages
 */
function getUserQueueSize(socketId) {
  const queue = messageQueues.get(socketId);
  return queue ? queue.length : 0;
}

module.exports = {
  initialize,
  stopProcessor,
  queueMessage,
  deliverImmediately,
  clearUserQueue,
  getStats,
  getUserQueueSize
};
