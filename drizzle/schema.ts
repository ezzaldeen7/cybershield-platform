import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

/**
 * CyberShield Awareness Platform - Unified SQLite Schema
 * ========================================================
 * Standard SQLite schema using drizzle-orm/sqlite-core.
 * Fully compatible with better-sqlite3 for zero-setup, reproducible offline execution.
 */

// 1. Users Table
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  openId: text("openId").unique(),
  email: text("email").unique(),
  passwordHash: text("passwordHash"),
  name: text("name"),
  loginMethod: text("loginMethod").default("local").notNull(),
  role: text("role").default("user").notNull(), // 'user' | 'instructor' | 'admin'
  mustChangePassword: integer("mustChangePassword", { mode: "boolean" }).default(false).notNull(),
  isActive: integer("isActive", { mode: "boolean" }).default(true).notNull(),
  lastIpAddress: text("lastIpAddress"),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(cast(unixepoch() as integer))`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`(cast(unixepoch() as integer))`).notNull(),
  lastSignedIn: integer("lastSignedIn", { mode: "timestamp" }).default(sql`(cast(unixepoch() as integer))`).notNull(),
});

// 2. Sessions Table (supports SHA-256 hashed token lookup)
export const sessions = sqliteTable("sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("tokenHash").notNull().unique(), // SHA-256 hash of session token
  token: text("token"), // Legacy fallback token field
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(cast(unixepoch() as integer))`).notNull(),
});

// 3. Password Reset Tokens
export const passwordResets = sqliteTable("password_resets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("tokenHash").notNull().unique(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  used: integer("used", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(cast(unixepoch() as integer))`).notNull(),
});

// 4. Lesson Categories
export const lessonCategories = sqliteTable("lesson_categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  nameAr: text("nameAr").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(cast(unixepoch() as integer))`).notNull(),
});

// 5. Lessons (CMS)
export const lessons = sqliteTable("lessons", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  titleAr: text("titleAr").notNull(),
  slug: text("slug").notNull().unique(),
  summary: text("summary"),
  summaryAr: text("summaryAr"),
  content: text("content").notNull(),
  contentAr: text("contentAr").notNull(),
  categoryId: integer("categoryId").references(() => lessonCategories.id, { onDelete: "set null" }),
  difficulty: text("difficulty").default("beginner").notNull(),
  durationMinutes: integer("durationMinutes").default(5).notNull(),
  status: text("status").default("published").notNull(),
  learningObjectivesJson: text("learningObjectivesJson"),
  order: integer("order").default(0).notNull(),
  createdBy: integer("createdBy").references(() => users.id, { onDelete: "set null" }),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(cast(unixepoch() as integer))`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`(cast(unixepoch() as integer))`).notNull(),
});

// 6. Lesson Tags
export const lessonTags = sqliteTable("lesson_tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  lessonId: integer("lessonId").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  tag: text("tag").notNull(),
});

// 7. Lesson Prerequisites
export const lessonPrerequisites = sqliteTable("lesson_prerequisites", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  lessonId: integer("lessonId").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  prerequisiteLessonId: integer("prerequisiteLessonId").notNull().references(() => lessons.id, { onDelete: "cascade" }),
});

// 8. User Progress
export const userProgress = sqliteTable("user_progress", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  lessonId: integer("lessonId").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  status: text("status").default("in_progress").notNull(),
  completedAt: integer("completedAt", { mode: "timestamp" }),
  lastAccessedAt: integer("lastAccessedAt", { mode: "timestamp" }).default(sql`(cast(unixepoch() as integer))`).notNull(),
});

// 9. Quizzes
export const quizzes = sqliteTable("quizzes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  lessonId: integer("lessonId").references(() => lessons.id, { onDelete: "cascade" }),
  titleAr: text("titleAr").notNull(),
  titleEn: text("titleEn"),
  passScorePercentage: integer("passScorePercentage").default(70).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(cast(unixepoch() as integer))`).notNull(),
});

