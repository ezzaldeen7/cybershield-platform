import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  getLessonProgress,
  markLessonCompleted,
  getUserLearningOverview,
  getLessonsWithProgress,
} from "../services/learningService";

export const learningRouter = router({
  /**
   * Get learning overview stats for dashboard
   */
  overview: protectedProcedure.query(async ({ ctx }) => {
    return await getUserLearningOverview(ctx.user.id);
  }),

  /**
   * Get user progress for a single lesson
   */
  getProgress: protectedProcedure
    .input(z.object({ lessonId: z.number() }))
    .query(async ({ input, ctx }) => {
      return await getLessonProgress(ctx.user.id, input.lessonId);
    }),

  /**
   * List all lessons with user progress status (publicly accessible, progress attached if authenticated)
   */
  getLessonsWithProgress: publicProcedure
    .input(
      z
        .object({
          categoryId: z.number().optional(),
        })
        .optional()
    )
    .query(async ({ input, ctx }) => {
      const userId = ctx.user?.id;
      return await getLessonsWithProgress({ userId, categoryId: input?.categoryId });
    }),

  /**
   * Record lesson completion (Requires authentication)
   */
  completeLesson: protectedProcedure
    .input(z.object({ lessonId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      return await markLessonCompleted(ctx.user.id, input.lessonId);
    }),
});
