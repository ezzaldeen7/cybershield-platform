/**
 * Rate Limiting System
 * ====================
 * Protects against brute force, DoS, and abuse
 */

import { securityLogger } from './logging';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests in window
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class RateLimiter {
  private store: RateLimitStore = {};
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Clean old entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const key in this.store) {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
      }
    }
  }

  /**
   * Check if request should be allowed
   * @returns true if allowed, false if rate limited
   */
  isAllowed(identifier: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const key = identifier;

    if (!this.store[key]) {
      this.store[key] = {
        count: 1,
        resetTime: now + config.windowMs,
      };
      return true;
    }

    // Reset if window expired
    if (this.store[key].resetTime < now) {
      this.store[key] = {
        count: 1,
        resetTime: now + config.windowMs,
      };
      return true;
    }

    // Check if limit exceeded
    if (this.store[key].count >= config.maxRequests) {
      return false;
    }

    this.store[key].count++;
    return true;
  }

  /**
   * Get current count for identifier
   */
  getCount(identifier: string): number {
    return this.store[identifier]?.count ?? 0;
  }

  /**
   * Reset counter for identifier
   */
  reset(identifier: string): void {
    delete this.store[identifier];
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

export const rateLimiter = new RateLimiter();

// Rate limit configurations
export const RATE_LIMIT_CONFIG = {
  // Login attempts: 5 failed attempts per 15 minutes
  LOGIN: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
  } as RateLimitConfig,

  // API calls: 100 per hour
  API: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 100,
  } as RateLimitConfig,

  // Quiz attempts: 10 per minute
  QUIZ: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
  } as RateLimitConfig,

  // Analysis: 20 per 5 minutes
  ANALYSIS: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 20,
  } as RateLimitConfig,

  // Strict: 2 per minute (for sensitive operations)
  STRICT: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 2,
  } as RateLimitConfig,
} as const;

/**
 * Middleware for rate limiting
 */
export function createRateLimitMiddleware(config: RateLimitConfig) {
  return (ipAddress: string, userId?: string): boolean => {
    // Use userId if available (authenticated), otherwise use IP
    const identifier = userId || ipAddress;

    const allowed = rateLimiter.isAllowed(identifier, config);

    if (!allowed) {
      securityLogger.logRateLimitHit(
        ipAddress,
        'API',
        config.maxRequests
      );
    }

    return allowed;
  };
}

/**
 * Check login attempts
 */
export function checkLoginRateLimit(email: string, ipAddress: string): boolean {
  const identifier = `login:${email}:${ipAddress}`;
  const allowed = rateLimiter.isAllowed(identifier, RATE_LIMIT_CONFIG.LOGIN);

  if (!allowed) {
    securityLogger.logRateLimitHit(ipAddress, 'Login', RATE_LIMIT_CONFIG.LOGIN.maxRequests);
  }

  return allowed;
}

/**
 * Check API rate limit
 */
export function checkApiRateLimit(ipAddress: string, userId?: string): boolean {
  const identifier = userId ? `api:${userId}` : `api:${ipAddress}`;
  return rateLimiter.isAllowed(identifier, RATE_LIMIT_CONFIG.API);
}

/**
 * Check quiz submission rate limit
 */
export function checkQuizRateLimit(userId: string): boolean {
  const identifier = `quiz:${userId}`;
  return rateLimiter.isAllowed(identifier, RATE_LIMIT_CONFIG.QUIZ);
}

/**
 * Check analysis rate limit
 */
export function checkAnalysisRateLimit(userId: string | string, ipAddress: string): boolean {
  const identifier = userId ? `analysis:${userId}` : `analysis:${ipAddress}`;
  return rateLimiter.isAllowed(identifier, RATE_LIMIT_CONFIG.ANALYSIS);
}

/**
 * Strict rate limit for sensitive operations
 */
export function checkStrictRateLimit(userId: string): boolean {
  const identifier = `strict:${userId}`;
  return rateLimiter.isAllowed(identifier, RATE_LIMIT_CONFIG.STRICT);
}
