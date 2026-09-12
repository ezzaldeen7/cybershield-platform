import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getQuizQuestionsList, submitQuizAnswers } from "../services/quizService";

export const quizRouter = router({
  /**
   * Get questions for a quiz
   */
  getQuestions: publicProcedure
    .input(z.object({ quizId: z.number().optional() }))
    .query(async ({ input }) => {
      return await getQuizQuestionsList(input.quizId || 1);
    }),

  /**
   * Submit quiz answers & get instant graded results with explanations
   */
  submit: protectedProcedure
    .input(
      z.object({
        quizId: z.number().default(1),
        answers: z.array(
          z.object({
            questionId: z.number(),
            selectedOptionIndex: z.number(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await submitQuizAnswers({
        userId: ctx.user.id,
        quizId: input.quizId,
        answers: input.answers,
      });
    }),
});
