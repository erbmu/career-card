import { Request, Response, NextFunction } from "express";
import { pool } from "../db.js";

export interface AuthenticatedRequest extends Request {
  user?: { id: string; email: string };
  sessionToken?: string;
}

const SESSION_COOKIE = "session_token";
export const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;

export async function getUserForToken(token: string) {
  if (!token) return null;

  const result = await pool.query(
    `SELECT users.id, users.email
     FROM user_sessions
     JOIN users ON users.id = user_sessions.user_id
     WHERE user_sessions.session_token = $1
       AND user_sessions.expires_at > NOW()`,
    [token]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return result.rows[0] as { id: string; email: string };
}

export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.[SESSION_COOKIE];
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const user = await getUserForToken(token);
    if (!user) {
      return res.status(401).json({ error: "Invalid session" });
    }

    req.user = user;
    req.sessionToken = token;
    next();
  } catch (error) {
    next(error);
  }
};

export function setSessionCookie(res: Response, token: string) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_DURATION_MS,
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
