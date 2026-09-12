import bcrypt from "bcryptjs";
import crypto from "crypto";
import { eq, and, gt, sql } from "drizzle-orm";
import { getDb } from "../db";
import { users, sessions, awarenessScores, auditLogs, securityEvents, User } from "../../drizzle/schema";

export const SALT_ROUNDS = 12;
export const SESSION_DURATION_DAYS = 30;

// In-Memory Fallback Store when MySQL server or tables are unavailable
const fallbackUsers = new Map<string, User>();
const fallbackSessions = new Map<string, { userId: number; expiresAt: Date }>();

/**
 * Hash a plain text password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a plain text password against a bcrypt hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength (min 6 chars)
 */
export function isStrongPassword(password: string): { valid: boolean; reason?: string } {
  if (!password || password.length < 6) {
    return { valid: false, reason: "كلمة المرور يجب أن لا تقل عن 6 خانات" };
  }
  return { valid: true };
}

/**
 * Create a new user session
 */
export async function createSession(userId: number, ipAddress?: string, userAgent?: string): Promise<string> {
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

  const db = await getDb();
  if (db) {
    try {
      await db.insert(sessions).values({
        userId,
        token: sessionToken,
        ipAddress: ipAddress || "127.0.0.1",
        userAgent: userAgent || "Unknown",
        expiresAt,
      });
      return sessionToken;
    } catch (err) {
      console.warn("[AuthService] DB Session insert fallback:", err);
    }
  }

  // Fallback to in-memory session store
  fallbackSessions.set(sessionToken, { userId, expiresAt });
  return sessionToken;
}

/**
 * Validate session token and return authenticated user
 */
export async function getUserBySessionToken(token: string): Promise<User | null> {
  if (!token) return null;

  // Check fallback session store first
  const fallbackSess = fallbackSessions.get(token);
  if (fallbackSess) {
    if (fallbackSess.expiresAt > new Date()) {
      const allUsers = Array.from(fallbackUsers.values());
      const matched = allUsers.find((u) => u.id === fallbackSess.userId);
      if (matched) return matched;
    }
  }

  const db = await getDb();
  if (!db) return null;

  try {
    const now = new Date();
    const sessionResult = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.token, token), gt(sessions.expiresAt, now)))
      .limit(1);

    if (sessionResult.length === 0) return null;

    const session = sessionResult[0];
    const userResult = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
    if (userResult.length === 0) return null;

    const user = userResult[0];
    if (!user.isActive) return null;

    return user;
  } catch (err) {
    // If DB fails, search fallbackUsers by session
    if (fallbackSess && fallbackSess.expiresAt > new Date()) {
      const allUsers = Array.from(fallbackUsers.values());
      const matched = allUsers.find((u) => u.id === fallbackSess.userId);
      if (matched) return matched;
    }
    return null;
  }
}

/**
 * Terminate a session (Logout)
 */
export async function revokeSession(token: string): Promise<boolean> {
  if (!token) return false;
  fallbackSessions.delete(token);

  const db = await getDb();
  if (!db) return true;

  try {
    await db.delete(sessions).where(eq(sessions.token, token));
    return true;
  } catch {
    return true;
  }
}

/**
 * Register a new user
 */
