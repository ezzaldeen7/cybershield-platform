import { z } from "zod";
import { publicProcedure, instructorProcedure, router } from "../_core/trpc";
import {
  getCategories,
  listLessons,
  getLessonByIdOrSlug,
  createLesson,
  updateLesson,
  deleteLesson,
} from "../services/contentService";
import { TRPCError } from "@trpc/server";
import { getClientIp } from "../_core/middleware";
import { getDb } from "../db";
import { auditLogs } from "../../drizzle/schema";

export const contentRouter = router({
  /**
   * Get all lesson categories
   */
  categories: publicProcedure.query(async () => {
    return await getCategories();
  }),

  /**
   * List lessons with filtering, searching, and status security
   */
  list: publicProcedure
    .input(
      z.object({
        categoryId: z.number().optional(),
        difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
        status: z.enum(["draft", "published", "archived"]).optional(),
        search: z.string().optional(),
        page: z.number().optional(),
        limit: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const userRole = ctx.user?.role;
      return await listLessons({
        userRole,
        categoryId: input.categoryId,
        difficulty: input.difficulty,
        status: input.status,
        search: input.search,
        page: input.page,
        limit: input.limit,
      });
    }),

  /**
   * Get single lesson details by ID or Slug
   */
  get: publicProcedure
    .input(
      z.object({
        idOrSlug: z.union([z.string(), z.number()]),
      })
    )
    .query(async ({ input, ctx }) => {
      const userRole = ctx.user?.role;
      const lesson = await getLessonByIdOrSlug(input.idOrSlug, userRole);
      if (!lesson) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الدرس المطلوب غير موجود أو غير متاح للعرض",
        });
      }
      return lesson;
    }),

  /**
   * Create lesson (Instructor & Admin only)
   */
  create: instructorProcedure
    .input(
      z.object({
        title: z.string().min(2, "عنوان الدرس مطلوب"),
        titleAr: z.string().min(2, "العنوان بالعربية مطلوب"),
        summary: z.string().optional(),
        summaryAr: z.string().optional(),
        content: z.string().min(10, "محتوى الدرس غير مكتمل"),
        contentAr: z.string().min(10, "المحتوى بالعربية غير مكتمل"),
        categoryId: z.number().optional(),
        difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
        durationMinutes: z.number().optional(),
        status: z.enum(["draft", "published", "archived"]).optional(),
        learningObjectives: z.array(z.string()).optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const created = await createLesson({
        ...input,
        createdBy: ctx.user.id,
      });

      // Audit Log
      const db = await getDb();
      if (db) {
        await db.insert(auditLogs).values({
          userId: ctx.user.id,
          action: "CREATE_LESSON",
          eventType: "CMS_CREATE",
          severity: "info",
          detailsJson: JSON.stringify({ lessonId: created.id, title: created.titleAr }),
          ipAddress: getClientIp(ctx.req),
          userAgent: (ctx.req.headers["user-agent"] as string) || "Unknown",
        });
      }

      return created;
    }),

  /**
   * Update lesson (Instructor & Admin only)
   */
  update: instructorProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        titleAr: z.string().optional(),
        summary: z.string().optional(),
        summaryAr: z.string().optional(),
        content: z.string().optional(),
        contentAr: z.string().optional(),
        categoryId: z.number().optional(),
        difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
        durationMinutes: z.number().optional(),
        status: z.enum(["draft", "published", "archived"]).optional(),
        learningObjectives: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const updated = await updateLesson(id, data);

      const db = await getDb();
      if (db) {
        await db.insert(auditLogs).values({
          userId: ctx.user.id,
          action: "UPDATE_LESSON",
          eventType: "CMS_UPDATE",
          severity: "info",
          detailsJson: JSON.stringify({ lessonId: id, status: updated.status }),
          ipAddress: getClientIp(ctx.req),
          userAgent: (ctx.req.headers["user-agent"] as string) || "Unknown",
        });
      }

      return updated;
    }),

  /**
   * Archive / Delete lesson (Instructor & Admin only)
   */
  archive: instructorProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const success = await deleteLesson(input.id);
      if (!success) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "تعذر أرشفة الدرس" });
      }

      const db = await getDb();
      if (db) {
        await db.insert(auditLogs).values({
          userId: ctx.user.id,
          action: "ARCHIVE_LESSON",
          eventType: "CMS_ARCHIVE",
          severity: "warning",
          detailsJson: JSON.stringify({ lessonId: input.id }),
          ipAddress: getClientIp(ctx.req),
          userAgent: (ctx.req.headers["user-agent"] as string) || "Unknown",
        });
      }

      return { success: true };
    }),
});
