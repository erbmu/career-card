import { Request, Response, NextFunction } from "express";
import { pool } from "../db.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    jobTitle?: string | null;
    location?: string | null;
    bio?: string | null;
  };
  sessionToken?: string;
}

const SESSION_COOKIE = "session_token";
export const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;

export async function getUserForToken(token: string) {
  if (!token) return null;

  const result = await pool.query(
    `SELECT cu.id, cu.email, cu.first_name, cu.last_name, cu.job_title, cu.location, cu.bio
     FROM cc_user_sessions cus
     JOIN cc_users cu ON cu.id = cus.user_id
     WHERE cus.session_token = $1
       AND cus.expires_at > NOW()`,
    [token]
  );

  if (result.rowCount === 0) {
    return null;
  }

  const user = result.rows[0];
  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    jobTitle: user.job_title,
    location: user.location,
    bio: user.bio,
  };
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