// 10. Quiz Questions
export const quizQuestions = sqliteTable("quiz_questions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  quizId: integer("quizId").notNull().references(() => quizzes.id, { onDelete: "cascade" }),
  questionEn: text("questionEn"),
  questionAr: text("questionAr").notNull(),
  optionsJson: text("optionsJson").notNull(),
  correctOptionIndex: integer("correctOptionIndex").notNull(),
  explanationAr: text("explanationAr").notNull(),
  difficulty: text("difficulty").default("medium").notNull(),
  order: integer("order").default(0).notNull(),
});

// 11. Quiz Attempts
export const quizAttempts = sqliteTable("quiz_attempts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  quizId: integer("quizId").notNull().references(() => quizzes.id, { onDelete: "cascade" }),
  totalQuestions: integer("totalQuestions").notNull(),
  correctAnswers: integer("correctAnswers").notNull(),
  scorePercentage: integer("scorePercentage").notNull(),
  passed: integer("passed", { mode: "boolean" }).notNull(),
  answersJson: text("answersJson").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(cast(unixepoch() as integer))`).notNull(),
});

// 12. Interactive Scenarios
export const scenarios = sqliteTable("scenarios", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  titleAr: text("titleAr").notNull(),
  threatType: text("threatType").notNull(),
  difficulty: text("difficulty").default("beginner").notNull(),
  descriptionAr: text("descriptionAr").notNull(),
  status: text("status").default("published").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(cast(unixepoch() as integer))`).notNull(),
});

// 13. Scenario Steps (Multi-step)
export const scenarioSteps = sqliteTable("scenario_steps", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  scenarioId: integer("scenarioId").notNull().references(() => scenarios.id, { onDelete: "cascade" }),
  stepNumber: integer("stepNumber").default(1).notNull(),
  situationAr: text("situationAr").notNull(),
  contextDataJson: text("contextDataJson"),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(cast(unixepoch() as integer))`).notNull(),
});

// 14. Scenario Options
export const scenarioOptions = sqliteTable("scenario_options", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  stepId: integer("stepId").notNull().references(() => scenarioSteps.id, { onDelete: "cascade" }),
  labelAr: text("labelAr").notNull(),
  labelEn: text("labelEn"),
  actionType: text("actionType").notNull(),
  isCorrect: integer("isCorrect", { mode: "boolean" }).notNull(),
  riskScoreDelta: integer("riskScoreDelta").default(0).notNull(),
  feedbackAr: text("feedbackAr").notNull(),
  nextStepNumber: integer("nextStepNumber"),
  recommendedLessonId: integer("recommendedLessonId").references(() => lessons.id, { onDelete: "set null" }),
});

// 15. Scenario Attempts
export const scenarioAttempts = sqliteTable("scenario_attempts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  scenarioId: integer("scenarioId").notNull().references(() => scenarios.id, { onDelete: "cascade" }),
  passed: integer("passed", { mode: "boolean" }).notNull(),
  finalAction: text("finalAction").notNull(),
  scorePercentage: integer("scorePercentage").default(0).notNull(),
  totalRiskDelta: integer("totalRiskDelta").default(0).notNull(),
  feedbackSummary: text("feedbackSummary"),
  detailedResponsesJson: text("detailedResponsesJson"),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(cast(unixepoch() as integer))`).notNull(),
});

// 16. Assessment Questions (pre / post)
export const assessmentQuestions = sqliteTable("assessment_questions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  assessmentType: text("assessmentType").notNull(), // 'pre' | 'post'
  category: text("category").notNull(),
  questionAr: text("questionAr").notNull(),
  questionEn: text("questionEn"),
  optionsJson: text("optionsJson").notNull(),
  correctOptionIndex: integer("correctOptionIndex").notNull(),
  explanationAr: text("explanationAr").notNull(),
  order: integer("order").default(0).notNull(),
});

