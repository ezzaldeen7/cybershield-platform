import { z } from "zod";
import { publicProcedure, instructorProcedure, router } from "../_core/trpc";
import {
  getCategories,
  listLessons,
  getLessonByIdOrSlug,
  createLesson,
  updateLesson,
  deleteLesson,
  OFFICIAL_LESSON_IDS,
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
        mineOnly: z.boolean().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const userRole = ctx.user?.role;
      const authorId = input.mineOnly && ctx.user ? ctx.user.id : undefined;
      return await listLessons({
        userRole,
        categoryId: input.categoryId,
        difficulty: input.difficulty,
        status: input.status,
        search: input.search,
        page: input.page,
        limit: input.limit,
        authorId,
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
        order: z.number().optional(),
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
        order: z.number().optional(),
        learningObjectives: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;

      const lesson = await getLessonByIdOrSlug(id, ctx.user.role);
      if (!lesson) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الدرس غير موجود" });
      }

      const isOfficial = (OFFICIAL_LESSON_IDS as readonly number[]).includes(id) || lesson.createdBy === null;

      if (ctx.user.role !== "admin") {
        if (isOfficial) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "لا يمكن للمدرس تعديل الدروس الرسمية المعتمدة للمنظومة",
          });
        }

        if (lesson.createdBy !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "غير مصرح لك بتعديل هذا الدرس؛ يمكنك تعديل دروسك الخاصة فقط",
          });
        }
      }

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
      const lesson = await getLessonByIdOrSlug(input.id, ctx.user.role);
      if (!lesson) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الدرس غير موجود" });
      }

      const isOfficial = (OFFICIAL_LESSON_IDS as readonly number[]).includes(input.id) || lesson.createdBy === null;

      if (ctx.user.role !== "admin") {
        if (isOfficial) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "لا يمكن للمدرس أرشفة الدروس الرسمية المعتمدة للمنظومة",
          });
        }

        if (lesson.createdBy !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "غير مصرح لك بأرشفة هذا الدرس؛ يمكنك أرشفة دروسك الخاصة فقط",
          });
        }
      }

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

  /**
   * Delete lesson alias for archive (Instructor & Admin only)
   */
  delete: instructorProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const lesson = await getLessonByIdOrSlug(input.id, ctx.user.role);
      if (!lesson) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الدرس غير موجود" });
      }

      const isOfficial = (OFFICIAL_LESSON_IDS as readonly number[]).includes(input.id) || lesson.createdBy === null;

      if (ctx.user.role !== "admin") {
        if (isOfficial) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "لا يمكن للمدرس حذف أو أرشفة الدروس الرسمية المعتمدة للمنظومة",
          });
        }

        if (lesson.createdBy !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "غير مصرح لك بحذف هذا الدرس؛ يمكنك حذف دروسك الخاصة فقط",
          });
        }
      }

      const success = await deleteLesson(input.id);
      if (!success) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "تعذر حذف/أرشفة الدرس" });
      }

      const db = await getDb();
      if (db) {
        await db.insert(auditLogs).values({
          userId: ctx.user.id,
          action: "DELETE_LESSON",
          eventType: "CMS_DELETE",
          severity: "warning",
          detailsJson: JSON.stringify({ lessonId: input.id }),
          ipAddress: getClientIp(ctx.req),
          userAgent: (ctx.req.headers["user-agent"] as string) || "Unknown",
        });
      }

      return { success: true };
    }),
});
