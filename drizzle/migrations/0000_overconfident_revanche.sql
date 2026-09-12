CREATE TABLE `analyzer_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer,
	`type` text NOT NULL,
	`inputSnippet` text NOT NULL,
	`riskScore` integer NOT NULL,
	`riskLevel` text NOT NULL,
	`findingsJson` text,
	`createdAt` integer DEFAULT (cast(unixepoch() as integer)) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `assessment_attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`assessmentType` text DEFAULT 'pre' NOT NULL,
	`assessmentId` integer DEFAULT 1,
	`scorePercentage` integer NOT NULL,
	`categoryScoresJson` text,
	`answersJson` text,
	`completedAt` integer DEFAULT (cast(unixepoch() as integer)) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `assessment_questions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`assessmentType` text NOT NULL,
	`category` text NOT NULL,
	`questionAr` text NOT NULL,
	`questionEn` text,
	`optionsJson` text NOT NULL,
	`correctOptionIndex` integer NOT NULL,
	`explanationAr` text NOT NULL,
	`order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer,
	`action` text NOT NULL,
	`eventType` text NOT NULL,
	`severity` text DEFAULT 'info' NOT NULL,
	`detailsJson` text,
	`ipAddress` text,
	`userAgent` text,
	`timestamp` integer DEFAULT (cast(unixepoch() as integer)) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `awareness_scores` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`initialScore` integer DEFAULT 0 NOT NULL,
	`currentScore` integer DEFAULT 0 NOT NULL,
	`finalScore` integer,
	`improvementDelta` integer DEFAULT 0 NOT NULL,
	`createdAt` integer DEFAULT (cast(unixepoch() as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast(unixepoch() as integer)) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `awareness_scores_userId_unique` ON `awareness_scores` (`userId`);--> statement-breakpoint
CREATE TABLE `files` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fileName` text NOT NULL,
	`fileSize` integer NOT NULL,
	`mimeType` text NOT NULL,
	`storagePath` text NOT NULL,
	`uploadedBy` integer,
	`createdAt` integer DEFAULT (cast(unixepoch() as integer)) NOT NULL,
	FOREIGN KEY (`uploadedBy`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `lesson_categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`nameAr` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`createdAt` integer DEFAULT (cast(unixepoch() as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lesson_categories_slug_unique` ON `lesson_categories` (`slug`);--> statement-breakpoint
CREATE TABLE `lesson_prerequisites` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lessonId` integer NOT NULL,
	`prerequisiteLessonId` integer NOT NULL,
	FOREIGN KEY (`lessonId`) REFERENCES `lessons`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`prerequisiteLessonId`) REFERENCES `lessons`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `lesson_tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lessonId` integer NOT NULL,
	`tag` text NOT NULL,
	FOREIGN KEY (`lessonId`) REFERENCES `lessons`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `lessons` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`titleAr` text NOT NULL,
	`slug` text NOT NULL,
	`summary` text,
	`summaryAr` text,
	`content` text NOT NULL,
	`contentAr` text NOT NULL,
	`categoryId` integer,
	`difficulty` text DEFAULT 'beginner' NOT NULL,
	`durationMinutes` integer DEFAULT 5 NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`learningObjectivesJson` text,
	`order` integer DEFAULT 0 NOT NULL,
	`createdBy` integer,
	`createdAt` integer DEFAULT (cast(unixepoch() as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast(unixepoch() as integer)) NOT NULL,
	FOREIGN KEY (`categoryId`) REFERENCES `lesson_categories`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lessons_slug_unique` ON `lessons` (`slug`);--> statement-breakpoint
CREATE TABLE `password_resets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`tokenHash` text NOT NULL,
	`expiresAt` integer NOT NULL,
	`used` integer DEFAULT false NOT NULL,
	`createdAt` integer DEFAULT (cast(unixepoch() as integer)) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `password_resets_tokenHash_unique` ON `password_resets` (`tokenHash`);--> statement-breakpoint
CREATE TABLE `quiz_attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`quizId` integer NOT NULL,
	`totalQuestions` integer NOT NULL,
	`correctAnswers` integer NOT NULL,
	`scorePercentage` integer NOT NULL,
	`passed` integer NOT NULL,
	`answersJson` text NOT NULL,
	`createdAt` integer DEFAULT (cast(unixepoch() as integer)) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`quizId`) REFERENCES `quizzes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `quiz_questions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`quizId` integer NOT NULL,
	`questionEn` text,
	`questionAr` text NOT NULL,
	`optionsJson` text NOT NULL,
	`correctOptionIndex` integer NOT NULL,
	`explanationAr` text NOT NULL,
	`difficulty` text DEFAULT 'medium' NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`quizId`) REFERENCES `quizzes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `quizzes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lessonId` integer,
	`titleAr` text NOT NULL,
	`titleEn` text,
	`passScorePercentage` integer DEFAULT 70 NOT NULL,
	`createdAt` integer DEFAULT (cast(unixepoch() as integer)) NOT NULL,
	FOREIGN KEY (`lessonId`) REFERENCES `lessons`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `recommendations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`weaknessId` integer,
	`titleAr` text NOT NULL,
	`reasonAr` text,
	`priority` text DEFAULT 'medium' NOT NULL,
	`type` text DEFAULT 'lesson' NOT NULL,
	`targetSlugOrId` text,
	`createdAt` integer DEFAULT (cast(unixepoch() as integer)) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`weaknessId`) REFERENCES `weaknesses`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `scenario_attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`scenarioId` integer NOT NULL,
	`passed` integer NOT NULL,
	`finalAction` text NOT NULL,
	`scorePercentage` integer DEFAULT 0 NOT NULL,
	`totalRiskDelta` integer DEFAULT 0 NOT NULL,
	`feedbackSummary` text,
	`detailedResponsesJson` text,
	`createdAt` integer DEFAULT (cast(unixepoch() as integer)) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`scenarioId`) REFERENCES `scenarios`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `scenario_options` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`stepId` integer NOT NULL,
	`labelAr` text NOT NULL,
	`labelEn` text,
	`actionType` text NOT NULL,
	`isCorrect` integer NOT NULL,
	`riskScoreDelta` integer DEFAULT 0 NOT NULL,
	`feedbackAr` text NOT NULL,
	`nextStepNumber` integer,
	`recommendedLessonId` integer,
	FOREIGN KEY (`stepId`) REFERENCES `scenario_steps`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recommendedLessonId`) REFERENCES `lessons`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `scenario_steps` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`scenarioId` integer NOT NULL,
	`stepNumber` integer DEFAULT 1 NOT NULL,
	`situationAr` text NOT NULL,
	`contextDataJson` text,
	`createdAt` integer DEFAULT (cast(unixepoch() as integer)) NOT NULL,
	FOREIGN KEY (`scenarioId`) REFERENCES `scenarios`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `scenarios` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`titleAr` text NOT NULL,
	`threatType` text NOT NULL,
	`difficulty` text DEFAULT 'beginner' NOT NULL,
	`descriptionAr` text NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`createdAt` integer DEFAULT (cast(unixepoch() as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `security_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`eventType` text NOT NULL,
	`severity` text DEFAULT 'info' NOT NULL,
	`ipAddress` text,
	`detailsJson` text,
	`timestamp` integer DEFAULT (cast(unixepoch() as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`tokenHash` text NOT NULL,
	`token` text,
	`ipAddress` text,
	`userAgent` text,
	`expiresAt` integer NOT NULL,
	`createdAt` integer DEFAULT (cast(unixepoch() as integer)) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_tokenHash_unique` ON `sessions` (`tokenHash`);--> statement-breakpoint
CREATE TABLE `user_progress` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`lessonId` integer NOT NULL,
	`status` text DEFAULT 'in_progress' NOT NULL,
	`completedAt` integer,
	`lastAccessedAt` integer DEFAULT (cast(unixepoch() as integer)) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`lessonId`) REFERENCES `lessons`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`openId` text,
	`email` text,
	`passwordHash` text,
	`name` text,
	`loginMethod` text DEFAULT 'local' NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`mustChangePassword` integer DEFAULT false NOT NULL,
	`isActive` integer DEFAULT true NOT NULL,
	`lastIpAddress` text,
	`createdAt` integer DEFAULT (cast(unixepoch() as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast(unixepoch() as integer)) NOT NULL,
	`lastSignedIn` integer DEFAULT (cast(unixepoch() as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_openId_unique` ON `users` (`openId`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `weaknesses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`category` text NOT NULL,
	`severity` text DEFAULT 'medium' NOT NULL,
	`detectedFrom` text DEFAULT 'quiz' NOT NULL,
	`details` text,
	`resolved` integer DEFAULT false NOT NULL,
	`createdAt` integer DEFAULT (cast(unixepoch() as integer)) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
