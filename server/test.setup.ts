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

  // Ensure quizzes has status and createdBy columns
  try {
    db.exec("ALTER TABLE quizzes ADD COLUMN status TEXT DEFAULT 'published'");
  } catch {}
  try {
    db.exec("ALTER TABLE quizzes ADD COLUMN createdBy INTEGER REFERENCES users(id)");
  } catch {}

  // Ensure default test admin user exists in test database
  const adminCheck = db.prepare("SELECT count(*) as count FROM users WHERE email='admin@cybershield.sa'").get() as { count: number };
  if (adminCheck.count === 0) {
    db.prepare(`
      INSERT INTO users (name, email, passwordHash, role, isActive, mustChangePassword, loginMethod)
      VALUES ('مدير النظام', 'admin@cybershield.sa', '$2b$12$eXAMpLeHAsHForTEstINgOnLY77777777777777777777777777777', 'admin', 1, 0, 'local')
    `).run();
  }

  // Ensure quiz 1 exists with 5 questions for test consistency
  const quizCheck = db.prepare("SELECT count(*) as count FROM quizzes WHERE id=1").get() as { count: number };
  if (quizCheck.count === 0) {
    db.prepare(`
      INSERT INTO quizzes (id, titleAr, titleEn, passScorePercentage)
      VALUES (1, 'اختبار الوحدة 1: كشف رسائل التصيد', 'Quiz 1', 70)
    `).run();

    db.prepare(`
      INSERT INTO quiz_questions (id, quizId, questionAr, questionEn, optionsJson, correctOptionIndex, explanationAr, difficulty, "order")
      VALUES (1, 1, 'سؤال 1', 'Q1', '["A","B","C","D"]', 2, 'شرح', 'beginner', 1),
             (2, 1, 'سؤال 2', 'Q2', '["A","B","C","D"]', 1, 'شرح', 'beginner', 2),
             (15, 1, 'سؤال 3', 'Q3', '["A","B","C","D"]', 1, 'شرح', 'beginner', 3),
             (16, 1, 'سؤال 4', 'Q4', '["A","B","C","D"]', 1, 'شرح', 'intermediate', 4),
             (17, 1, 'سؤال 5', 'Q5', '["A","B","C","D"]', 0, 'شرح', 'intermediate', 5)
    `).run();
  }

  db.close();
});
