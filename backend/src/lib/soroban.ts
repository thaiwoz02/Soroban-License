/**
 * Soroban Contract Invoker
 *
 * Handles building, signing, and submitting Soroban transactions for
 * license contract operations (issue, revoke, renew, transfer).
 */

import {
  Contract,
  Keypair,
  Networks,
  SorobanRpc,
  TransactionBuilder,
  nativeToScVal,
  Address,
  xdr,
} from '@stellar/stellar-sdk';
import { logger } from './logger';

const RPC_URL =
  process.env.STELLAR_RPC_URL ?? 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE =
  process.env.STELLAR_NETWORK_PASSPHRASE ?? Networks.TESTNET;
const ADMIN_SECRET = process.env.STELLAR_ADMIN_SECRET ?? '';

export const rpc = new SorobanRpc.Server(RPC_URL, {
  allowHttp: RPC_URL.startsWith('http://'),
});

/**
 * Build, simulate, sign, and submit a Soroban contract call.
 * Returns the transaction hash on success.
 */
export async function invokeContract(
  contractId: string,
  method: string,
  args: xdr.ScVal[],
  signerSecret?: string
): Promise<string> {
  const keypair = Keypair.fromSecret(signerSecret ?? ADMIN_SECRET);
  const account = await rpc.getAccount(keypair.publicKey());

  const contract = new Contract(contractId);
  const operation = contract.call(method, ...args);

  const tx = new TransactionBuilder(account, {
    fee: '1000000', // 0.1 XLM max fee
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(operation)
    .setTimeout(30)
    .build();

  // Simulate to get footprint + resource fees
  const sim = await rpc.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(sim)) {
    logger.error({ sim }, 'Simulation failed');
    throw new Error(`Simulation failed: ${sim.error}`);
  }

  const preparedTx = SorobanRpc.assembleTransaction(tx, sim).build();
  preparedTx.sign(keypair);

  const result = await rpc.sendTransaction(preparedTx);

  if (result.status === 'ERROR') {
    throw new Error(`Transaction failed: ${result.errorResult?.toXDR('base64')}`);
  }

  // Poll for confirmation
  const txHash = result.hash;
  let status: string = result.status;
  let attempts = 0;

  while ((status === 'PENDING' || status === 'NOT_FOUND') && attempts < 20) {
    await sleep(2000);
    const poll = await rpc.getTransaction(txHash);
    status = poll.status;
    attempts++;
  }

  if (status !== 'SUCCESS') {
    throw new Error(`Transaction did not succeed. Final status: ${status}`);
  }

  logger.info({ txHash, method, contractId }, 'Contract call succeeded');
  return txHash;
}

/**
 * Helper: convert a JS string to a Soroban String ScVal.
 */
export function toScString(value: string): xdr.ScVal {
  return nativeToScVal(value, { type: 'string' });
}

/**
 * Helper: convert a Stellar address string to a Soroban Address ScVal.
 */
export function toScAddress(address: string): xdr.ScVal {
  return new Address(address).toScVal();
}

/**
 * Helper: convert a number to a u64 ScVal.
 */
export function toScU64(value: number | bigint): xdr.ScVal {
  return nativeToScVal(value, { type: 'u64' });
}

/**
 * Helper: convert a number to a u32 ScVal.
 */
export function toScU32(value: number): xdr.ScVal {
  return nativeToScVal(value, { type: 'u32' });
}

/**
 * Helper: convert a boolean to a ScVal bool.
 */
export function toScBool(value: boolean): xdr.ScVal {
  return nativeToScVal(value, { type: 'bool' });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
