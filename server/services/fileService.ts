import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getDb } from "../db";
import { files } from "../../drizzle/schema";

export const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export const ALLOWED_MIME_TYPES: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export function sanitizeFilename(filename: string): string {
  // Remove path characters to prevent path traversal
  const basename = path.basename(filename);
  return basename.replace(/[^a-zA-Z0-9_.-]/g, "_");
}

export async function processAndSaveFile(params: {
  filename: string;
  mimeType: string;
  buffer: Buffer;
  userId: number;
  lessonId?: number;
}): Promise<{ id: number; filename: string; storedFilename: string; mimeType: string; sizeBytes: number }> {
  const { filename, mimeType, buffer, userId, lessonId } = params;

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new Error("حجم الملف يتجاوز الحد المسموح به (10 ميجابايت)");
  }

  const normalizedMime = mimeType.toLowerCase().trim();
  const extension = ALLOWED_MIME_TYPES[normalizedMime];
  if (!extension) {
    throw new Error("نوع الملف غير مسموح به. المسموح فقط: PDF والفيزيائيات والصور والمعاينات التعليمية");
  }

  const cleanFilename = sanitizeFilename(filename);
  const uuid = crypto.randomUUID();
  const storedFilename = `${uuid}${extension}`;
  const targetPath = path.join(UPLOAD_DIR, storedFilename);

  // Prevent path traversal outside UPLOAD_DIR
  if (!targetPath.startsWith(UPLOAD_DIR)) {
    throw new Error("مسار التخزين غير آمن");
  }

  // Save file to disk
  await fs.promises.writeFile(targetPath, buffer);

  const db = await getDb();
  let fileId = Date.now();

  if (db) {
    try {
      const res = await db.insert(files).values({
        lessonId: lessonId || null,
        filename: cleanFilename,
        storedFilename,
        mimeType: normalizedMime,
        sizeBytes: buffer.length,
        uploadedBy: userId,
      });
      // Retrieve inserted ID if available
      fileId = Number((res as any)[0]?.insertId || fileId);
    } catch (err) {
      console.warn("[FileService] DB insertion fallback:", err);
    }
  }

  return {
    id: fileId,
    filename: cleanFilename,
    storedFilename,
    mimeType: normalizedMime,
    sizeBytes: buffer.length,
  };
}