// 17. Assessment Attempts
export const assessmentAttempts = sqliteTable("assessment_attempts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  assessmentType: text("assessmentType").default("pre").notNull(), // 'pre' | 'post'
  assessmentId: integer("assessmentId").default(1),
  scorePercentage: integer("scorePercentage").notNull(),
  categoryScoresJson: text("categoryScoresJson"),
  answersJson: text("answersJson"),
  completedAt: integer("completedAt", { mode: "timestamp" }).default(sql`(cast(unixepoch() as integer))`).notNull(),
});

// 18. Awareness Scores
export const awarenessScores = sqliteTable("awareness_scores", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  initialScore: integer("initialScore").default(0).notNull(),
  currentScore: integer("currentScore").default(0).notNull(),
  finalScore: integer("finalScore"),
  improvementDelta: integer("improvementDelta").default(0).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(cast(unixepoch() as integer))`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`(cast(unixepoch() as integer))`).notNull(),
});

// 19. Weaknesses
export const weaknesses = sqliteTable("weaknesses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  severity: text("severity").default("medium").notNull(),
  detectedFrom: text("detectedFrom").default("quiz").notNull(),
  details: text("details"),
  resolved: integer("resolved", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(cast(unixepoch() as integer))`).notNull(),
});

// 20. Recommendations
export const recommendations = sqliteTable("recommendations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  weaknessId: integer("weaknessId").references(() => weaknesses.id, { onDelete: "set null" }),
  titleAr: text("titleAr").notNull(),
  reasonAr: text("reasonAr"),
  priority: text("priority").default("medium").notNull(),
  type: text("type").default("lesson").notNull(),
  targetSlugOrId: text("targetSlugOrId"),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(cast(unixepoch() as integer))`).notNull(),
});

// 21. Analyzer Logs
export const analyzerLogs = sqliteTable("analyzer_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").references(() => users.id, { onDelete: "set null" }),
  type: text("type").notNull(),
  inputSnippet: text("inputSnippet").notNull(),
  riskScore: integer("riskScore").notNull(),
  riskLevel: text("riskLevel").notNull(),
  findingsJson: text("findingsJson"),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(cast(unixepoch() as integer))`).notNull(),
});

// 22. Audit Logs
export const auditLogs = sqliteTable("audit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  eventType: text("eventType").notNull(),
  severity: text("severity").default("info").notNull(),
  detailsJson: text("detailsJson"),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  timestamp: integer("timestamp", { mode: "timestamp" }).default(sql`(cast(unixepoch() as integer))`).notNull(),
});

// 23. Security Events
export const securityEvents = sqliteTable("security_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  eventType: text("eventType").notNull(),
  severity: text("severity").default("info").notNull(),
  ipAddress: text("ipAddress"),
  detailsJson: text("detailsJson"),
  timestamp: integer("timestamp", { mode: "timestamp" }).default(sql`(cast(unixepoch() as integer))`).notNull(),
});

// 24. Files (Maintained passively)
export const files = sqliteTable("files", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  lessonId: integer("lessonId"),
  filename: text("filename"),
  storedFilename: text("storedFilename"),
  fileName: text("fileName"),
  fileSize: integer("fileSize"),
  sizeBytes: integer("sizeBytes"),
  mimeType: text("mimeType").notNull(),
  storagePath: text("storagePath"),
  uploadedBy: integer("uploadedBy").references(() => users.id, { onDelete: "set null" }),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(cast(unixepoch() as integer))`).notNull(),
});

// Inferred Types Export
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Lesson = typeof lessons.$inferSelect;
export type InsertLesson = typeof lessons.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Quiz = typeof quizzes.$inferSelect;
export type Scenario = typeof scenarios.$inferSelect;
export type AssessmentAttempt = typeof assessmentAttempts.$inferSelect;
export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type ScenarioAttempt = typeof scenarioAttempts.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
