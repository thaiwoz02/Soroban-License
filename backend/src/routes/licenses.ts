import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '../db/client';
import { authenticate } from '../middleware/auth';

const router = Router();

const IssueLicenseSchema = z.object({
  holderAddress: z.string().min(56).max(64),
  productId: z.string().uuid(),
  licenseType: z.enum(['perpetual', 'subscription', 'metered', 'tiered']),
  accessLevel: z.enum(['basic', 'standard', 'pro', 'enterprise']),
  expiresAt: z.number().int().min(0).default(0),
  maxActivations: z.number().int().min(0).default(0),
  transferable: z.boolean().default(false),
  metadata: z.record(z.string()).default({}),
});

/**
 * GET /api/v1/licenses
 * List licenses for the authenticated user (as issuer or holder).
 */
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const role = (req.query.role as string) ?? 'holder';
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    const addressField = role === 'issuer' ? 'issuer_address' : 'holder_address';

    const [licenses, [{ count }]] = await Promise.all([
      db('licenses')
        .where(addressField, req.user!.stellarAddress)
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset),
      db('licenses').where(addressField, req.user!.stellarAddress).count('id'),
    ]);

    res.json({
      data: licenses,
      pagination: { page, limit, total: Number(count) },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/licenses/:id
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const license = await db('licenses').where('id', req.params.id).first();
    if (!license) {
      res.status(404).json({ error: 'License not found' });
      return;
    }
    res.json(license);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/licenses
 * Issue a new license (requires auth — caller is the issuer).
 */
router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = IssueLicenseSchema.parse(req.body);

    const product = await db('products').where('id', body.productId).first();
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    if (product.owner_id !== req.user!.userId) {
      res.status(403).json({ error: 'You do not own this product' });
      return;
    }

    // TODO: invoke Soroban contract to issue on-chain license
    // const onChainId = await sorobanIssue(...)

    const [license] = await db('licenses')
      .insert({
        on_chain_id: `pending-${Date.now()}`, // replaced after tx confirms
        product_id: body.productId,
        issuer_address: req.user!.stellarAddress,
        holder_address: body.holderAddress,
        license_type: body.licenseType,
        status: 'pending_activation',
        access_level: body.accessLevel,
        issued_at: Math.floor(Date.now() / 1000),
        expires_at: body.expiresAt,
        max_activations: body.maxActivations,
        transferable: body.transferable,
        metadata: JSON.stringify(body.metadata),
      })
      .returning('*');

    // Emit license_events row
    await db('license_events').insert({
      on_chain_license_id: license.on_chain_id,
      event_type: 'issued',
      actor_address: req.user!.stellarAddress,
      payload: JSON.stringify(license),
    });

    res.status(201).json(license);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    next(err);
  }
});

/**
 * POST /api/v1/licenses/:id/revoke
 */
router.post('/:id/revoke', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const license = await db('licenses').where('id', req.params.id).first();
    if (!license) {
      res.status(404).json({ error: 'License not found' });
      return;
    }
    if (license.issuer_address !== req.user!.stellarAddress) {
      res.status(403).json({ error: 'Only the issuer can revoke this license' });
      return;
    }

    // TODO: invoke on-chain revoke

    const [updated] = await db('licenses')
      .where('id', req.params.id)
      .update({ status: 'revoked', updated_at: db.fn.now() })
      .returning('*');

    await db('license_events').insert({
      on_chain_license_id: license.on_chain_id,
      event_type: 'revoked',
      actor_address: req.user!.stellarAddress,
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/licenses/:id/renew
 */
router.post('/:id/renew', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { newExpiresAt } = req.body as { newExpiresAt: number };

    if (!newExpiresAt || newExpiresAt <= Date.now() / 1000) {
      res.status(400).json({ error: 'newExpiresAt must be a future Unix timestamp' });
      return;
    }

    const license = await db('licenses').where('id', req.params.id).first();
    if (!license) {
      res.status(404).json({ error: 'License not found' });
      return;
    }
    if (license.issuer_address !== req.user!.stellarAddress) {
      res.status(403).json({ error: 'Only the issuer can renew this license' });
      return;
    }

    const [updated] = await db('licenses')
      .where('id', req.params.id)
      .update({ expires_at: newExpiresAt, status: 'active', updated_at: db.fn.now() })
      .returning('*');

    await db('license_events').insert({
      on_chain_license_id: license.on_chain_id,
      event_type: 'renewed',
      actor_address: req.user!.stellarAddress,
      payload: JSON.stringify({ newExpiresAt }),
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/licenses/:id/transfer
 */
router.post('/:id/transfer', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { newHolderAddress } = req.body as { newHolderAddress: string };

    const license = await db('licenses').where('id', req.params.id).first();
    if (!license) {
      res.status(404).json({ error: 'License not found' });
      return;
    }
    if (license.holder_address !== req.user!.stellarAddress) {
      res.status(403).json({ error: 'Only the current holder can transfer this license' });
      return;
    }
    if (!license.transferable) {
      res.status(400).json({ error: 'This license is not transferable' });
      return;
    }

    const [updated] = await db('licenses')
      .where('id', req.params.id)
      .update({ holder_address: newHolderAddress, updated_at: db.fn.now() })
      .returning('*');

    await db('license_events').insert({
      on_chain_license_id: license.on_chain_id,
      event_type: 'transferred',
      actor_address: req.user!.stellarAddress,
      payload: JSON.stringify({ from: license.holder_address, to: newHolderAddress }),
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
