import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { analyzeUrlStatic, analyzeMessageStatic } from "../services/analyzerService";

export const analyzerRouter = router({
  /**
   * Analyze URL statically (Safe analysis without external connection)
   */
  analyzeUrl: publicProcedure
    .input(z.object({ url: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return await analyzeUrlStatic(input.url, ctx.user?.id);
    }),

  /**
   * Analyze Suspicious Message statically
   */
  analyzeMessage: publicProcedure
    .input(z.object({ message: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return await analyzeMessageStatic(input.message, ctx.user?.id);
    }),
});
