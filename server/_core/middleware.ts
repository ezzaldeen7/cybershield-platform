/**
 * Security Middleware
 * ===================
 * Implements security headers and request filtering
 */

import { Request, Response, NextFunction } from 'express';
import { securityLogger } from './logging';
import { checkApiRateLimit } from './rateLimit';

/**
 * Get client IP address
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

/**
 * Security Headers Middleware
 */
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction): void {
  // HSTS - Force HTTPS for 1 year
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // CSP - Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:"
  );

  // X-Frame-Options - Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // X-Content-Type-Options - Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Referrer-Policy - Control referrer information
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions-Policy (formerly Feature-Policy)
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // Remove X-Powered-By to reduce attack surface
  res.removeHeader('X-Powered-By');

  next();
}

/**
 * CORS Middleware
 */
export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const origin = req.headers.origin;
  
  // Whitelist allowed origins
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://yourdomain.com',
  ];

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
  }

  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
  } else {
    next();
  }
}

/**
 * Rate Limiting Middleware
 */
export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  const ip = getClientIp(req);
  
  if (!checkApiRateLimit(ip)) {
    res.status(429).json({
      error: 'Too many requests, please try again later',
      retryAfter: 60,
    });
    return;
  }

  next();
}

/**
 * Request Logging Middleware
 */
export function requestLoggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'unknown';

  // Log response
  const originalSend = res.send;
  res.send = function (data: unknown) {
    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
    return originalSend.call(this, data);
  };

  next();
}

/**
 * Injection Detection Middleware
 */
export function injectionDetectionMiddleware(req: Request, res: Response, next: NextFunction): void {
  const ip = getClientIp(req);

  // Check query parameters
  if (req.query) {
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string' && checkForInjection(value)) {
        securityLogger.logInjectionAttempt('Query', value, ip);
        res.status(400).json({ error: 'Invalid input detected' });
        return;
      }
    }
  }

  // Check body
  if (req.body && typeof req.body === 'object') {
    for (const [key, value] of Object.entries(req.body)) {
      if (typeof value === 'string' && checkForInjection(value)) {
        securityLogger.logInjectionAttempt('Body', value, ip);
        res.status(400).json({ error: 'Invalid input detected' });
        return;
      }
    }
  }

  next();
}

/**
 * Check for common injection patterns
 */
function checkForInjection(input: string): boolean {
  const patterns = [
    /(\bunion\b|\bselect\b|\binsert\b|\bupdate\b|\bdelete\b)/i,
    /<script/i,
    /on\w+\s*=/i,
    /javascript:/i,
  ];

  return patterns.some(pattern => pattern.test(input));
}

/**
 * Error Handling Middleware
 */
export function errorHandlingMiddleware(
  error: Error | any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const ip = getClientIp(req);

  console.error('Error:', error);
  securityLogger.logInjectionAttempt('Error', error.message || 'Unknown error', ip);

  // Don't expose internal error details
  res.status(500).json({
    error: 'An error occurred while processing your request',
  });
}

/**
 * CSRF Protection Middleware
 */
export function csrfProtectionMiddleware(req: Request, res: Response, next: NextFunction): void {
  // CSRF is handled by SameSite cookies and OAuth flow
  // This is just for documentation

  // Check if request method is safe
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
    return;
  }

  // For POST/PUT/DELETE, verify origin or CSRF token
  const origin = req.headers.origin || req.headers.referer;

  if (!origin) {
    res.status(403).json({ error: 'CSRF validation failed' });
    return;
  }

  next();
}

/**
 * Authentication Middleware
 */
export function requireAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user;

  if (!user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  next();
}

/**
 * Admin Middleware
 */
export function requireAdminMiddleware(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user;

  if (!user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (user.role !== 'admin') {
    const ip = getClientIp(req);
    securityLogger.logAuthorizationDenied(user.id, 'Admin Access', req.path, ip);
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  next();
}

/**
 * Helmet configuration
 * Note: Use real helmet package: npm install helmet
 */
export const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      fontSrc: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  frameguard: {
    action: 'deny',
  },
  noSniff: true,
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },
};
