import { Router } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { pool } from '../db.js';
import { careerCardDataSchema } from '../../../src/shared/career-card-schema.js';
import { AuthenticatedRequest, requireAuth } from '../utils/auth.js';

const router = Router();

const createCardSchema = z.object({
  cardData: careerCardDataSchema,
});

const updateCardSchema = z.object({
  cardData: careerCardDataSchema,
});

router.post('/', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const parsed = createCardSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Invalid request body' });
    }

    const editToken = randomUUID();
    const { cardData } = parsed.data;
    const userId = req.user!.id;

    const existing = await pool.query(
      `SELECT id, edit_token FROM cc_career_cards WHERE user_id = $1`,
      [userId]
    );

    if ((existing.rowCount ?? 0) > 0) {
      return res.json({ id: existing.rows[0].id, editToken: existing.rows[0].edit_token });
    }

    const result = await pool.query(
      `INSERT INTO cc_career_cards (user_id, card_data, edit_token) VALUES ($1, $2, $3) RETURNING id, edit_token`,
      [userId, cardData, editToken]
    );

    const inserted = result.rows[0];

    return res.status(201).json({ id: inserted.id, editToken: inserted.edit_token });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const idResult = z.string().uuid({ message: 'Invalid card id' }).safeParse(req.params.id);
    if (!idResult.success) {
      return res.status(400).json({ error: 'Invalid card id' });
    }

    const parsed = updateCardSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Invalid request body' });
    }

    const { cardData } = parsed.data;

    const result = await pool.query(
      `UPDATE cc_career_cards SET card_data = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3`,
      [cardData, idResult.data, req.user!.id]
    );

    if ((result.rowCount ?? 0) === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }

    return res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.get('/me', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, card_data FROM cc_career_cards WHERE user_id = $1`,
      [req.user!.id]
    );

    if (result.rowCount === 0) {
      return res.json({ id: null, cardData: null });
    }

    return res.json({ id: result.rows[0].id, cardData: result.rows[0].card_data });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const idResult = z.string().uuid({ message: 'Invalid card id' }).safeParse(req.params.id);
    if (!idResult.success) {
      return res.status(400).json({ error: 'Invalid card id' });
    }

    const result = await pool.query(
      `SELECT card_data, user_id FROM cc_career_cards WHERE id = $1`,
      [idResult.data]
    );

    if ((result.rowCount ?? 0) === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }

    if (result.rows[0].user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized to view this card' });
    }

    return res.json({ cardData: result.rows[0].card_data });
  } catch (error) {
    next(error);
  }
});

export default router;
