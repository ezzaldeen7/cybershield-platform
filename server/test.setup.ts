import { beforeAll } from "vitest";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

beforeAll(() => {
  const testDbPath = path.resolve("./data/cybershield.test.db");
  const dataDir = path.dirname(testDbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Ensure fresh isolated test database
  const db = new Database(testDbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Check if schema is already initialized to avoid duplicate table error across parallel workers
  const tableCheck = db.prepare("SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='users'").get() as { count: number };
  if (tableCheck.count === 0) {
    const migrationSqlPath = path.resolve("./drizzle/migrations/0000_overconfident_revanche.sql");
    if (fs.existsSync(migrationSqlPath)) {
      const migrationSql = fs.readFileSync(migrationSqlPath, "utf8");
      db.exec(migrationSql);
    }
  }

  // Ensure default test admin user exists in test database
  const adminCheck = db.prepare("SELECT count(*) as count FROM users WHERE email='admin@cybershield.sa'").get() as { count: number };
  if (adminCheck.count === 0) {
    db.prepare(`
      INSERT INTO users (name, email, passwordHash, role, isActive, mustChangePassword, loginMethod)
      VALUES ('مدير النظام', 'admin@cybershield.sa', '$2b$12$eXAMpLeHAsHForTEstINgOnLY77777777777777777777777777777', 'admin', 1, 0, 'local')
    `).run();
  }

  db.close();
});
