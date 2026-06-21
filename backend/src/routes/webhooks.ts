import { Router, Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { db } from '../db/client';
import { authenticate } from '../middleware/auth';

const router = Router();

const CreateWebhookSchema = z.object({
  url: z.string().url().max(512),
  events: z
    .array(z.enum(['issued', 'activated', 'revoked', 'renewed', 'transferred']))
    .min(1),
});

/**
 * GET /api/v1/webhooks
 */
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const webhooks = await db('webhooks')
      .join('users', 'webhooks.user_id', 'users.id')
      .where('users.id', req.user!.userId)
      .select('webhooks.id', 'webhooks.url', 'webhooks.events', 'webhooks.is_active', 'webhooks.created_at');

    res.json({ data: webhooks });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/webhooks
 */
router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = CreateWebhookSchema.parse(req.body);
    const secret = randomBytes(32).toString('hex');

    const [webhook] = await db('webhooks')
      .insert({
        user_id: req.user!.userId,
        url: body.url,
        events: body.events,
        secret,
      })
      .returning(['id', 'url', 'events', 'is_active', 'created_at']);

    // Return secret once on creation
    res.status(201).json({ ...webhook, secret });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    next(err);
  }
});

/**
 * DELETE /api/v1/webhooks/:id
 */
router.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const wh = await db('webhooks').where('id', req.params.id).first();
    if (!wh) {
      res.status(404).json({ error: 'Webhook not found' });
      return;
    }
    if (wh.user_id !== req.user!.userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    await db('webhooks').where('id', req.params.id).update({ is_active: false });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
