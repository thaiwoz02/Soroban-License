import { Router, Request, Response, NextFunction } from 'express';
import { randomBytes, createHash } from 'crypto';
import { z } from 'zod';
import { db } from '../db/client';
import { authenticate } from '../middleware/auth';

const router = Router();

const CreateApiKeySchema = z.object({
  licenseId: z.string().uuid(),
  apiId: z.string().min(1).max(128),
  rpmLimit: z.number().int().min(1).default(60),
  rpdLimit: z.number().int().min(1).default(10000),
  rpmMonth: z.number().int().min(1).default(300000),
  expiresAt: z.number().int().min(0).default(0),
});

/**
 * POST /api/v1/api-keys
 * Issue a new API key tied to a license.
 * Returns the raw key ONCE — never stored in plain text.
 */
router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = CreateApiKeySchema.parse(req.body);

    const license = await db('licenses').where('id', body.licenseId).first();
    if (!license) {
      res.status(404).json({ error: 'License not found' });
      return;
    }
    if (license.holder_address !== req.user!.stellarAddress) {
      res.status(403).json({ error: 'Only the license holder can issue API keys' });
      return;
    }

    // Generate a secure random key
    const rawKey = `sl_live_${randomBytes(32).toString('hex')}`;
    const keyHash = createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.slice(0, 12);

    const [apiKey] = await db('api_keys')
      .insert({
        key_hash: keyHash,
        key_prefix: keyPrefix,
        license_id: body.licenseId,
        owner_address: req.user!.stellarAddress,
        api_id: body.apiId,
        rpm_limit: body.rpmLimit,
        rpd_limit: body.rpdLimit,
        rpm_month: body.rpmMonth,
        issued_at: Math.floor(Date.now() / 1000),
        expires_at: body.expiresAt,
      })
      .returning('*');

    // Return the raw key only this one time
    res.status(201).json({
      ...apiKey,
      rawKey, // only included on creation — never stored
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    next(err);
  }
});

/**
 * GET /api/v1/api-keys
 */
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const keys = await db('api_keys')
      .where('owner_address', req.user!.stellarAddress)
      .select('id', 'key_prefix', 'license_id', 'api_id', 'rpm_limit', 'is_active', 'issued_at', 'expires_at', 'total_requests', 'created_at');

    res.json({ data: keys });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/v1/api-keys/:id — revoke an API key
 */
router.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const key = await db('api_keys').where('id', req.params.id).first();
    if (!key) {
      res.status(404).json({ error: 'API key not found' });
      return;
    }
    if (key.owner_address !== req.user!.stellarAddress) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    await db('api_keys').where('id', req.params.id).update({ is_active: false });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/api-keys/validate
 * Validate an API key (used by external services).
 * Does NOT require user auth — the raw key is provided in the body.
 */
router.post('/validate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { apiKey } = req.body as { apiKey: string };
    if (!apiKey) {
      res.status(400).json({ error: 'apiKey is required' });
      return;
    }

    const keyHash = createHash('sha256').update(apiKey).digest('hex');
    const entry = await db('api_keys').where('key_hash', keyHash).first();

    if (!entry || !entry.is_active) {
      res.status(401).json({ valid: false, reason: 'Invalid or inactive API key' });
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    if (entry.expires_at > 0 && now > entry.expires_at) {
      res.status(401).json({ valid: false, reason: 'API key expired' });
      return;
    }

    // Increment usage counter (fire-and-forget)
    db('api_keys')
      .where('id', entry.id)
      .increment('total_requests', 1)
      .catch(() => {});

    res.json({
      valid: true,
      apiId: entry.api_id,
      rateLimit: {
        requestsPerMinute: entry.rpm_limit,
        requestsPerDay: entry.rpd_limit,
        requestsPerMonth: entry.rpm_month,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
