import { SorobanRpc, xdr, scValToNative } from '@stellar/stellar-sdk';
import { db } from './db';
import { redis } from './redis';
import { logger } from './logger';
import { dispatchWebhooks } from './webhooks';

const RPC_URL =
  process.env.STELLAR_RPC_URL ?? 'https://soroban-testnet.stellar.org';

const CONTRACT_IDS = [
  process.env.LICENSE_CORE_CONTRACT_ID,
  process.env.API_LICENSE_CONTRACT_ID,
  process.env.CONTENT_LICENSE_CONTRACT_ID,
].filter(Boolean) as string[];

const CURSOR_KEY = 'indexer:cursor';
const POLL_INTERVAL_MS = 5_000;

export class LicenseEventIndexer {
  private rpc: SorobanRpc.Server;
  private running = false;

  constructor() {
    this.rpc = new SorobanRpc.Server(RPC_URL, {
      allowHttp: RPC_URL.startsWith('http://'),
    });
  }

  async start(): Promise<void> {
    this.running = true;
    logger.info({ contracts: CONTRACT_IDS }, 'Indexer started');

    while (this.running) {
      try {
        await this.poll();
      } catch (err) {
        logger.error(err, 'Poll error — retrying after delay');
      }
      await sleep(POLL_INTERVAL_MS);
    }
  }

  stop(): void {
    this.running = false;
  }

  private async poll(): Promise<void> {
    if (CONTRACT_IDS.length === 0) {
      logger.warn('No contract IDs configured — skipping poll');
      return;
    }

    const cursor = (await redis.get(CURSOR_KEY)) ?? '0';

    const response = await this.rpc.getEvents({
      startLedger: cursor === '0' ? undefined : undefined,
      filters: CONTRACT_IDS.map((id) => ({
        type: 'contract' as const,
        contractIds: [id],
      })),
      limit: 100,
    });

    if (!response.events || response.events.length === 0) return;

    logger.debug({ count: response.events.length }, 'Events fetched');

    for (const event of response.events) {
      await this.processEvent(event);
    }

    // Advance cursor to the last seen ledger
    const lastLedger = response.events[response.events.length - 1].ledger;
    await redis.set(CURSOR_KEY, String(lastLedger + 1));
  }

  private async processEvent(event: SorobanRpc.Api.EventResponse): Promise<void> {
    try {
      const topics = event.topic.map((t) => scValToNative(t));
      const value = scValToNative(event.value);
      const eventType = String(topics[0] ?? 'unknown');

      logger.info({ eventType, ledger: event.ledger, tx: event.txHash }, 'Processing event');

      // Persist to license_events table
      await db('license_events').insert({
        event_type: eventType,
        tx_hash: event.txHash,
        ledger_sequence: event.ledger,
        payload: JSON.stringify({ topics, value }),
        occurred_at: new Date(),
      }).onConflict(['tx_hash']).ignore();

      // Update off-chain state based on event type
      await this.syncState(eventType, value, event);

      // Dispatch webhooks for interested subscribers
      await dispatchWebhooks(eventType, { topics, value, txHash: event.txHash });
    } catch (err) {
      logger.error({ err, event }, 'Failed to process event');
    }
  }

  private async syncState(
    eventType: string,
    value: unknown,
    event: SorobanRpc.Api.EventResponse
  ): Promise<void> {
    switch (eventType) {
      case 'revoked': {
        const [licenseId] = value as [string];
        await db('licenses')
          .where('on_chain_id', licenseId)
          .update({ status: 'revoked', updated_at: db.fn.now() });
        // Invalidate verification cache
        await redis.del(`verify:${licenseId}`);
        logger.info({ licenseId }, 'License revoked — state synced');
        break;
      }

      case 'renewed': {
        const [licenseId, newExpiry] = value as [string, number];
        await db('licenses')
          .where('on_chain_id', licenseId)
          .update({ status: 'active', expires_at: newExpiry, updated_at: db.fn.now() });
        await redis.del(`verify:${licenseId}`);
        logger.info({ licenseId, newExpiry }, 'License renewed — state synced');
        break;
      }

      case 'transfer': {
        const [licenseId, newHolder] = value as [string, string];
        await db('licenses')
          .where('on_chain_id', licenseId)
          .update({ holder_address: newHolder, updated_at: db.fn.now() });
        await redis.del(`verify:${licenseId}`);
        logger.info({ licenseId, newHolder }, 'License transferred — state synced');
        break;
      }

      case 'issued': {
        // On-chain confirmation: update pending license to active
        const [licenseId] = value as [string];
        await db('licenses')
          .where('on_chain_id', `pending-${event.ledger}`)
          .update({ on_chain_id: licenseId, status: 'active', updated_at: db.fn.now() });
        break;
      }

      default:
        logger.debug({ eventType }, 'Unhandled event type');
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
