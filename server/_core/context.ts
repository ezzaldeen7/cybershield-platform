import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { COOKIE_NAME } from "@shared/const";
import { getUserBySessionToken } from "../services/authService";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    // 1. Check local session cookie or auth header
    const cookies = opts.req.headers.cookie;
    let sessionToken: string | null = null;

    if (cookies) {
      const match = cookies.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
      if (match && match[1]) {
        sessionToken = match[1];
      }
    }

    if (!sessionToken && opts.req.headers.authorization) {
      const authHeader = opts.req.headers.authorization;
      if (authHeader.startsWith("Bearer ")) {
        sessionToken = authHeader.substring(7).trim();
      }
    }

    if (sessionToken) {
      user = await getUserBySessionToken(sessionToken);
    }

    // 2. Fallback to OAuth / Manus SDK authentication
    if (!user) {
      user = await sdk.authenticateRequest(opts.req);
    }
  } catch (error) {
    // Authentication is optional for public procedures
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
