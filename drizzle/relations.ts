import { relations } from "drizzle-orm";
import {
  users,
  sessions,
  lessons,
  lessonCategories,
  userProgress,
  quizzes,
  quizQuestions,
  quizAttempts,
  scenarios,
  scenarioSteps,
  scenarioOptions,
  scenarioAttempts,
  assessmentAttempts,
  awarenessScores,
  weaknesses,
  recommendations,
  auditLogs,
} from "./schema";

export const usersRelations = relations(users, ({ many, one }) => ({
  sessions: many(sessions),
  progress: many(userProgress),
  quizAttempts: many(quizAttempts),
  scenarioAttempts: many(scenarioAttempts),
  assessmentAttempts: many(assessmentAttempts),
  awarenessScore: one(awarenessScores, {
    fields: [users.id],
    references: [awarenessScores.userId],
  }),
  weaknesses: many(weaknesses),
  recommendations: many(recommendations),
  auditLogs: many(auditLogs),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const lessonCategoriesRelations = relations(lessonCategories, ({ many }) => ({
  lessons: many(lessons),
}));

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  category: one(lessonCategories, {
    fields: [lessons.categoryId],
    references: [lessonCategories.id],
  }),
  quizzes: many(quizzes),
  userProgress: many(userProgress),
}));

export const userProgressRelations = relations(userProgress, ({ one }) => ({
  user: one(users, {
    fields: [userProgress.userId],
    references: [users.id],
  }),
  lesson: one(lessons, {
    fields: [userProgress.lessonId],
    references: [lessons.id],
  }),
}));

export const quizzesRelations = relations(quizzes, ({ one, many }) => ({
  lesson: one(lessons, {
    fields: [quizzes.lessonId],
    references: [lessons.id],
  }),
  questions: many(quizQuestions),
  attempts: many(quizAttempts),
}));

export const quizQuestionsRelations = relations(quizQuestions, ({ one }) => ({
  quiz: one(quizzes, {
    fields: [quizQuestions.quizId],
    references: [quizzes.id],
  }),
}));

export const scenariosRelations = relations(scenarios, ({ many }) => ({
  steps: many(scenarioSteps),
  attempts: many(scenarioAttempts),
}));

export const scenarioStepsRelations = relations(scenarioSteps, ({ one, many }) => ({
  scenario: one(scenarios, {
    fields: [scenarioSteps.scenarioId],
    references: [scenarios.id],
  }),
  options: many(scenarioOptions),
}));

export const scenarioOptionsRelations = relations(scenarioOptions, ({ one }) => ({
  step: one(scenarioSteps, {
    fields: [scenarioOptions.stepId],
    references: [scenarioSteps.id],
  }),
}));
