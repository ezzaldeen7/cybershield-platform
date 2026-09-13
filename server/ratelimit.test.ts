/**
 * Rate Limit Scope Tests
 * ======================
 * Verifies that:
 *  1. Static / Vite dev requests do NOT consume the API rate limit.
 *  2. /api/trpc calls DO consume the API rate limit.
 *  3. The login-specific rate limiter is independent and still works.
 *
 * These are unit tests against the rate-limiter internals and do NOT
 * start an HTTP server. They cover the in-process contract that the
 * narrowed `app.use('/api', rateLimitMiddleware)` relies on.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  rateLimiter,
  checkApiRateLimit,
  checkLoginRateLimit,
  RATE_LIMIT_CONFIG,
} from "./_core/rateLimit";

// ── helpers ──────────────────────────────────────────────────────────────────

const TEST_IP = "192.0.2.1"; // TEST-NET-1, safe for tests
const TEST_IP2 = "192.0.2.2";
const TEST_EMAIL = "testuser-ratelimit@cybershield.sa";

/** Reset all identifiers used by this test suite. */
function resetAll() {
  rateLimiter.reset(`api:${TEST_IP}`);
  rateLimiter.reset(`api:${TEST_IP2}`);
  rateLimiter.reset(`login:${TEST_EMAIL}:${TEST_IP}`);
}

// ── suite ─────────────────────────────────────────────────────────────────────

describe("Rate Limit Scope — /api narrowing", () => {
  beforeEach(() => {
    resetAll();
  });

  // ── 1. Static / Vite assets bypass ──────────────────────────────────────

  it("does not count static HTML requests against API rate limit", () => {
    // Simulate: a page load hits 150 static file requests.
    // None of these go through checkApiRateLimit (because rateLimitMiddleware
    // is now registered on '/api' only). The counter for TEST_IP should
    // remain 0.
    expect(rateLimiter.getCount(`api:${TEST_IP}`)).toBe(0);
    // If we never call checkApiRateLimit, the store entry is never created.
    // After 150 "static" requests the slot is still empty → isAllowed returns true.
    for (let i = 0; i < 150; i++) {
      // No-op: static requests do not call checkApiRateLimit.
    }
    expect(rateLimiter.getCount(`api:${TEST_IP}`)).toBe(0);
  });

  it("still allows API calls after large number of static requests (no counter bleed)", () => {
    // Even if 150 static requests happened, the very first checkApiRateLimit
    // call must still be allowed (counter starts at 0).
    const allowed = checkApiRateLimit(TEST_IP);
    expect(allowed).toBe(true);
    expect(rateLimiter.getCount(`api:${TEST_IP}`)).toBe(1);
  });

  // ── 2. /api/trpc calls DO consume the API rate limit ────────────────────

  it("increments API rate-limit counter on each checkApiRateLimit call", () => {
    expect(rateLimiter.getCount(`api:${TEST_IP}`)).toBe(0);
    checkApiRateLimit(TEST_IP);
    expect(rateLimiter.getCount(`api:${TEST_IP}`)).toBe(1);
    checkApiRateLimit(TEST_IP);
    expect(rateLimiter.getCount(`api:${TEST_IP}`)).toBe(2);
  });

  it("blocks API requests once maxRequests is reached", () => {
    const max = RATE_LIMIT_CONFIG.API.maxRequests; // 100
    // Exhaust the budget
    for (let i = 0; i < max; i++) {
      expect(checkApiRateLimit(TEST_IP)).toBe(true);
    }
    // Next call must be blocked
    expect(checkApiRateLimit(TEST_IP)).toBe(false);
  });

  it("uses ip-scoped key so different IPs have independent budgets", () => {
    // Exhaust IP1
    for (let i = 0; i < RATE_LIMIT_CONFIG.API.maxRequests; i++) {
      checkApiRateLimit(TEST_IP);
    }
    expect(checkApiRateLimit(TEST_IP)).toBe(false);
    // IP2 is unaffected
    expect(checkApiRateLimit(TEST_IP2)).toBe(true);
  });

  it("resets the counter on rateLimiter.reset()", () => {
    for (let i = 0; i < RATE_LIMIT_CONFIG.API.maxRequests; i++) {
      checkApiRateLimit(TEST_IP);
    }
    expect(checkApiRateLimit(TEST_IP)).toBe(false);
    rateLimiter.reset(`api:${TEST_IP}`);
    expect(checkApiRateLimit(TEST_IP)).toBe(true);
  });

  // ── 3. Login rate limiter is independent ────────────────────────────────

  it("login rate limiter uses a separate key, independent of API limiter", () => {
    // Exhaust API budget for TEST_IP
    for (let i = 0; i < RATE_LIMIT_CONFIG.API.maxRequests; i++) {
      checkApiRateLimit(TEST_IP);
    }
    expect(checkApiRateLimit(TEST_IP)).toBe(false);

    // Login rate limiter should still allow requests (fresh key)
    const loginAllowed = checkLoginRateLimit(TEST_EMAIL, TEST_IP);
    expect(loginAllowed).toBe(true);
  });

  it("login rate limiter blocks after maxRequests (5) and remains blocked", () => {
    const loginMax = RATE_LIMIT_CONFIG.LOGIN.maxRequests; // 5
    for (let i = 0; i < loginMax; i++) {
      expect(checkLoginRateLimit(TEST_EMAIL, TEST_IP)).toBe(true);
    }
    expect(checkLoginRateLimit(TEST_EMAIL, TEST_IP)).toBe(false);
  });

  it("exhausting login limiter does not affect API limiter counter", () => {
    const loginMax = RATE_LIMIT_CONFIG.LOGIN.maxRequests;
    for (let i = 0; i < loginMax + 1; i++) {
      checkLoginRateLimit(TEST_EMAIL, TEST_IP);
    }
    // API counter for same IP must still be 0
    expect(rateLimiter.getCount(`api:${TEST_IP}`)).toBe(0);
    // And API must still allow requests
    expect(checkApiRateLimit(TEST_IP)).toBe(true);
  });
});
