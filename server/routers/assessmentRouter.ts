import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getAssessmentQuestions, submitAssessment } from "../services/assessmentService";

export const assessmentRouter = router({
  /**
   * Get questions for initial/final assessment
   */
  getQuestions: publicProcedure
    .input(z.object({ type: z.enum(["initial", "final"]).default("initial") }))
    .query(async ({ input }) => {
      return await getAssessmentQuestions(input.type);
    }),

  /**
   * Submit assessment answers
   */
  submit: protectedProcedure
    .input(
      z.object({
        type: z.enum(["initial", "final"]).default("initial"),
        answers: z.array(
          z.object({
            questionId: z.number(),
            selectedOptionIndex: z.number(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await submitAssessment({
        userId: ctx.user.id,
        type: input.type,
        answers: input.answers,
      });
    }),
});
