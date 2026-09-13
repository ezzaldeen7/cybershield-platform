import { z } from "zod";
import { protectedProcedure, publicProcedure, instructorProcedure, router } from "../_core/trpc";
import {
  getQuizQuestionsList,
  submitQuizAnswers,
  getQuizByLessonOrId,
  getUserQuizzesProgress,
  listQuizzes,
  getQuizWithQuestionsForInstructor,
  createQuiz,
  updateQuiz,
  archiveQuiz,
  addQuizQuestion,
  updateQuizQuestion,
  deleteQuizQuestion,
} from "../services/quizService";
import { TRPCError } from "@trpc/server";

export const quizRouter = router({
  /**
   * Get quiz and sanitized questions by lesson ID
   */
  getByLessonId: publicProcedure
    .input(z.object({ lessonId: z.number() }))
    .query(async ({ input, ctx }) => {
      const quiz = await getQuizByLessonOrId({ lessonId: input.lessonId, userRole: ctx.user?.role });
      const questions = await getQuizQuestionsList(quiz.id, true);
      return { quiz, questions };
    }),

  /**
   * Get questions for a quiz (sanitized options without exposing correct index)
   */
  getQuestions: publicProcedure
    .input(z.object({ quizId: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      const quizId = input.quizId || 1;
      const quiz = await getQuizByLessonOrId({ quizId, userRole: ctx.user?.role });
      return await getQuizQuestionsList(quiz.id, true);
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

  // ==========================================
  // INSTRUCTOR & ADMIN QUIZ MANAGEMENT
  // ==========================================

  /**
   * List quizzes with counts and metadata (Instructor & Admin)
   */
  list: instructorProcedure
    .input(
      z.object({
        mineOnly: z.boolean().optional(),
        status: z.enum(["draft", "published", "archived"]).optional(),
        search: z.string().optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      return await listQuizzes({
        userRole: ctx.user.role,
        userId: ctx.user.id,
        mineOnly: input?.mineOnly,
        status: input?.status,
        search: input?.search,
      });
    }),

  /**
   * Get single quiz and full questions for management (Instructor & Admin)
   */
  getManageQuiz: instructorProcedure
    .input(z.object({ quizId: z.number() }))
    .query(async ({ input, ctx }) => {
      try {
        return await getQuizWithQuestionsForInstructor(input.quizId, ctx.user.role, ctx.user.id);
      } catch (err: any) {
        throw new TRPCError({ code: "FORBIDDEN", message: err.message || "غير مصرح لك بإدارة هذا الاختبار" });
      }
    }),

  /**
   * Create a new quiz (starts as draft by default)
   */
  create: instructorProcedure
    .input(
      z.object({
        titleAr: z.string().min(2, "عنوان الاختبار بالعربية مطلوب"),
        titleEn: z.string().optional(),
        lessonId: z.number().optional(),
        passScorePercentage: z.number().min(10).max(100).default(70),
        status: z.enum(["draft", "published"]).default("draft"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await createQuiz({
        ...input,
        createdBy: ctx.user.id,
      });
    }),

  /**
   * Update quiz metadata and status
   */
  update: instructorProcedure
    .input(
      z.object({
        id: z.number(),
        titleAr: z.string().optional(),
        titleEn: z.string().optional(),
        lessonId: z.number().optional(),
        passScorePercentage: z.number().min(10).max(100).optional(),
        status: z.enum(["draft", "published", "archived"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...params } = input;
      try {
        return await updateQuiz(id, params, ctx.user.role, ctx.user.id);
      } catch (err: any) {
        throw new TRPCError({ code: "FORBIDDEN", message: err.message || "تعذر تعديل الاختبار" });
      }
    }),

  /**
   * Archive / Delete quiz (logical soft-archiving)
   */
  archive: instructorProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        await archiveQuiz(input.id, ctx.user.role, ctx.user.id);
        return { success: true };
      } catch (err: any) {
        throw new TRPCError({ code: "FORBIDDEN", message: err.message || "تعذر أرشفة الاختبار" });
      }
    }),

  delete: instructorProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        await archiveQuiz(input.id, ctx.user.role, ctx.user.id);
        return { success: true };
      } catch (err: any) {
        throw new TRPCError({ code: "FORBIDDEN", message: err.message || "تعذر حذف الاختبار" });
      }
    }),

  /**
   * Add a multiple-choice question to a quiz
   */
  addQuestion: instructorProcedure
    .input(
      z.object({
        quizId: z.number(),
        questionAr: z.string().min(5, "نص السؤال بالعربية مطلوب"),
        questionEn: z.string().optional(),
        options: z.array(z.string().min(1, "الخيار لا يمكن أن يكون فارغاً")).min(2, "يجب إدخال خيارين على الأقل"),
        correctOptionIndex: z.number().min(0),
        explanationAr: z.string().min(5, "التفسير التعليمي للإجابة مطلوب"),
        difficulty: z.enum(["beginner", "intermediate", "advanced", "medium"]).default("medium"),
        order: z.number().default(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (input.correctOptionIndex >= input.options.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "مؤشر الإجابة الصحيحة خارج نطاق الخيارات" });
      }
      try {
        return await addQuizQuestion(input, ctx.user.role, ctx.user.id);
      } catch (err: any) {
        throw new TRPCError({ code: "FORBIDDEN", message: err.message || "تعذر إضافة السؤال" });
      }
    }),

  /**
   * Update a question in a quiz
   */
  updateQuestion: instructorProcedure
    .input(
      z.object({
        questionId: z.number(),
        questionAr: z.string().optional(),
        questionEn: z.string().optional(),
        options: z.array(z.string().min(1)).min(2).optional(),
        correctOptionIndex: z.number().min(0).optional(),
        explanationAr: z.string().optional(),
        difficulty: z.enum(["beginner", "intermediate", "advanced", "medium"]).optional(),
        order: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (input.options && input.correctOptionIndex !== undefined && input.correctOptionIndex >= input.options.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "مؤشر الإجابة الصحيحة خارج نطاق الخيارات" });
      }
      try {
        return await updateQuizQuestion(input, ctx.user.role, ctx.user.id);
      } catch (err: any) {
        throw new TRPCError({ code: "FORBIDDEN", message: err.message || "تعذر تعديل السؤال" });
      }
    }),

  /**
   * Delete a question from a quiz
   */
  deleteQuestion: instructorProcedure
    .input(z.object({ questionId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        await deleteQuizQuestion(input.questionId, ctx.user.role, ctx.user.id);
        return { success: true };
      } catch (err: any) {
        throw new TRPCError({ code: "FORBIDDEN", message: err.message || "تعذر حذف السؤال" });
      }
    }),
});
