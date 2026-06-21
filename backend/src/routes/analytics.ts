import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db/client';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * GET /api/v1/analytics/overview
 * Returns aggregate stats for the authenticated developer.
 */
router.get('/overview', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const addr = req.user!.stellarAddress;

    const [
      totalIssued,
      activeCount,
      revokedCount,
      expiredCount,
      totalApiKeys,
      totalContentLicenses,
      recentEvents,
    ] = await Promise.all([
      db('licenses').where('issuer_address', addr).count('id as count').first(),
      db('licenses').where('issuer_address', addr).where('status', 'active').count('id as count').first(),
      db('licenses').where('issuer_address', addr).where('status', 'revoked').count('id as count').first(),
      db('licenses').where('issuer_address', addr).where('status', 'expired').count('id as count').first(),
      db('api_keys').where('owner_address', addr).count('id as count').first(),
      db('content_licenses').where('issuer_address', addr).count('id as count').first(),
      db('license_events')
        .join('licenses', 'license_events.on_chain_license_id', 'licenses.on_chain_id')
        .where('licenses.issuer_address', addr)
        .orderBy('license_events.occurred_at', 'desc')
        .limit(10)
        .select('license_events.*'),
    ]);

    res.json({
      licenses: {
        total: Number(totalIssued?.count ?? 0),
        active: Number(activeCount?.count ?? 0),
        revoked: Number(revokedCount?.count ?? 0),
        expired: Number(expiredCount?.count ?? 0),
      },
      apiKeys: { total: Number(totalApiKeys?.count ?? 0) },
      contentLicenses: { total: Number(totalContentLicenses?.count ?? 0) },
      recentEvents,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/analytics/events
 * Paginated event log for the authenticated developer's licenses.
 */
router.get('/events', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const addr = req.user!.stellarAddress;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    const [events, [{ count }]] = await Promise.all([
      db('license_events')
        .join('licenses', 'license_events.on_chain_license_id', 'licenses.on_chain_id')
        .where('licenses.issuer_address', addr)
        .orderBy('license_events.occurred_at', 'desc')
        .limit(limit)
        .offset(offset)
        .select('license_events.*'),
      db('license_events')
        .join('licenses', 'license_events.on_chain_license_id', 'licenses.on_chain_id')
        .where('licenses.issuer_address', addr)
        .count('license_events.id'),
    ]);

    res.json({ data: events, pagination: { page, limit, total: Number(count) } });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/analytics/usage
 * Daily license issuance counts for the last 30 days.
 */
router.get('/usage', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const addr = req.user!.stellarAddress;

    const rows = await db('licenses')
      .where('issuer_address', addr)
      .where('created_at', '>=', db.raw("NOW() - INTERVAL '30 days'"))
      .groupByRaw("DATE(created_at)")
      .select(db.raw("DATE(created_at) as date, COUNT(*) as count"))
      .orderBy('date', 'asc');

    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

export default router;
