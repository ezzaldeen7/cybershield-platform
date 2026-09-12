import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getLessonProgress, markLessonCompleted, getUserLearningOverview } from "../services/learningService";

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
   * Record lesson completion
   */
  completeLesson: protectedProcedure
    .input(z.object({ lessonId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      return await markLessonCompleted(ctx.user.id, input.lessonId);
    }),
});
