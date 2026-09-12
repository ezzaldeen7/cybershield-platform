import { protectedProcedure, router } from "../_core/trpc";
import { getUserPersonalizedRecommendations } from "../services/recommendationService";

export const recommendationRouter = router({
  /**
   * Get personalized user learning recommendations
   */
  getUserRecommendations: protectedProcedure.query(async ({ ctx }) => {
    return await getUserPersonalizedRecommendations(ctx.user.id);
  }),
});
