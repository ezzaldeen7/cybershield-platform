/**
 * Enhanced Database Schema
 * ========================
 * Complete schema with security and educational components
 */

import { sqliteTable, text, integer, real, blob, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Users table (with encryption support)
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  openId: text('openId').unique().notNull(),
  nameEncrypted: text('nameEncrypted'), // JSON: {iv, ciphertext, authTag}
  emailEncrypted: text('emailEncrypted'), // JSON: {iv, ciphertext, authTag}
  emailHash: text('emailHash').unique(), // SHA256 hash for lookup
  loginMethod: text('loginMethod').default('Manus').notNull(),
  role: text('role').default('user').notNull(), // 'user', 'instructor', 'admin'
  createdAt: integer('createdAt').default(sql`(cast(unixepoch() as integer))`),
  updatedAt: integer('updatedAt').default(sql`(cast(unixepoch() as integer))`),
  lastSignedIn: integer('lastSignedIn'),
  lastIpAddress: text('lastIpAddress'),
  isActive: integer('isActive').default(1), // For soft delete/deactivation
}, (table) => ({
  openIdIdx: index('users_openId_idx').on(table.openId),
  emailHashIdx: index('users_emailHash_idx').on(table.emailHash),
  roleIdx: index('users_role_idx').on(table.role),
}));

// Courses table
export const courses = sqliteTable('courses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  titleAr: text('titleAr').notNull(),
  description: text('description'),
  descriptionAr: text('descriptionAr'),
  content: text('content'), // JSON content
  contentAr: text('contentAr'), // Arabic content
  icon: text('icon'), // Icon name or URL
  duration: integer('duration'), // Duration in minutes
  difficulty: text('difficulty').default('beginner'), // 'beginner', 'intermediate', 'advanced'
  order: integer('order').default(0),
  isActive: integer('isActive').default(1),
  createdAt: integer('createdAt').default(sql`(cast(unixepoch() as integer))`),
  updatedAt: integer('updatedAt').default(sql`(cast(unixepoch() as integer))`),
  createdBy: integer('createdBy'),
}, (table) => ({
  titleIdx: index('courses_title_idx').on(table.title),
  orderIdx: index('courses_order_idx').on(table.order),
}));

// Quiz Questions
export const quizQuestions = sqliteTable('quiz_questions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  courseId: integer('courseId').references(() => courses.id).notNull(),
  questionEn: text('questionEn').notNull(),
  questionAr: text('questionAr').notNull(),
  optionsJson: text('optionsJson').notNull(), // JSON array of options
  correctAnswerIndex: integer('correctAnswerIndex').notNull(),
  explanationEn: text('explanationEn'),
  explanationAr: text('explanationAr'),
  difficulty: text('difficulty').default('medium'),
  order: integer('order').default(0),
  createdAt: integer('createdAt').default(sql`(cast(unixepoch() as integer))`),
}, (table) => ({
  courseIdIdx: index('quiz_questions_courseId_idx').on(table.courseId),
}));

// Quiz Attempts (user responses)
export const quizAttempts = sqliteTable('quiz_attempts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('userId').references(() => users.id).notNull(),
  courseId: integer('courseId').references(() => courses.id).notNull(),
  questionsCount: integer('questionsCount'),
  correctCount: integer('correctCount'),
  score: real('score'), // Percentage 0-100
  answersJson: text('answersJson'), // JSON: [{questionId, selectedIndex, isCorrect}]
  timeSpentSeconds: integer('timeSpentSeconds'),
  completedAt: integer('completedAt').notNull(),
  createdAt: integer('createdAt').default(sql`(cast(unixepoch() as integer))`),
}, (table) => ({
  userIdIdx: index('quiz_attempts_userId_idx').on(table.userId),
  courseIdIdx: index('quiz_attempts_courseId_idx').on(table.courseId),
  completedAtIdx: index('quiz_attempts_completedAt_idx').on(table.completedAt),
}));

