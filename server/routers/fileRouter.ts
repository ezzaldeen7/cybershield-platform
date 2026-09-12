import { z } from "zod";
import { protectedProcedure, instructorProcedure, router } from "../_core/trpc";
import { processAndSaveFile, ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from "../services/fileService";
import { TRPCError } from "@trpc/server";
import { getClientIp } from "../_core/middleware";
import { getDb } from "../db";
import { auditLogs } from "../../drizzle/schema";

export const fileRouter = router({
  /**
   * Upload educational media/file (Instructor/Admin required)
   */
  upload: instructorProcedure
    .input(
      z.object({
        filename: z.string().min(1, "اسم الملف مطلوب"),
        mimeType: z.string().min(1, "نوع الملف مطلوب"),
        base64Data: z.string().min(1, "بيانات الملف مطلوبة"),
        lessonId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const buffer = Buffer.from(input.base64Data, "base64");
        
        if (buffer.length > MAX_FILE_SIZE_BYTES) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "حجم الملف يتجاوز الحد المسموح به (10 ميجابايت)" });
        }

        const saved = await processAndSaveFile({
          filename: input.filename,
          mimeType: input.mimeType,
          buffer,
          userId: ctx.user.id,
          lessonId: input.lessonId,
        });

        // Audit Log
        const db = await getDb();
        if (db) {
          await db.insert(auditLogs).values({
            userId: ctx.user.id,
            action: "FILE_UPLOAD",
            eventType: "SECURITY_FILE_UPLOAD",
            severity: "info",
            detailsJson: JSON.stringify({ filename: saved.filename, storedFilename: saved.storedFilename, size: saved.sizeBytes }),
            ipAddress: getClientIp(ctx.req),
            userAgent: (ctx.req.headers["user-agent"] as string) || "Unknown",
          });
        }

        return saved;
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message || "فشل رفع الملف",
        });
      }
    }),
});
