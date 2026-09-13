import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  getScenariosList,
  getScenarioByLessonOrId,
  submitScenarioDecision,
  getUserScenariosProgress,
} from "../services/scenarioService";

export const scenarioRouter = router({
  /**
   * scenario.list -> public + general high-level info only
   */
  list: publicProcedure.query(async () => {
    return await getScenariosList();
  }),

  /**
   * scenario.getByLessonId -> public + sanitized scenario/steps/options
   * Strictly zero answer leakage (no isCorrect, no riskScoreDelta, no feedbackAr)
   */
  getByLessonId: publicProcedure
    .input(z.object({ lessonId: z.number() }))
    .query(async ({ input }) => {
      const scenario = await getScenarioByLessonOrId({ lessonId: input.lessonId });
      if (!scenario) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `السيناريو التفاعلي المرتبط بالدرس رقم (${input.lessonId}) غير موجود أو غير متاح حالياً`,
        });
      }
      return scenario;
    }),

  /**
   * scenario.decide -> protected procedure with strict anti-tampering validation
   */
  decide: protectedProcedure
    .input(
      z.object({
        scenarioId: z.number().int(),
        stepNumber: z.number().int().min(1),
        optionId: z.number().int(),
        previousResponses: z
          .array(
            z.object({
              stepNumber: z.number().int().min(1),
              optionId: z.number().int(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await submitScenarioDecision({
        userId: ctx.user.id,
        scenarioId: input.scenarioId,
        stepNumber: input.stepNumber,
        optionId: input.optionId,
        previousResponses: input.previousResponses,
      });
    }),

  /**
   * scenario.getProgress -> protected
   */
  getProgress: protectedProcedure.query(async ({ ctx }) => {
    return await getUserScenariosProgress(ctx.user.id);
  }),
});
