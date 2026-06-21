import {
  Contract,
  Networks,
  SorobanRpc,
  TransactionBuilder,
  scValToNative,
  xdr,
} from '@stellar/stellar-sdk';
import { logger } from './logger';

const NETWORK = process.env.STELLAR_NETWORK ?? 'testnet';
const RPC_URL =
  process.env.STELLAR_RPC_URL ?? 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE =
  process.env.STELLAR_NETWORK_PASSPHRASE ??
  Networks.TESTNET;

export const rpcServer = new SorobanRpc.Server(RPC_URL, {
  allowHttp: RPC_URL.startsWith('http://'),
});

/**
 * Low-level helper to simulate a contract read call (no auth required).
 */
export async function simulateContractRead(
  contractId: string,
  method: string,
  args: xdr.ScVal[]
): Promise<unknown> {
  const contract = new Contract(contractId);
  const operation = contract.call(method, ...args);

  const account = await rpcServer.getAccount(
    process.env.STELLAR_ADMIN_PUBLIC ?? ''
  );

  const tx = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(operation)
    .setTimeout(30)
    .build();

  const sim = await rpcServer.simulateTransaction(tx);

  if (SorobanRpc.Api.isSimulationError(sim)) {
    logger.error({ sim }, 'Contract simulation error');
    throw new Error(`Contract simulation failed: ${sim.error}`);
  }

  const result = sim.result?.retval;
  if (!result) return null;

  return scValToNative(result);
}

export { NETWORK, NETWORK_PASSPHRASE };
