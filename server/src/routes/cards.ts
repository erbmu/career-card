import { Router } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { pool } from '../db.js';
import { careerCardDataSchema } from '../../../src/shared/career-card-schema.js';

const router = Router();

const createCardSchema = z.object({
  cardData: careerCardDataSchema,
});

const updateCardSchema = z.object({
  cardData: careerCardDataSchema,
  editToken: z.string().min(32, 'Missing edit token'),
});

router.post('/', async (req, res, next) => {
  try {
    const parsed = createCardSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Invalid request body' });
    }

    const editToken = randomUUID();
    const { cardData } = parsed.data;

    const result = await pool.query(
      `INSERT INTO career_cards (card_data, edit_token) VALUES ($1, $2) RETURNING id`,
      [cardData, editToken]
    );

    const id = result.rows[0]?.id;

    return res.status(201).json({ id, editToken });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const idResult = z.string().uuid({ message: 'Invalid card id' }).safeParse(req.params.id);
    if (!idResult.success) {
      return res.status(400).json({ error: 'Invalid card id' });
    }

    const parsed = updateCardSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Invalid request body' });
    }

    const { cardData, editToken } = parsed.data;

    const result = await pool.query(
      `UPDATE career_cards SET card_data = $1, updated_at = NOW() WHERE id = $2 AND edit_token = $3`,
      [cardData, idResult.data, editToken]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Card not found or edit token invalid' });
    }

    return res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const idResult = z.string().uuid({ message: 'Invalid card id' }).safeParse(req.params.id);
    if (!idResult.success) {
      return res.status(400).json({ error: 'Invalid card id' });
    }

    const result = await pool.query(
      `SELECT card_data FROM career_cards WHERE id = $1`,
      [idResult.data]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }

    return res.json({ cardData: result.rows[0].card_data });
  } catch (error) {
    next(error);
  }
});

export default router;
