import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getScenariosList, submitScenarioDecision } from "../services/scenarioService";

export const scenarioRouter = router({
  /**
   * List interactive scenarios
   */
  list: publicProcedure.query(async () => {
    return await getScenariosList();
  }),

  /**
   * Submit decision for a scenario
   */
  decide: protectedProcedure
    .input(
      z.object({
        scenarioId: z.number(),
        optionIndex: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await submitScenarioDecision({
        userId: ctx.user.id,
        scenarioId: input.scenarioId,
        optionIndex: input.optionIndex,
      });
    }),
});
