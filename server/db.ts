import { eq } from "drizzle-orm";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { InsertUser, users } from "../drizzle/schema";
import * as schema from "../drizzle/schema";
import { ENV } from "./_core/env";
import fs from "fs";
import path from "path";

let _sqlite: Database.Database | null = null;
let _db: BetterSQLite3Database<typeof schema> | null = null;

/**
 * Returns the SQLite Drizzle database instance.
 * Ensures data directory exists and SQLite WAL mode is enabled.
 */
export async function getDb(): Promise<BetterSQLite3Database<typeof schema> | null> {
  if (!_db) {
    try {
      const dbUrl = process.env.DATABASE_URL || "./data/cybershield.db";
      // Ensure directory exists
      const dbDir = path.dirname(path.resolve(dbUrl));
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      _sqlite = new Database(dbUrl);
      _sqlite.pragma("journal_mode = WAL");
      _sqlite.pragma("foreign_keys = ON");
      _db = drizzle(_sqlite, { schema });
    } catch (error) {
      console.warn("[Database] Failed to connect to SQLite:", error);
      _db = null;
    }
  }
  return _db;
}

/**
 * Sync version of getDb for fast synchronous internal lookups if needed
 */
export function getDbSync(): BetterSQLite3Database<typeof schema> | null {
  if (!_db) {
    try {
      const dbUrl = process.env.DATABASE_URL || "./data/cybershield.db";
      const dbDir = path.dirname(path.resolve(dbUrl));
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      _sqlite = new Database(dbUrl);
      _sqlite.pragma("journal_mode = WAL");
      _sqlite.pragma("foreign_keys = ON");
      _db = drizzle(_sqlite, { schema });
    } catch (error) {
      console.warn("[Database] Failed to connect to SQLite (sync):", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: Partial<InsertUser> & { openId?: string | null }): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const existing = await db.select().from(users).where(eq(users.openId, user.openId)).limit(1);

    const updateSet: Record<string, unknown> = {};
    if (user.name !== undefined) updateSet.name = user.name;
    if (user.email !== undefined) updateSet.email = user.email;
    if (user.passwordHash !== undefined) updateSet.passwordHash = user.passwordHash;
    if (user.loginMethod !== undefined) updateSet.loginMethod = user.loginMethod;
    if (user.role !== undefined) {
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      updateSet.role = "admin";
    }
    updateSet.lastSignedIn = new Date();
    updateSet.updatedAt = new Date();

    if (existing.length > 0) {
      await db.update(users).set(updateSet).where(eq(users.openId, user.openId));
    } else {
      await db.insert(users).values({
        openId: user.openId,
        email: user.email,
        name: user.name,
        passwordHash: user.passwordHash,
        loginMethod: user.loginMethod || "local",
        role: (updateSet.role as string) || "user",
        lastSignedIn: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}
