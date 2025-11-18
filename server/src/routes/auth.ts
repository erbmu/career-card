import { Router, Response } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { pool } from "../db.js";
import { AuthenticatedRequest, SESSION_DURATION_MS, clearSessionCookie, requireAuth, setSessionCookie } from "../utils/auth.js";

const router = Router();

const credentialsSchema = z.object({
  email: z.string().email("Invalid email address").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
});

async function createSession(res: Response, userId: string) {
  const sessionToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await pool.query(
    `INSERT INTO user_sessions (user_id, session_token, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, sessionToken, expiresAt.toISOString()]
  );
  setSessionCookie(res, sessionToken);
}

async function deleteSession(token?: string) {
  if (!token) return;
  await pool.query("DELETE FROM user_sessions WHERE session_token = $1", [token]);
}

router.post("/signup", async (req, res, next) => {
  try {
    const parsed = credentialsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid credentials" });
    }

    const email = parsed.data.email.toLowerCase();
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if ((existing.rowCount ?? 0) > 0) {
      return res.status(400).json({ error: "Email is already registered" });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       RETURNING id, email`,
      [email, passwordHash]
    );

    const user = result.rows[0];
    await createSession(res, user.id);

    return res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const parsed = credentialsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid credentials" });
    }

    const email = parsed.data.email.toLowerCase();
    const result = await pool.query("SELECT id, email, password_hash FROM users WHERE email = $1", [email]);
    if ((result.rowCount ?? 0) === 0) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const user = result.rows[0];
    const isValid = await bcrypt.compare(parsed.data.password, user.password_hash);
    if (!isValid) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    await createSession(res, user.id);

    return res.json({ user: { id: user.id, email: user.email } });
  } catch (error) {
    next(error);
  }
});

router.post("/logout", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    await deleteSession(req.sessionToken ?? req.cookies?.session_token);
    clearSessionCookie(res);
    return res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireAuth, (req: AuthenticatedRequest, res) => {
  return res.json({ user: req.user });
});

export default router;
