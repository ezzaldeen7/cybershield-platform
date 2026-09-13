import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getUserPersonalizedRecommendations,
  getUserWeaknesses,
  resolveWeakness,
} from "../services/recommendationService";

export const recommendationRouter = router({
  /**
   * Get personalized user learning recommendations
   */
  getUserRecommendations: protectedProcedure.query(async ({ ctx }) => {
    return await getUserPersonalizedRecommendations(ctx.user.id);
  }),

  /**
   * Get user recorded weaknesses with strict User Isolation
   */
  getUserWeaknesses: protectedProcedure
    .input(
      z
        .object({
          includeResolved: z.boolean().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      return await getUserWeaknesses(ctx.user.id, {
        includeResolved: input?.includeResolved ?? false,
      });
    }),

  /**
   * Mark a weakness as reviewed/resolved by the user
   * STRICT USER ISOLATION: A user cannot view or resolve another user's weakness.
   *
   * NOTE: resolved=true means user deliberate acknowledgment and review,
   * NOT scientific proof that the underlying vulnerability is eliminated.
   */
  resolveWeakness: protectedProcedure
    .input(
      z.object({
        weaknessId: z.number().int().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await resolveWeakness(ctx.user.id, input.weaknessId);
      if (!result.success || !result.weakness) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "نقطة الضعف غير موجودة أو لا تملك صلاحية الوصول إليها.",
        });
      }
      return result.weakness;
    }),
});
