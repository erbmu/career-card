import { Router, Response } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { pool } from "../db.js";
import { AuthenticatedRequest, SESSION_DURATION_MS, clearSessionCookie, requireAuth, setSessionCookie } from "../utils/auth.js";

const router = Router();

const baseCredentialsSchema = z.object({
  email: z.string().email("Invalid email address").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
});

const signupSchema = baseCredentialsSchema.extend({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
});

const updateProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  jobTitle: z.string().max(150).optional().nullable(),
  location: z.string().max(150).optional().nullable(),
  bio: z.string().max(1000).optional().nullable(),
});

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(8, "Current password is required").max(100),
  newPassword: z.string().min(8, "New password must be at least 8 characters").max(100),
});

const normalizeOptional = (value?: string | null) => {
  if (typeof value !== "string") {
    return value ?? null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

function mapDbUser(row: any) {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    jobTitle: row.job_title,
    location: row.location,
    bio: row.bio,
  };
}

async function createSession(res: Response, userId: string) {
  const sessionToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await pool.query(
    `INSERT INTO cc_user_sessions (user_id, session_token, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, sessionToken, expiresAt.toISOString()]
  );
  setSessionCookie(res, sessionToken);
}

async function deleteSession(token?: string) {
  if (!token) return;
  await pool.query("DELETE FROM cc_user_sessions WHERE session_token = $1", [token]);
}

router.post("/signup", async (req, res, next) => {
  try {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid credentials" });
    }

    const email = parsed.data.email.toLowerCase();
    const existing = await pool.query("SELECT id FROM cc_users WHERE email = $1", [email]);
    if ((existing.rowCount ?? 0) > 0) {
      return res.status(400).json({ error: "Email is already registered" });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    const result = await pool.query(
      `INSERT INTO cc_users (email, password_hash, first_name, last_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, first_name, last_name, job_title, location, bio`,
      [email, passwordHash, parsed.data.firstName.trim(), parsed.data.lastName.trim()]
    );

    const user = mapDbUser(result.rows[0]);
    await createSession(res, user.id);

    return res.status(201).json({
      user,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const parsed = baseCredentialsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid credentials" });
    }

    const email = parsed.data.email.toLowerCase();
    const result = await pool.query(
      "SELECT id, email, password_hash, first_name, last_name, job_title, location, bio FROM cc_users WHERE email = $1",
      [email]
    );
    if ((result.rowCount ?? 0) === 0) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const user = result.rows[0];
    const isValid = await bcrypt.compare(parsed.data.password, user.password_hash);
    if (!isValid) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    await createSession(res, user.id);

    return res.json({
      user: mapDbUser(user),
    });
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

router.put("/profile", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid profile data" });
    }

    const { firstName, lastName, jobTitle, location, bio } = parsed.data;
    const result = await pool.query(
      `UPDATE cc_users
       SET first_name = $1,
           last_name = $2,
           job_title = $3,
           location = $4,
           bio = $5
       WHERE id = $6
       RETURNING id, email, first_name, last_name, job_title, location, bio`,
      [
        firstName.trim(),
        lastName.trim(),
        normalizeOptional(jobTitle),
        normalizeOptional(location),
        normalizeOptional(bio),
        req.user!.id,
      ]
    );

    if ((result.rowCount ?? 0) === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const updatedUser = mapDbUser(result.rows[0]);
    req.user = updatedUser;

    return res.json({ user: updatedUser });
  } catch (error) {
    next(error);
  }
});

router.put("/password", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const parsed = updatePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid password data" });
    }

    const userResult = await pool.query("SELECT password_hash FROM cc_users WHERE id = $1", [req.user!.id]);
    if ((userResult.rowCount ?? 0) === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const currentHash = userResult.rows[0].password_hash;
    const isValid = await bcrypt.compare(parsed.data.currentPassword, currentHash);
    if (!isValid) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    const newHash = await bcrypt.hash(parsed.data.newPassword, 10);
    await pool.query("UPDATE cc_users SET password_hash = $1 WHERE id = $2", [newHash, req.user!.id]);

    return res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
