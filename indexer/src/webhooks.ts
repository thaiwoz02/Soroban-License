import { createHmac } from 'crypto';
import { db } from './db';
import { logger } from './logger';

export async function dispatchWebhooks(
  eventType: string,
  payload: unknown
): Promise<void> {
  const webhooks = await db('webhooks')
    .where('is_active', true)
    .whereRaw('? = ANY(events)', [eventType]);

  if (webhooks.length === 0) return;

  const body = JSON.stringify({ event: eventType, data: payload, timestamp: Date.now() });

  await Promise.allSettled(
    webhooks.map(async (wh) => {
      const sig = createHmac('sha256', wh.secret).update(body).digest('hex');
      try {
        const res = await fetch(wh.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Soroban-License-Signature': sig,
          },
          body,
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) {
          logger.warn({ url: wh.url, status: res.status }, 'Webhook delivery failed');
        }
      } catch (err) {
        logger.error({ err, url: wh.url }, 'Webhook request error');
      }
    })
  );
}
