import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { registerLocalUser, loginLocalUser, revokeSession, createSession, hashPassword, verifyPassword, isStrongPassword } from "../services/authService";
import { getClientIp } from "../_core/middleware";
import { checkLoginRateLimit, rateLimiter } from "../_core/rateLimit";
import { getDb } from "../db";
import { users, sessions, auditLogs } from "../../drizzle/schema";
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
            mustChangePassword: user.mustChangePassword,
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

      // Rate limit check: max 5 failed attempts per 15 minutes per email/IP
      const isAllowed = checkLoginRateLimit(input.email, ipAddress);
      if (!isAllowed) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "تم تجاوز الحد المسموح به لمحاولات الدخول (5 محاولات). يرجى الانتظار 15 دقيقة قبل المحاولة مرة أخرى.",
        });
      }

      try {
        const { user, token } = await loginLocalUser({
          email: input.email,
          password: input.password,
          ipAddress,
          userAgent,
        });

        // Reset rate limiter on successful login
        rateLimiter.reset(`login:${input.email.trim().toLowerCase()}:${ipAddress}`);

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
            mustChangePassword: user.mustChangePassword,
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
      await db
        .update(users)
        .set({
          passwordHash: newPasswordHash,
          mustChangePassword: false,
          updatedAt: new Date(),
        })
        .where(eq(users.id, ctx.user.id));

      // Revoke all previous sessions of this user across all devices for security
      await db.delete(sessions).where(eq(sessions.userId, ctx.user.id));

      // Create a fresh session for the current client
      const freshToken = await createSession(
        ctx.user.id,
        getClientIp(ctx.req),
        (ctx.req.headers["user-agent"] as string) || "Unknown"
      );
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, freshToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      await db.insert(auditLogs).values({
        userId: ctx.user.id,
        action: "PASSWORD_CHANGE",
        eventType: "AUTH_PASSWORD_CHANGE",
        severity: "info",
        detailsJson: JSON.stringify({ email: ctx.user.email }),
        ipAddress: getClientIp(ctx.req),
        userAgent: (ctx.req.headers["user-agent"] as string) || "Unknown",
      });

      return { success: true };
    }),
});
