import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db/client';
import { redis } from '../lib/redis';

const router = Router();

const CACHE_TTL = 60; // seconds

/**
 * GET /api/v1/verify/:licenseId
 * Public endpoint — verify a license by its on-chain ID or database UUID.
 */
router.get('/:licenseId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { licenseId } = req.params;
    const cacheKey = `verify:${licenseId}`;

    // Check Redis cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      res.json(JSON.parse(cached));
      return;
    }

    // Query DB (check both UUID and on_chain_id)
    const license = await db('licenses')
      .where('id', licenseId)
      .orWhere('on_chain_id', licenseId)
      .first();

    if (!license) {
      const result = { valid: false, reason: 'License not found' };
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
      res.json(result);
      return;
    }

    const now = Math.floor(Date.now() / 1000);

    if (license.status !== 'active') {
      const result = { valid: false, reason: `License is ${license.status}` };
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
      res.json(result);
      return;
    }

    if (license.expires_at > 0 && now > license.expires_at) {
      const result = { valid: false, reason: 'License has expired' };
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
      res.json(result);
      return;
    }

    const result = {
      valid: true,
      license: {
        id: license.id,
        onChainId: license.on_chain_id,
        status: license.status,
        licenseType: license.license_type,
        accessLevel: license.access_level,
        holderAddress: license.holder_address,
        issuerAddress: license.issuer_address,
        issuedAt: license.issued_at,
        expiresAt: license.expires_at,
      },
    };

    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/verify/batch
 * Verify multiple license IDs in one call.
 */
router.post('/batch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { licenseIds } = req.body as { licenseIds: string[] };

    if (!Array.isArray(licenseIds) || licenseIds.length === 0) {
      res.status(400).json({ error: 'licenseIds must be a non-empty array' });
      return;
    }

    if (licenseIds.length > 50) {
      res.status(400).json({ error: 'Maximum 50 IDs per batch request' });
      return;
    }

    const now = Math.floor(Date.now() / 1000);

    const licenses = await db('licenses').whereIn('on_chain_id', licenseIds).orWhereIn('id', licenseIds);

    const resultMap: Record<string, { valid: boolean; reason?: string }> = {};

    for (const id of licenseIds) {
      const lic = licenses.find((l) => l.id === id || l.on_chain_id === id);

      if (!lic) {
        resultMap[id] = { valid: false, reason: 'Not found' };
        continue;
      }
      if (lic.status !== 'active') {
        resultMap[id] = { valid: false, reason: lic.status };
        continue;
      }
      if (lic.expires_at > 0 && now > lic.expires_at) {
        resultMap[id] = { valid: false, reason: 'Expired' };
        continue;
      }
      resultMap[id] = { valid: true };
    }

    res.json({ results: resultMap });
  } catch (err) {
    next(err);
  }
});

export default router;
