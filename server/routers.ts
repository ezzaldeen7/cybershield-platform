import { systemRouter } from "./_core/systemRouter";
import { router } from "./_core/trpc";
import { authRouter } from "./routers/authRouter";
import { contentRouter } from "./routers/contentRouter";
import { fileRouter } from "./routers/fileRouter";
import { learningRouter } from "./routers/learningRouter";
import { quizRouter } from "./routers/quizRouter";
import { scenarioRouter } from "./routers/scenarioRouter";
import { assessmentRouter } from "./routers/assessmentRouter";
import { analyzerRouter } from "./routers/analyzerRouter";
import { recommendationRouter } from "./routers/recommendationRouter";
import { adminRouter } from "./routers/adminRouter";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  content: contentRouter,
  file: fileRouter,
  learning: learningRouter,
  quiz: quizRouter,
  scenario: scenarioRouter,
  assessment: assessmentRouter,
  analyzer: analyzerRouter,
  recommendation: recommendationRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
