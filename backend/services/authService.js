/**
 * Authentication Service
 *
 * Handles Supabase Auth token verification and user management.
 * Uses asymmetric JWT verification via Supabase's JWKS endpoint.
 *
 * Key concepts:
 * - JWKS (JSON Web Key Set): A public endpoint that provides the keys needed
 *   to verify JWT signatures. We fetch these keys to verify tokens locally.
 * - Asymmetric keys: Supabase signs tokens with a private key; we verify
 *   with the corresponding public key. More secure than shared secrets.
 */

const { createRemoteJWKSet, jwtVerify } = require('jose');
const prisma = require('./database');
const logger = require('./logger');

// Cache the JWKS fetcher (jose handles caching internally)
let jwks = null;

/**
 * Get the JWKS (JSON Web Key Set) for verifying tokens
 * This is cached automatically by the jose library
 */
function getJWKS() {
  if (!jwks) {
    const supabaseUrl = process.env.SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL environment variable is not set');
    }
    // The JWKS endpoint provides public keys for token verification
    const jwksUrl = new URL('/auth/v1/.well-known/jwks.json', supabaseUrl);
    jwks = createRemoteJWKSet(jwksUrl);
  }
  return jwks;
}

/**
 * Verify a Supabase access token and extract user info
 *
 * @param {string} token - The JWT access token from Supabase Auth
 * @returns {Promise<{id: string, email: string|null} | null>} User info or null if invalid
 *
 * How it works:
 * 1. Fetch public keys from Supabase's JWKS endpoint
 * 2. Verify the token's signature matches one of those keys
 * 3. Check the token hasn't expired
 * 4. Extract user info from the token payload
 */
async function verifyToken(token) {
  if (!token) {
    return null;
  }

  try {
    const jwks = getJWKS();

    // Verify the token signature and expiration
    // jwtVerify throws if the token is invalid or expired
    const { payload } = await jwtVerify(token, jwks, {
      // These are the expected values for Supabase tokens
      issuer: `${process.env.SUPABASE_URL}/auth/v1`,
      audience: 'authenticated',
    });

    // Extract user info from the token payload
    // 'sub' is the standard JWT claim for subject (user ID)
    return {
      id: payload.sub,
      email: payload.email || null,
    };
  } catch (error) {
    // Token is invalid, expired, or verification failed
    // This is normal for guests or expired sessions - not an error to log
    if (error.code === 'ERR_JWT_EXPIRED') {
      logger.debug('Auth: Token expired');
    } else if (error.code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED') {
      logger.debug('Auth: Invalid token signature');
    }
    // For other errors, log them for debugging
    else if (process.env.NODE_ENV === 'development') {
      logger.debug('Auth: Token verification failed:', error.code || error.message);
    }
    return null;
  }
}

/**
 * Get or create a user in our database from Supabase auth info
 *
 * This is called after token verification to ensure we have a local
 * user record with their preferences.
 *
 * @param {Object} supabaseUser - User info from verifyToken()
 * @param {string} supabaseUser.id - Supabase Auth UUID
 * @param {string|null} supabaseUser.email - User's email
 * @returns {Promise<Object>} The user record from our database
 */
async function getOrCreateUser(supabaseUser) {
  if (!supabaseUser || !supabaseUser.id) {
    return null;
  }

  // upsert = update if exists, insert if not
  // This handles both new users and returning users in one query
  const user = await prisma.user.upsert({
    where: { id: supabaseUser.id },
    update: {
      // Update email in case it changed (rare but possible)
      email: supabaseUser.email,
    },
    create: {
      id: supabaseUser.id,
      email: supabaseUser.email,
      // Preferences use defaults from schema
    },
  });

  return user;
}

/**
 * Verify token and get/create user in one step
 * Convenience function for socket connection handling
 *
 * @param {string} token - The JWT access token
 * @returns {Promise<Object|null>} User with preferences, or null if not authenticated
 */
async function authenticateToken(token) {
  const supabaseUser = await verifyToken(token);
  if (!supabaseUser) {
    return null;
  }
  return getOrCreateUser(supabaseUser);
}

module.exports = {
  verifyToken,
  getOrCreateUser,
  authenticateToken,
};
