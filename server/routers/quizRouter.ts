import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  getQuizQuestionsList,
  submitQuizAnswers,
  getQuizByLessonOrId,
  getUserQuizzesProgress,
} from "../services/quizService";

export const quizRouter = router({
  /**
   * Get quiz and sanitized questions by lesson ID
   */
  getByLessonId: publicProcedure
    .input(z.object({ lessonId: z.number() }))
    .query(async ({ input }) => {
      const quiz = await getQuizByLessonOrId({ lessonId: input.lessonId });
      const questions = await getQuizQuestionsList(quiz.id, true);
      return { quiz, questions };
    }),

  /**
   * Get questions for a quiz (sanitized options without exposing correct index)
   */
  getQuestions: publicProcedure
    .input(z.object({ quizId: z.number().optional() }))
    .query(async ({ input }) => {
      const quizId = input.quizId || 1;
      return await getQuizQuestionsList(quizId, true);
    }),

  /**
   * Get overall quiz completion progress for user
   */
  getProgress: publicProcedure.query(async ({ ctx }) => {
    return await getUserQuizzesProgress(ctx.user?.id);
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
