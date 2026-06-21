/**
 * License Service
 *
 * Orchestrates on-chain contract calls + off-chain DB writes for all
 * license lifecycle operations. Routes call this instead of touching
 * the contract or DB directly.
 */

import {
  invokeContract,
  toScAddress,
  toScString,
  toScU64,
  toScU32,
  toScBool,
} from '../lib/soroban';
import { db } from '../db/client';
import { logger } from '../lib/logger';
import { xdr, nativeToScVal, Address } from '@stellar/stellar-sdk';

const CORE_CONTRACT = process.env.LICENSE_CORE_CONTRACT_ID ?? '';

export interface IssueLicenseInput {
  issuerAddress: string;
  issuerSecret: string; // caller's signing key (never stored)
  holderAddress: string;
  productDbId: string; // DB uuid for product
  productOnChainId: string; // on-chain string identifier
  licenseType: 'perpetual' | 'subscription' | 'metered' | 'tiered';
  accessLevel: 'basic' | 'standard' | 'pro' | 'enterprise';
  expiresAt: number;
  maxActivations: number;
  transferable: boolean;
  metadata: Record<string, string>;
}

const LICENSE_TYPE_MAP: Record<string, number> = {
  perpetual: 0,
  subscription: 1,
  metered: 2,
  tiered: 3,
};

const ACCESS_LEVEL_MAP: Record<string, number> = {
  basic: 0,
  standard: 1,
  pro: 2,
  enterprise: 3,
};

export async function issueLicense(input: IssueLicenseInput) {
  // Build metadata ScVal map
  const metadataEntries = Object.entries(input.metadata).map(([k, v]) =>
    xdr.ScMapEntry.scMapEntry({
      key: toScString(k),
      val: toScString(v),
    })
  );
  const metadataScVal = xdr.ScVal.scvMap(metadataEntries);

  const args: xdr.ScVal[] = [
    toScAddress(input.issuerAddress),
    toScAddress(input.holderAddress),
    toScString(input.productOnChainId),
    nativeToScVal(LICENSE_TYPE_MAP[input.licenseType], { type: 'u32' }),
    nativeToScVal(ACCESS_LEVEL_MAP[input.accessLevel], { type: 'u32' }),
    toScU64(input.expiresAt),
    toScU32(input.maxActivations),
    toScBool(input.transferable),
    metadataScVal,
  ];

  logger.info({ product: input.productOnChainId }, 'Invoking issue_license on-chain');
  const txHash = await invokeContract(
    CORE_CONTRACT,
    'issue_license',
    args,
    input.issuerSecret
  );

  // After on-chain success, persist to DB
  const [license] = await db('licenses')
    .insert({
      on_chain_id: txHash, // will be refined by indexer with actual BytesN<32>
      product_id: input.productDbId,
      issuer_address: input.issuerAddress,
      holder_address: input.holderAddress,
      license_type: input.licenseType,
      status: 'active',
      access_level: input.accessLevel,
      issued_at: Math.floor(Date.now() / 1000),
      expires_at: input.expiresAt,
      max_activations: input.maxActivations,
      transferable: input.transferable,
      metadata: JSON.stringify(input.metadata),
    })
    .returning('*');

  await db('license_events').insert({
    on_chain_license_id: txHash,
    event_type: 'issued',
    actor_address: input.issuerAddress,
    tx_hash: txHash,
    payload: JSON.stringify({ productId: input.productOnChainId }),
  });

  return license;
}

export async function revokeLicense(
  licenseDbId: string,
  issuerAddress: string,
  issuerSecret: string,
  onChainId: string
) {
  await invokeContract(
    CORE_CONTRACT,
    'revoke_license',
    [toScAddress(issuerAddress), toScString(onChainId)],
    issuerSecret
  );

  const [updated] = await db('licenses')
    .where('id', licenseDbId)
    .update({ status: 'revoked', updated_at: db.fn.now() })
    .returning('*');

  await db('license_events').insert({
    on_chain_license_id: onChainId,
    event_type: 'revoked',
    actor_address: issuerAddress,
  });

  return updated;
}

export async function renewLicense(
  licenseDbId: string,
  issuerAddress: string,
  issuerSecret: string,
  onChainId: string,
  newExpiresAt: number
) {
  await invokeContract(
    CORE_CONTRACT,
    'renew_license',
    [toScAddress(issuerAddress), toScString(onChainId), toScU64(newExpiresAt)],
    issuerSecret
  );

  const [updated] = await db('licenses')
    .where('id', licenseDbId)
    .update({ status: 'active', expires_at: newExpiresAt, updated_at: db.fn.now() })
    .returning('*');

  await db('license_events').insert({
    on_chain_license_id: onChainId,
    event_type: 'renewed',
    actor_address: issuerAddress,
    payload: JSON.stringify({ newExpiresAt }),
  });

  return updated;
}
