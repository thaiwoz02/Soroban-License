import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '../db/client';
import { authenticate } from '../middleware/auth';

const router = Router();

const IssueContentLicenseSchema = z.object({
  holderAddress: z.string().min(56).max(64),
  contentId: z.string().min(1).max(255),
  accessType: z.enum(['lifetime', 'time_based', 'single_use']),
  expiresAt: z.number().int().min(0).default(0),
  transferable: z.boolean().default(false),
});

router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = IssueContentLicenseSchema.parse(req.body);

    const [license] = await db('content_licenses')
      .insert({
        on_chain_id: `pending-content-${Date.now()}`,
        issuer_address: req.user!.stellarAddress,
        holder_address: body.holderAddress,
        content_id: body.contentId,
        access_type: body.accessType,
        issued_at: Math.floor(Date.now() / 1000),
        expires_at: body.expiresAt,
        transferable: body.transferable,
      })
      .returning('*');

    res.status(201).json(license);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    next(err);
  }
});

router.get('/verify/:contentId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { contentId } = req.params;
    const { holderAddress } = req.query as { holderAddress?: string };

    if (!holderAddress) {
      res.status(400).json({ error: 'holderAddress query param required' });
      return;
    }

    const now = Math.floor(Date.now() / 1000);

    const license = await db('content_licenses')
      .where('content_id', contentId)
      .where('holder_address', holderAddress)
      .where('status', 'active')
      .where((b) => b.where('expires_at', 0).orWhere('expires_at', '>', now))
      .first();

    res.json({ valid: !!license, license: license ?? null });
  } catch (err) {
    next(err);
  }
});

export default router;
