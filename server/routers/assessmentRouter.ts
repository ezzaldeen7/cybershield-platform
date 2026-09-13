import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  getAssessmentQuestions,
  getUserAssessmentStatus,
  submitAssessment,
} from "../services/assessmentService";
import { TRPCError } from "@trpc/server";

export const assessmentRouter = router({
  /**
   * Get user assessment lifecycle status (Pre/Post completion, baseline scores, and prerequisites)
   * Strictly protected procedure (requires authenticated session).
   */
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    return await getUserAssessmentStatus(ctx.user.id);
  }),

  /**
   * Get sanitized assessment questions for initial/final assessment.
   * Public procedure, strictly sanitized to ensure zero answer or explanation leakage before submit.
   */
  getQuestions: publicProcedure
    .input(z.object({ type: z.enum(["initial", "final"]).default("initial") }))
    .query(async ({ input }) => {
      return await getAssessmentQuestions(input.type, true);
    }),

  /**
   * Submit assessment answers
   * Strictly verifies server-side prerequisite gating before accepting final post-assessment.
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
      if (input.type === "final") {
        const status = await getUserAssessmentStatus(ctx.user.id);
        if (!status.canTakePostAssessment) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "لا يمكن خوض التقييم النهائي قبل استيفاء متطلبات المسار (التقييم القبلي، 7 دروس، 7 كويزات، و7 سيناريوهات تفاعلية).",
          });
        }
      }

      return await submitAssessment({
        userId: ctx.user.id,
        type: input.type,
        answers: input.answers,
      });
    }),
});
