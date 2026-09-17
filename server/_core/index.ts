import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import {
  securityHeadersMiddleware,
  corsMiddleware,
  rateLimitMiddleware,
  requestLoggingMiddleware,
} from "./middleware";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

process.on("uncaughtException", (err) => {
  console.error("[Process] Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("[Process] Unhandled Rejection:", reason);
});

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Security controls
  app.use(securityHeadersMiddleware);
  app.use(corsMiddleware);

  // Health check endpoint for cloud hosting providers (Render, etc.)
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "cybershield", timestamp: new Date().toISOString() });
  });

  app.get("/api/test-native", (_req, res) => {
    res.json({ ok: true, versions: process.versions, cwd: process.cwd() });
  });

  app.get("/api/test-file", async (_req, res) => {
    try {
      const fs = await import("fs");
      const path = await import("path");
      const p = path.resolve("./data/cybershield.db");
      const exists = fs.existsSync(p);
      let stat = null;
      if (exists) {
        stat = fs.statSync(p);
      }
      res.json({ ok: true, path: p, exists, size: stat?.size, mode: stat?.mode });
    } catch (e: any) {
      res.json({ ok: false, error: e?.message });
    }
  });

  app.get("/api/test-import", async (_req, res) => {
    try {
      const b = await import("better-sqlite3");
      res.json({ ok: true, type: typeof b.default });
    } catch (e: any) {
      res.json({ ok: false, error: e?.message, stack: e?.stack });
    }
  });

  app.get("/api/test-open", async (_req, res) => {
    try {
      const b = await import("better-sqlite3");
      const Database = b.default;
      const memDb = new Database(":memory:");
      memDb.prepare("CREATE TABLE test (id INT)").run();
      res.json({ ok: true, memoryDb: "works" });
    } catch (e: any) {
      res.json({ ok: false, error: e?.message, stack: e?.stack });
    }
  });

  app.get("/api/test-db", async (_req, res) => {
    try {
      const { getDb } = await import("../db");
      const { lessons } = await import("../../drizzle/schema");
      const db = await getDb();
      if (!db) return res.json({ ok: false, error: "no db" });
      const rows = await db.select().from(lessons).limit(3);
      return res.json({ ok: true, count: rows.length, first: rows[0]?.titleAr });
    } catch (e: any) {
      return res.status(500).json({ ok: false, error: e?.message, stack: e?.stack });
    }
  });

  app.get("/api/test-lessons", async (_req, res) => {
    try {
      const { getLessonsWithProgress } = await import("../services/learningService");
      const data = await getLessonsWithProgress({});
      return res.json({ ok: true, total: data.totalLessons, count: data.lessons.length });
    } catch (e: any) {
      return res.status(500).json({ ok: false, error: e?.message, stack: e?.stack });
    }
  });

  app.use('/api', rateLimitMiddleware);
  app.use(requestLoggingMiddleware);
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError({ error, path }) {
        console.error(`[tRPC Error] on path '${path}':`, error);
      },
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Direct port listening in production, fallback to findAvailablePort in local dev
  let port: number;
  if (process.env.PORT) {
    port = parseInt(process.env.PORT, 10);
  } else {
    port = await findAvailablePort(3000);
  }

  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${port}/`);
  });
}

startServer().catch((err) => {
  console.error("[Server] Fatal error on start:", err);
});
