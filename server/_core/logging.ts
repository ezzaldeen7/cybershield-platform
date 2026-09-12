/**
 * Security Logging System
 * =======================
 * Logs all security-relevant events for audit trail
 */

import fs from 'fs';
import path from 'path';

export type LogLevel = 'INFO' | 'WARNING' | 'ERROR' | 'SECURITY';
export type EventType = 
  | 'AUTH_LOGIN'
  | 'AUTH_LOGOUT'
  | 'AUTH_FAILED'
  | 'AUTH_TOKEN_INVALID'
  | 'AUTHZ_DENIED'
  | 'DATA_ACCESS'
  | 'DATA_MODIFIED'
  | 'RATE_LIMIT_HIT'
  | 'INJECTION_ATTEMPT'
  | 'SUSPICIOUS_ACTIVITY'
  | 'ADMIN_ACTION';

export interface SecurityLog {
  timestamp: string;
  level: LogLevel;
  eventType: EventType;
  userId?: string;
  userEmail?: string;
  action: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

class SecurityLogger {
  private logDir = path.join(process.cwd(), 'logs');
  private auditLogFile = path.join(this.logDir, 'audit.log');
  private securityLogFile = path.join(this.logDir, 'security.log');

  constructor() {
    // Create logs directory if it doesn't exist
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private formatLog(log: SecurityLog): string {
    return JSON.stringify(log);
  }

  private writeLog(file: string, content: string): void {
    try {
      fs.appendFileSync(file, content + '\n', 'utf8');
    } catch (error) {
      console.error('Failed to write log:', error);
    }
  }

  // Authentication Events
  logLogin(userId: string, email: string, ipAddress: string, userAgent: string): void {
    const log: SecurityLog = {
      timestamp: new Date().toISOString(),
      level: 'SECURITY',
      eventType: 'AUTH_LOGIN',
      userId,
      userEmail: email,
      action: 'User logged in',
      ipAddress,
      userAgent,
      severity: 'MEDIUM',
    };
    this.writeLog(this.auditLogFile, this.formatLog(log));
  }

  logLogout(userId: string, email: string, ipAddress: string): void {
    const log: SecurityLog = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      eventType: 'AUTH_LOGOUT',
      userId,
      userEmail: email,
      action: 'User logged out',
      ipAddress,
      severity: 'LOW',
    };
    this.writeLog(this.auditLogFile, this.formatLog(log));
  }

  logFailedLogin(email: string, ipAddress: string, reason: string): void {
    const log: SecurityLog = {
      timestamp: new Date().toISOString(),
      level: 'SECURITY',
      eventType: 'AUTH_FAILED',
      userEmail: email,
      action: 'Failed login attempt',
      details: { reason },
      ipAddress,
      severity: 'HIGH',
    };
    this.writeLog(this.securityLogFile, this.formatLog(log));
  }

  logInvalidToken(ipAddress: string): void {
    const log: SecurityLog = {
      timestamp: new Date().toISOString(),
      level: 'SECURITY',
      eventType: 'AUTH_TOKEN_INVALID',
      action: 'Invalid authentication token',
      ipAddress,
      severity: 'HIGH',
    };
    this.writeLog(this.securityLogFile, this.formatLog(log));
  }

  // Authorization Events
  logAuthorizationDenied(userId: string, action: string, resource: string, ipAddress: string): void {
    const log: SecurityLog = {
      timestamp: new Date().toISOString(),
      level: 'SECURITY',
      eventType: 'AUTHZ_DENIED',
      userId,
      action: `Authorization denied for ${action}`,
      details: { resource },
      ipAddress,
      severity: 'HIGH',
    };
    this.writeLog(this.securityLogFile, this.formatLog(log));
  }

  // Data Access Events
  logDataAccess(userId: string, dataType: string, ipAddress: string): void {
    const log: SecurityLog = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      eventType: 'DATA_ACCESS',
      userId,
      action: `Accessed ${dataType}`,
      ipAddress,
      severity: 'LOW',
    };
    this.writeLog(this.auditLogFile, this.formatLog(log));
  }

  logDataModified(userId: string, dataType: string, changes: Record<string, unknown>, ipAddress: string): void {
    const log: SecurityLog = {
      timestamp: new Date().toISOString(),
      level: 'SECURITY',
      eventType: 'DATA_MODIFIED',
      userId,
      action: `Modified ${dataType}`,
      details: changes,
      ipAddress,
      severity: 'MEDIUM',
    };
    this.writeLog(this.auditLogFile, this.formatLog(log));
  }

  // Rate Limiting Events
  logRateLimitHit(ipAddress: string, endpoint: string, limit: number): void {
    const log: SecurityLog = {
      timestamp: new Date().toISOString(),
      level: 'SECURITY',
      eventType: 'RATE_LIMIT_HIT',
      action: `Rate limit exceeded on ${endpoint}`,
      details: { limit },
      ipAddress,
      severity: 'MEDIUM',
    };
    this.writeLog(this.securityLogFile, this.formatLog(log));
  }

  // Injection Attempt Events
  logInjectionAttempt(type: string, payload: string, ipAddress: string): void {
    const log: SecurityLog = {
      timestamp: new Date().toISOString(),
      level: 'SECURITY',
      eventType: 'INJECTION_ATTEMPT',
      action: `${type} injection attempt detected`,
      details: { 
        payloadPreview: payload.substring(0, 100),
        payloadLength: payload.length 
      },
      ipAddress,
      severity: 'CRITICAL',
    };
    this.writeLog(this.securityLogFile, this.formatLog(log));
  }

  // Suspicious Activity Events
  logSuspiciousActivity(userId: string, description: string, ipAddress: string): void {
    const log: SecurityLog = {
      timestamp: new Date().toISOString(),
      level: 'SECURITY',
      eventType: 'SUSPICIOUS_ACTIVITY',
      userId,
      action: description,
      ipAddress,
      severity: 'HIGH',
    };
    this.writeLog(this.securityLogFile, this.formatLog(log));
  }

  // Admin Events
  logAdminAction(adminId: string, action: string, targetId: string, details?: Record<string, unknown>, ipAddress?: string): void {
    const log: SecurityLog = {
      timestamp: new Date().toISOString(),
      level: 'SECURITY',
      eventType: 'ADMIN_ACTION',
      userId: adminId,
      action: `Admin: ${action}`,
      details: { targetId, ...details },
      ipAddress,
      severity: 'HIGH',
    };
    this.writeLog(this.auditLogFile, this.formatLog(log));
  }

  // Get audit logs (for admin dashboard)
  getAuditLogs(limit: number = 100, filter?: Record<string, string>): SecurityLog[] {
    try {
      const logs = fs.readFileSync(this.auditLogFile, 'utf8')
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line))
        .slice(-limit);

      if (filter) {
        return logs.filter(log => {
          return Object.entries(filter).every(([key, value]) => {
            return log[key as keyof SecurityLog] === value;
          });
        });
      }

      return logs;
    } catch (error) {
      console.error('Failed to read audit logs:', error);
      return [];
    }
  }

  getSecurityLogs(limit: number = 100): SecurityLog[] {
    try {
      return fs.readFileSync(this.securityLogFile, 'utf8')
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line))
        .slice(-limit);
    } catch (error) {
      console.error('Failed to read security logs:', error);
      return [];
    }
  }
}

export const securityLogger = new SecurityLogger();
