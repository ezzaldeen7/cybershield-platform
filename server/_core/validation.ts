/**
 * Input Validation System
 * =======================
 * Comprehensive input validation to prevent injection attacks
 */

import { securityLogger } from './logging';
import { z } from 'zod';

/**
 * Dangerous patterns to detect injection attempts
 */
const DANGEROUS_PATTERNS = {
  SQL_INJECTION: [
    /(\bunion\b|\bselect\b|\binsert\b|\bupdate\b|\bdelete\b|\bdrop\b|\bcreate\b|\balter\b)/i,
    /(-{2}|\/\*|\*\/|xp_|sp_)/,
    /(;|\||&&)/,
  ],
  XSS: [
    /<script[^>]*>[\s\S]*?<\/script>/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /javascript:/gi,
  ],
  COMMAND_INJECTION: [
    /[;&|`$()]/,
    /^[\s]*['"]?[\w\s]+['"]?\s*[|&;`]/,
  ],
};

export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: string, maxLength: number = 255): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Trim whitespace
  let sanitized = input.trim();

  // Enforce max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // Remove control characters
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

  return sanitized;
}

/**
 * Detect injection attempts
 */
export function detectInjectionAttempt(input: string, type: 'sql' | 'xss' | 'command'): boolean {
  const patterns = DANGEROUS_PATTERNS[
    type === 'sql' ? 'SQL_INJECTION' : type === 'xss' ? 'XSS' : 'COMMAND_INJECTION'
  ];

  for (const pattern of patterns) {
    if (pattern.test(input)) {
      return true;
    }
  }

  return false;
}

/**
 * Validate email
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const sanitized = sanitizeString(email, 255);

  if (!emailRegex.test(sanitized)) {
    return false;
  }

  if (detectInjectionAttempt(sanitized, 'sql')) {
    return false;
  }

  return true;
}

/**
 * Validate URL
 */
export function validateUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const sanitized = sanitizeString(url, 2048);

    // Block dangerous protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return false;
    }

    // Block localhost in production
    if (process.env.NODE_ENV === 'production') {
      if (['localhost', '127.0.0.1', '0.0.0.0'].includes(urlObj.hostname)) {
        return false;
      }
    }

    if (detectInjectionAttempt(sanitized, 'xss')) {
      return false;
    }

    if (detectInjectionAttempt(sanitized, 'command')) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Validate user input for SQL injection
 */
export function validateUserInput(input: string, fieldName: string, maxLength: number = 255): string {
  const sanitized = sanitizeString(input, maxLength);

  if (detectInjectionAttempt(sanitized, 'sql')) {
    securityLogger.logInjectionAttempt('SQL', input, 'unknown');
    throw new ValidationError(`SQL injection attempt detected in ${fieldName}`, fieldName, input);
  }

  if (detectInjectionAttempt(sanitized, 'xss')) {
    securityLogger.logInjectionAttempt('XSS', input, 'unknown');
    throw new ValidationError(`XSS attempt detected in ${fieldName}`, fieldName, input);
  }

  return sanitized;
}

/**
 * Validate password (client-side hint, real validation on server)
 */
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }

  if (password.length > 128) {
    errors.push('Password must be less than 128 characters');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain number');
  }

  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Password must contain special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Zod schemas for tRPC validation
 */
export const validationSchemas = {
  email: z
    .string()
    .email('Invalid email format')
    .max(255, 'Email too long')
    .transform(validateEmail)
    .refine(v => v, 'Invalid email'),

  url: z
    .string()
    .url('Invalid URL format')
    .max(2048, 'URL too long')
    .transform(validateUrl)
    .refine(v => v, 'Invalid URL'),

  username: z
    .string()
    .min(3, 'Username too short')
    .max(50, 'Username too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username contains invalid characters')
    .transform(v => sanitizeString(v, 50)),

  password: z
    .string()
    .min(8, 'Password too short')
    .max(128, 'Password too long'),

  message: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(1000, 'Message too long')
    .transform(v => sanitizeString(v, 1000)),

  searchQuery: z
    .string()
    .min(1, 'Search query cannot be empty')
    .max(256, 'Search query too long')
    .transform(v => sanitizeString(v, 256)),

  courseId: z
    .string()
    .uuid('Invalid course ID'),

  userId: z
    .string()
    .uuid('Invalid user ID'),
};

/**
 * Safe error message (no sensitive info)
 */
export function getSafeErrorMessage(error: unknown): string {
  if (error instanceof ValidationError) {
    return 'Invalid input provided';
  }

  if (error instanceof z.ZodError) {
    return 'Validation failed';
  }

  return 'An error occurred';
}
