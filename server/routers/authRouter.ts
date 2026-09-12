import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { registerLocalUser, loginLocalUser, revokeSession, hashPassword, verifyPassword, isStrongPassword } from "../services/authService";
import { getClientIp } from "../_core/middleware";
import { getDb } from "../db";
import { users, auditLogs } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const authRouter = router({
  /**
   * Return current authenticated user profile or null
   */
  me: publicProcedure.query(opts => {
    return opts.ctx.user || null;
  }),

  /**
   * Local user registration endpoint
   */
  register: publicProcedure
    .input(
      z.object({
        name: z.string().min(2, "الاسم يجب أن يحتوي على حرفين على الأقل"),
        email: z.string().email("يرجى إدخال بريد إلكتروني صحيح"),
        password: z.string().min(8, "كلمة المرور يجب أن لا تقل عن 8 خانات"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const ipAddress = getClientIp(ctx.req);
      const userAgent = (ctx.req.headers["user-agent"] as string) || "Unknown";

      try {
        const { user, token } = await registerLocalUser({
          name: input.name,
          email: input.email,
          password: input.password,
          ipAddress,
          userAgent,
        });

        // Set session cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        return {
          success: true,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        };
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message || "فشل تسجيل الحساب",
        });
      }
    }),

  /**
   * Local user login endpoint
   */
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email("يرجى إدخال بريد إلكتروني صحيح"),
        password: z.string().min(1, "يرجى إدخال كلمة المرور"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const ipAddress = getClientIp(ctx.req);
      const userAgent = (ctx.req.headers["user-agent"] as string) || "Unknown";

      try {
        const { user, token } = await loginLocalUser({
          email: input.email,
          password: input.password,
          ipAddress,
          userAgent,
        });

        // Set session cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        return {
          success: true,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        };
      } catch (error: any) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: error.message || "بيانات الدخول غير صحيحة",
        });
      }
    }),

  /**
   * User logout procedure
   */
  logout: publicProcedure.mutation(async ({ ctx }) => {
    const cookies = ctx.req.headers.cookie;
    if (cookies) {
      const tokenMatch = cookies.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
      if (tokenMatch && tokenMatch[1]) {
        await revokeSession(tokenMatch[1]);
      }
    }

    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });

    return {
      success: true,
    } as const;
  }),

  /**
   * Password change procedure
   */
  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(8, "كلمة المرور الجديدة يجب أن لا تقل عن 8 خانات"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

      const currentUserList = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
      const currentUser = currentUserList[0];

      if (!currentUser.passwordHash) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "الحساب المسجل عن طريق OAuth لا يملك كلمة مرور للتغيير" });
      }

      const isValidCurrent = await verifyPassword(input.currentPassword, currentUser.passwordHash);
      if (!isValidCurrent) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "كلمة المرور الحالية غير صحيحة" });
      }

      const passCheck = isStrongPassword(input.newPassword);
      if (!passCheck.valid) {
        throw new TRPCError({ code: "BAD_REQUEST", message: passCheck.reason });
      }

      const newPasswordHash = await hashPassword(input.newPassword);
      await db.update(users).set({ passwordHash: newPasswordHash }).where(eq(users.id, ctx.user.id));

      await db.insert(auditLogs).values({
        userId: ctx.user.id,
        action: "PASSWORD_CHANGE",
        eventType: "AUTH_PASSWORD_CHANGE",
        severity: "info",
        ipAddress: getClientIp(ctx.req),
        userAgent: (ctx.req.headers["user-agent"] as string) || "Unknown",
      });

      return { success: true };
    }),
});