// User Progress
export const userProgress = sqliteTable('user_progress', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('userId').references(() => users.id).notNull(),
  courseId: integer('courseId').references(() => courses.id).notNull(),
  progressPercentage: real('progressPercentage').default(0),
  lessonsCompleted: integer('lessonsCompleted').default(0),
  quizzesAttempted: integer('quizzesAttempted').default(0),
  averageScore: real('averageScore'),
  completedAt: integer('completedAt'), // When user finished course
  lastAccessedAt: integer('lastAccessedAt'),
  createdAt: integer('createdAt').default(sql`(cast(unixepoch() as integer))`),
  updatedAt: integer('updatedAt').default(sql`(cast(unixepoch() as integer))`),
}, (table) => ({
  userIdIdx: index('user_progress_userId_idx').on(table.userId),
  courseIdIdx: index('user_progress_courseId_idx').on(table.courseId),
  uniqueUserCourse: index('user_progress_unique_idx').on(table.userId, table.courseId),
}));

// Audit Logs (security events)
export const auditLogs = sqliteTable('audit_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  timestamp: integer('timestamp').default(sql`(cast(unixepoch() as integer))`),
  level: text('level').notNull(), // 'INFO', 'WARNING', 'ERROR', 'SECURITY'
  eventType: text('eventType').notNull(), // 'AUTH_LOGIN', 'AUTH_LOGOUT', etc.
  userId: integer('userId').references(() => users.id),
  userEmail: text('userEmail'),
  action: text('action').notNull(),
  details: text('details'), // JSON
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  severity: text('severity'), // 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
}, (table) => ({
  userIdIdx: index('audit_logs_userId_idx').on(table.userId),
  eventTypeIdx: index('audit_logs_eventType_idx').on(table.eventType),
  timestampIdx: index('audit_logs_timestamp_idx').on(table.timestamp),
}));

// Security Events (attacks, suspicious activity)
export const securityEvents = sqliteTable('security_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  timestamp: integer('timestamp').default(sql`(cast(unixepoch() as integer))`),
  eventType: text('eventType').notNull(), // 'INJECTION_ATTEMPT', 'RATE_LIMIT_HIT', etc.
  description: text('description').notNull(),
  ipAddress: text('ipAddress'),
  userId: integer('userId').references(() => users.id),
  severity: text('severity').notNull(), // 'MEDIUM', 'HIGH', 'CRITICAL'
  details: text('details'), // JSON with more info
  resolved: integer('resolved').default(0),
}, (table) => ({
  eventTypeIdx: index('security_events_eventType_idx').on(table.eventType),
  timestampIdx: index('security_events_timestamp_idx').on(table.timestamp),
  severityIdx: index('security_events_severity_idx').on(table.severity),
}));

// Learning Analytics
export const learningAnalytics = sqliteTable('learning_analytics', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('userId').references(() => users.id).unique().notNull(),
  totalCoursesStarted: integer('totalCoursesStarted').default(0),
  totalCoursesCompleted: integer('totalCoursesCompleted').default(0),
  totalQuizzesAttempted: integer('totalQuizzesAttempted').default(0),
  averageQuizScore: real('averageQuizScore'),
  totalTimeSpentSeconds: integer('totalTimeSpentSeconds').default(0),
  lastActivityAt: integer('lastActivityAt'),
  createdAt: integer('createdAt').default(sql`(cast(unixepoch() as integer))`),
  updatedAt: integer('updatedAt').default(sql`(cast(unixepoch() as integer))`),
});

// Session Management
export const sessions = sqliteTable('sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('userId').references(() => users.id).notNull(),
  sessionToken: text('sessionToken').unique().notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  expiresAt: integer('expiresAt').notNull(),
  createdAt: integer('createdAt').default(sql`(cast(unixepoch() as integer))`),
  lastActivityAt: integer('lastActivityAt'),
}, (table) => ({
  userIdIdx: index('sessions_userId_idx').on(table.userId),
  expiresAtIdx: index('sessions_expiresAt_idx').on(table.expiresAt),
  tokenIdx: index('sessions_token_idx').on(table.sessionToken),
}));

// Content Review (for community moderation)
export const contentReviews = sqliteTable('content_reviews', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  courseId: integer('courseId').references(() => courses.id),
  questionId: integer('questionId').references(() => quizQuestions.id),
  reviewedBy: integer('reviewedBy').references(() => users.id),
  rating: integer('rating'), // 1-5 stars
  comment: text('comment'),
  createdAt: integer('createdAt').default(sql`(cast(unixepoch() as integer))`),
});

export type User = typeof users.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type QuizQuestion = typeof quizQuestions.$inferSelect;
export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type UserProgress = typeof userProgress.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type SecurityEvent = typeof securityEvents.$inferSelect;
export type Session = typeof sessions.$inferSelect;