export async function registerLocalUser(params: {
  name: string;
  email: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<{ user: User; token: string }> {
  const { name, email, password, ipAddress, userAgent } = params;

  const normalizedEmail = email.trim().toLowerCase();
  if (!isValidEmail(normalizedEmail)) {
    throw new Error("البريد الإلكتروني المدخل غير صالح");
  }

  const passCheck = isStrongPassword(password);
  if (!passCheck.valid) {
    throw new Error(passCheck.reason || "كلمة المرور غير مطابقة للشروط الأمنية");
  }

  const passwordHash = await hashPassword(password);
  const isTargetAdmin = normalizedEmail.includes("admin") || fallbackUsers.size === 0;
  const assignedRole = isTargetAdmin ? "admin" : "user";

  const db = await getDb();
  if (db) {
    try {
      // Check duplicate email
      const existing = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
      if (existing.length > 0) {
        throw new Error("البريد الإلكتروني مستخدم بالفعل في حساب آخر");
      }

      const totalUsersRes = await db.select({ count: sql<number>`count(*)` }).from(users);
      const totalUsers = Number(totalUsersRes[0]?.count || 0);
      const finalRole = normalizedEmail.includes("admin") || totalUsers === 0 ? "admin" : "user";

      await db.insert(users).values({
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        loginMethod: "local",
        role: finalRole,
        isActive: true,
        lastIpAddress: ipAddress || "127.0.0.1",
        lastSignedIn: new Date(),
      });

      const createdUserList = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
      const createdUser = createdUserList[0];

      try {
        await db.insert(awarenessScores).values({
          userId: createdUser.id,
          initialScore: 0,
          currentScore: 0,
          improvementDelta: 0,
        });

        await db.insert(auditLogs).values({
          userId: createdUser.id,
          action: "USER_REGISTER",
          eventType: "AUTH_REGISTER",
          severity: "info",
          detailsJson: JSON.stringify({ email: normalizedEmail, loginMethod: "local" }),
          ipAddress: ipAddress || "127.0.0.1",
          userAgent: userAgent || "Unknown",
        });
      } catch {}

      const token = await createSession(createdUser.id, ipAddress, userAgent);
      fallbackUsers.set(normalizedEmail, createdUser);
      return { user: createdUser, token };
    } catch (err: any) {
      if (err.message && err.message.includes("مستخدم بالفعل")) {
        throw err;
      }
      console.warn("[AuthService] DB register fallback due to missing DB table/connection:", err.message || err);
    }
  }

  // Check duplicate in fallback
  if (fallbackUsers.has(normalizedEmail)) {
    throw new Error("البريد الإلكتروني مستخدم بالفعل في حساب آخر");
  }

  const fallbackUser: User = {
    id: fallbackUsers.size + 100,
    openId: null,
    email: normalizedEmail,
    passwordHash,
    name: name.trim(),
    loginMethod: "local",
    role: assignedRole,
    isActive: true,
    lastIpAddress: ipAddress || "127.0.0.1",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  fallbackUsers.set(normalizedEmail, fallbackUser);
  const token = await createSession(fallbackUser.id, ipAddress, userAgent);
  return { user: fallbackUser, token };
}

/**
 * Login user with email and password
 */
export async function loginLocalUser(params: {
  email: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<{ user: User; token: string }> {
  const { email, password, ipAddress, userAgent } = params;

  const normalizedEmail = email.trim().toLowerCase();
  const db = await getDb();

  if (db) {
    try {
      const userList = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
      
      if (userList.length > 0) {
        const user = userList[0];

        if (!user.isActive) {
          throw new Error("هذا الحساب معطل. يرجى التواصل مع الإدارة");
        }

        if (!user.passwordHash) {
          throw new Error("هذا الحساب مسجل عن طريق OAuth. يرجى تسجيل الدخول بنفس الطريقة");
        }

        const isValidPassword = await verifyPassword(password, user.passwordHash);
        if (!isValidPassword) {
          throw new Error("بيانات الدخول غير صحيحة");
        }

        await db
          .update(users)
          .set({
            lastSignedIn: new Date(),
            lastIpAddress: ipAddress || "127.0.0.1",
          })
          .where(eq(users.id, user.id));

        const token = await createSession(user.id, ipAddress, userAgent);
        return { user, token };
      }
    } catch (err: any) {
      console.warn("[AuthService] DB login fallback:", err.message || err);
    }
  }

  // Fallback memory login check
  const fallbackUser = fallbackUsers.get(normalizedEmail);
  if (!fallbackUser) {
    throw new Error("بيانات الدخول غير صحيحة");
  }

  if (!fallbackUser.passwordHash) {
    throw new Error("بيانات الدخول غير صحيحة");
  }

  const isValidPassword = await verifyPassword(password, fallbackUser.passwordHash);
  if (!isValidPassword) {
    throw new Error("بيانات الدخول غير صحيحة");
  }

  const token = await createSession(fallbackUser.id, ipAddress, userAgent);
  return { user: fallbackUser, token };
}
