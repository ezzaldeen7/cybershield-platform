import {
  boolean,
  double,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * CyberShield Awareness Platform - Unified Database Schema
 * =========================================================
 * Full Drizzle Schema supporting Auth, RBAC, CMS, Quizzes, Scenarios,
 * Assessments, Risk Engine, Analyzers, Recommendations, and Audit Logs.
 */

// 1. Users Table
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).unique(),
  email: varchar("email", { length: 320 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }), // Nullable for OAuth-only users
  name: varchar("name", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }).default("local").notNull(),
  role: mysqlEnum("role", ["user", "instructor", "admin"]).default("user").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  lastIpAddress: varchar("lastIpAddress", { length: 45 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

// 2. Sessions Table
export const sessions = mysqlTable("sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 255 }).notNull().unique(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// 3. Password Reset Tokens
export const passwordResets = mysqlTable("password_resets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: varchar("tokenHash", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// 4. Lesson Categories
export const lessonCategories = mysqlTable("lesson_categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  nameAr: varchar("nameAr", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// 5. Lessons (CMS)
export const lessons = mysqlTable("lessons", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  titleAr: varchar("titleAr", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  summary: text("summary"),
  summaryAr: text("summaryAr"),
  content: text("content").notNull(),
  contentAr: text("contentAr").notNull(),
  categoryId: int("categoryId").references(() => lessonCategories.id, { onDelete: "set null" }),
  difficulty: mysqlEnum("difficulty", ["beginner", "intermediate", "advanced"]).default("beginner").notNull(),
  durationMinutes: int("durationMinutes").default(5).notNull(),
  status: mysqlEnum("status", ["draft", "published", "archived"]).default("published").notNull(),
  learningObjectivesJson: text("learningObjectivesJson"), // JSON string array
  order: int("order").default(0).notNull(),
  createdBy: int("createdBy").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// 6. Lesson Tags
export const lessonTags = mysqlTable("lesson_tags", {
  id: int("id").autoincrement().primaryKey(),
  lessonId: int("lessonId").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  tag: varchar("tag", { length: 50 }).notNull(),
});

// 7. Lesson Prerequisites
export const lessonPrerequisites = mysqlTable("lesson_prerequisites", {
  id: int("id").autoincrement().primaryKey(),
  lessonId: int("lessonId").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  prerequisiteLessonId: int("prerequisiteLessonId").notNull().references(() => lessons.id, { onDelete: "cascade" }),
});

// 8. Secure Files / Lesson Media
export const files = mysqlTable("files", {
  id: int("id").autoincrement().primaryKey(),
  lessonId: int("lessonId").references(() => lessons.id, { onDelete: "set null" }),
  filename: varchar("filename", { length: 255 }).notNull(),
  storedFilename: varchar("storedFilename", { length: 255 }).notNull().unique(), // UUID filename
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  sizeBytes: int("sizeBytes").notNull(),
  uploadedBy: int("uploadedBy").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// 9. Quizzes
export const quizzes = mysqlTable("quizzes", {
  id: int("id").autoincrement().primaryKey(),
  lessonId: int("lessonId").references(() => lessons.id, { onDelete: "set null" }),
  title: varchar("title", { length: 255 }).notNull(),
  titleAr: varchar("titleAr", { length: 255 }).notNull(),
  description: text("description"),
  passingScore: int("passingScore").default(70).notNull(),
  status: mysqlEnum("status", ["draft", "published", "archived"]).default("published").notNull(),
  createdBy: int("createdBy").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// 10. Quiz Questions
export const quizQuestions = mysqlTable("quiz_questions", {
  id: int("id").autoincrement().primaryKey(),
  quizId: int("quizId").notNull().references(() => quizzes.id, { onDelete: "cascade" }),
  questionEn: text("questionEn").notNull(),
  questionAr: text("questionAr").notNull(),
  optionsJson: text("optionsJson").notNull(), // JSON array of options
  correctOptionIndex: int("correctOptionIndex").notNull(),
  explanationEn: text("explanationEn"),
  explanationAr: text("explanationAr"),
  difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard"]).default("medium").notNull(),
  order: int("order").default(0).notNull(),
});

// 11. Quiz Attempts
export const quizAttempts = mysqlTable("quiz_attempts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  quizId: int("quizId").notNull().references(() => quizzes.id, { onDelete: "cascade" }),
  totalQuestions: int("totalQuestions").notNull(),
  correctAnswers: int("correctAnswers").notNull(),
  scorePercentage: double("scorePercentage").notNull(),
  passed: boolean("passed").notNull(),
  answersJson: text("answersJson"), // JSON: [{questionId, selectedIndex, isCorrect}]
  timeSpentSeconds: int("timeSpentSeconds"),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
});

// 12. Interactive Scenarios
export const scenarios = mysqlTable("scenarios", {
  id: int("id").autoincrement().primaryKey(),
  lessonId: int("lessonId").references(() => lessons.id, { onDelete: "set null" }),
  title: varchar("title", { length: 255 }).notNull(),
  titleAr: varchar("titleAr", { length: 255 }).notNull(),
  description: text("description"),
  descriptionAr: text("descriptionAr"),
  threatType: varchar("threatType", { length: 100 }).notNull(), // e.g., 'phishing_email', 'fake_sms'
  difficulty: mysqlEnum("difficulty", ["beginner", "intermediate", "advanced"]).default("beginner").notNull(),
  status: mysqlEnum("status", ["draft", "published", "archived"]).default("published").notNull(),
  createdBy: int("createdBy").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// 13. Scenario Steps
export const scenarioSteps = mysqlTable("scenario_steps", {
  id: int("id").autoincrement().primaryKey(),
  scenarioId: int("scenarioId").notNull().references(() => scenarios.id, { onDelete: "cascade" }),
  stepOrder: int("stepOrder").default(1).notNull(),
  promptAr: text("promptAr").notNull(),
  promptEn: text("promptEn").notNull(),
  contextJson: text("contextJson"), // JSON: sender, emailSubject, simulatedLink, etc.
});

// 14. Scenario Options / Decisions
export const scenarioOptions = mysqlTable("scenario_options", {
  id: int("id").autoincrement().primaryKey(),
  stepId: int("stepId").notNull().references(() => scenarioSteps.id, { onDelete: "cascade" }),
  labelAr: text("labelAr").notNull(),
  labelEn: text("labelEn").notNull(),
  actionType: varchar("actionType", { length: 50 }).notNull(), // 'report', 'verify', 'click', 'ignore'
  isCorrect: boolean("isCorrect").notNull(),
  riskScoreDelta: int("riskScoreDelta").default(0).notNull(),
  explanationAr: text("explanationAr").notNull(),
  explanationEn: text("explanationEn"),
  recommendedLessonId: int("recommendedLessonId").references(() => lessons.id, { onDelete: "set null" }),
});

// 15. Scenario Attempts
export const scenarioAttempts = mysqlTable("scenario_attempts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  scenarioId: int("scenarioId").notNull().references(() => scenarios.id, { onDelete: "cascade" }),
  passed: boolean("passed").notNull(),
  finalAction: varchar("finalAction", { length: 50 }).notNull(),
  scorePercentage: double("scorePercentage").notNull(),
  feedbackSummary: text("feedbackSummary"),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
});

// 16. Assessments
export const assessments = mysqlTable("assessments", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["initial", "final"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  titleAr: varchar("titleAr", { length: 255 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["draft", "published", "archived"]).default("published").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// 17. Assessment Questions
export const assessmentQuestions = mysqlTable("assessment_questions", {
  id: int("id").autoincrement().primaryKey(),
  assessmentId: int("assessmentId").notNull().references(() => assessments.id, { onDelete: "cascade" }),
  questionAr: text("questionAr").notNull(),
  questionEn: text("questionEn").notNull(),
  optionsJson: text("optionsJson").notNull(),
  correctOptionIndex: int("correctOptionIndex").notNull(),
  category: varchar("category", { length: 100 }).notNull(), // 'phishing', 'passwords', 'urls', 'social'
  explanationAr: text("explanationAr"),
});

// 18. Assessment Attempts
export const assessmentAttempts = mysqlTable("assessment_attempts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  assessmentId: int("assessmentId").notNull().references(() => assessments.id, { onDelete: "cascade" }),
  scorePercentage: double("scorePercentage").notNull(),
  categoryScoresJson: text("categoryScoresJson"), // JSON breakdown
  completedAt: timestamp("completedAt").defaultNow().notNull(),
});

// 19. User Learning Progress
export const userProgress = mysqlTable("user_progress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  lessonId: int("lessonId").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  status: mysqlEnum("status", ["not_started", "in_progress", "completed"]).default("not_started").notNull(),
  completedAt: timestamp("completedAt"),
  lastAccessedAt: timestamp("lastAccessedAt").defaultNow().notNull(),
});

// 20. Awareness Scores & History
export const awarenessScores = mysqlTable("awareness_scores", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  initialScore: double("initialScore").default(0).notNull(),
  currentScore: double("currentScore").default(0).notNull(),
  finalScore: double("finalScore"),
  improvementDelta: double("improvementDelta").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// 21. User Weaknesses
export const weaknesses = mysqlTable("weaknesses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  category: varchar("category", { length: 100 }).notNull(),
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).default("medium").notNull(),
  detectedFrom: varchar("detectedFrom", { length: 50 }).notNull(), // 'assessment', 'quiz', 'scenario', 'analyzer'
  details: text("details"),
  resolved: boolean("resolved").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// 22. Recommendations
export const recommendations = mysqlTable("recommendations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  lessonId: int("lessonId").references(() => lessons.id, { onDelete: "cascade" }),
  scenarioId: int("scenarioId").references(() => scenarios.id, { onDelete: "cascade" }),
  quizId: int("quizId").references(() => quizzes.id, { onDelete: "cascade" }),
  reasonAr: text("reasonAr").notNull(),
  reasonEn: text("reasonEn"),
  priority: mysqlEnum("priority", ["low", "medium", "high"]).default("medium").notNull(),
  isDismissed: boolean("isDismissed").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// 23. Analyzer Logs (Safe URL & Message Analysis)
export const analyzerLogs = mysqlTable("analyzer_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id, { onDelete: "set null" }),
  type: mysqlEnum("type", ["url", "message"]).notNull(),
  inputSnippet: text("inputSnippet").notNull(),
  riskScore: int("riskScore").notNull(),
  riskLevel: mysqlEnum("riskLevel", ["low", "medium", "high", "critical"]).notNull(),
  findingsJson: text("findingsJson").notNull(), // JSON array of findings
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// 24. Risk Scoring Rules
export const riskRules = mysqlTable("risk_rules", {
  id: int("id").autoincrement().primaryKey(),
  ruleName: varchar("ruleName", { length: 100 }).notNull(),
  category: mysqlEnum("category", ["url", "message"]).notNull(),
  patternOrKeyword: varchar("patternOrKeyword", { length: 255 }).notNull(),
  weight: int("weight").notNull(),
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).notNull(),
  explanationAr: text("explanationAr").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
});

// 25. Audit Logs
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 100 }).notNull(),
  eventType: varchar("eventType", { length: 100 }).notNull(),
  severity: mysqlEnum("severity", ["info", "warning", "error", "security"]).default("info").notNull(),
  detailsJson: text("detailsJson"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// 26. Security Events
export const securityEvents = mysqlTable("security_events", {
  id: int("id").autoincrement().primaryKey(),
  eventType: varchar("eventType", { length: 100 }).notNull(),
  severity: mysqlEnum("severity", ["medium", "high", "critical"]).notNull(),
  description: text("description").notNull(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userId: int("userId").references(() => users.id, { onDelete: "set null" }),
  detailsJson: text("detailsJson"),
  resolved: boolean("resolved").default(false).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Types Export
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Lesson = typeof lessons.$inferSelect;
export type InsertLesson = typeof lessons.$inferInsert;
export type Quiz = typeof quizzes.$inferSelect;
export type Scenario = typeof scenarios.$inferSelect;
export type Assessment = typeof assessments.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;