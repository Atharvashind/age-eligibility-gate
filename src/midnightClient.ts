import { CompiledContract } from '@midnight-ntwrk/compact-js';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
const NETWORK_ID = import.meta.env.VITE_NETWORK_ID || 'preview';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { createProofProvider } from '@midnight-ntwrk/midnight-js-types';
import { fromHex, parseCoinPublicKeyToHex, parseEncPublicKeyToHex, toHex } from '@midnight-ntwrk/midnight-js-utils';
import * as ledger from '@midnight-ntwrk/ledger-v8';
import * as contractModule from '../contracts/managed/age_gate/contract/index.js';

type ConnectedWallet = {
  getShieldedAddresses(): Promise<{ shieldedAddress: string; shieldedCoinPublicKey: string; shieldedEncryptionPublicKey: string }>;
  getConfiguration(): Promise<{ indexerUri: string; indexerWsUri: string }>;
  getProvingProvider(provider: any): Promise<any>;
  balanceUnsealedTransaction(tx: string): Promise<{ tx: string }>;
  submitTransaction(tx: string): Promise<void>;
};
 
function athravZkConfigProvider(baseURL: string) {
  const circuitName = (id: string) => id.split('#').pop() ?? id;
  const read = async (folder: string, id: string, extension: string) => {
    const response = await fetch(baseURL + '/' + folder + '/' + circuitName(id) + extension);
    if (!response.ok) throw new Error('Unable to load Midnight proving asset: ' + response.status + ' ' + response.statusText);
    return new Uint8Array(await response.arrayBuffer());
  };
  return {
    getProverKey: (id: string) => read('keys', id, '.prover'),
    getVerifierKey: (id: string) => read('keys', id, '.verifier'),
    getZKIR: (id: string) => read('zkir', id, '.bzkir'),
    getVerifierKeys: (ids: string[]) => Promise.all(ids.map(async id => [id, await read('keys', id, '.verifier')])),
    get: async (id: string) => ({ circuitId: id, proverKey: await read('keys', id, '.prover'), verifierKey: await read('keys', id, '.verifier'), zkir: await read('zkir', id, '.bzkir') }),
  } as any;
}

const athravPrivateState = new Map<string, unknown>();
const athravSigningKeys = new Map<string, unknown>();
let athravContractAddress = '';

function athravPrivateStateProvider() {
  return {
    setContractAddress(address: string) { athravContractAddress = address; },
    async set(id: string, value: unknown) { athravPrivateState.set(athravContractAddress + ':' + id, value); },
    async get(id: string) { return athravPrivateState.get(athravContractAddress + ':' + id) ?? null; },
    async remove(id: string) { athravPrivateState.delete(athravContractAddress + ':' + id); },
    async clear() { for (const key of athravPrivateState.keys()) if (key.startsWith(athravContractAddress + ':')) athravPrivateState.delete(key); },
    async setSigningKey(address: string, key: unknown) { athravSigningKeys.set(address, key); },
    async getSigningKey(address: string) { return athravSigningKeys.get(address) ?? null; },
    async removeSigningKey(address: string) { athravSigningKeys.delete(address); },
    async clearSigningKeys() { athravSigningKeys.clear(); },
  };
}

async function athravBrowserProviders(wallet: ConnectedWallet) {
  const [addresses, configuration] = await Promise.all([wallet.getShieldedAddresses(), wallet.getConfiguration()]);
  const zkConfigProvider = athravZkConfigProvider(location.origin + '/midnight/age_gate');
  const provingProvider = await wallet.getProvingProvider(zkConfigProvider);
  const providers = {
    privateStateProvider: athravPrivateStateProvider(),
    publicDataProvider: indexerPublicDataProvider(configuration.indexerUri, configuration.indexerWsUri),
    zkConfigProvider,
    proofProvider: createProofProvider(provingProvider),
    walletProvider: {
      getCoinPublicKey: () => parseCoinPublicKeyToHex(addresses.shieldedCoinPublicKey, NETWORK_ID),
      getEncryptionPublicKey: () => parseEncPublicKeyToHex(addresses.shieldedEncryptionPublicKey, NETWORK_ID),
      async balanceTx(tx: ledger.Transaction<any, any, any>) {
        const balanced = await wallet.balanceUnsealedTransaction(toHex(tx.serialize()));
        return ledger.Transaction.deserialize('signature', 'proof', 'binding', fromHex(balanced.tx));
      },
    },
    midnightProvider: {
      async submitTx(tx: ledger.Transaction<any, any, any>) {
        await wallet.submitTransaction(toHex(tx.serialize()));
        return tx.identifiers()[0];
      },
    },
  } as any;
  return { providers, addresses };
}

function athravBrowserWitnesses() {
  return {
    localSecretKey: (context: any) => [context?.privateState ?? {}, new Uint8Array(32)],
    birthdate: (context: any) => [context?.privateState ?? {}, 0n],
    issuerSignature: (context: any) => [context?.privateState ?? {}, new Uint8Array(32)],
  } as any;
}

export async function deployAgegateContract(wallet: ConnectedWallet) {
  const { providers, addresses } = await athravBrowserProviders(wallet);
  const compiledContract = CompiledContract.make('age_gate', contractModule.Contract).pipe(CompiledContract.withWitnesses(athravBrowserWitnesses()));
  const adminPubkey = fromHex(parseCoinPublicKeyToHex(addresses.shieldedCoinPublicKey, NETWORK_ID));
  const deployed = await deployContract(providers, {
    compiledContract: compiledContract as any,
    privateStateId: 'ageGateState',
    initialPrivateState: {},
    args: [18n, adminPubkey],
  });
  return { contractAddress: deployed.deployTxData.public.contractAddress, txId: deployed.deployTxData.public.txId };
}

export async function submitAgegateCircuit(
  wallet: ConnectedWallet,
  contractAddress: string,
  circuitId: string,
  args: unknown[] = [],
) {
  if (!contractAddress) throw new Error('Set VITE_CONTRACT_ADDRESS before submitting a contract call.');
  const [addresses, configuration] = await Promise.all([wallet.getShieldedAddresses(), wallet.getConfiguration()]);
  const zkConfigProvider = athravZkConfigProvider(location.origin + '/midnight/age_gate');
  const provingProvider = await wallet.getProvingProvider(zkConfigProvider);
  const providers = {
    privateStateProvider: athravPrivateStateProvider(),
    publicDataProvider: indexerPublicDataProvider(configuration.indexerUri, configuration.indexerWsUri),
    zkConfigProvider,
    proofProvider: createProofProvider(provingProvider),
    walletProvider: {
      getCoinPublicKey: () => addresses.shieldedCoinPublicKey,
      getEncryptionPublicKey: () => addresses.shieldedEncryptionPublicKey,
      async balanceTx(tx: ledger.Transaction<any, any, any>) {
        const balanced = await wallet.balanceUnsealedTransaction(toHex(tx.serialize()));
        return ledger.Transaction.deserialize('signature', 'proof', 'binding', fromHex(balanced.tx));
      },
    },
    midnightProvider: {
      async submitTx(tx: ledger.Transaction<any, any, any>) {
        await wallet.submitTransaction(toHex(tx.serialize()));
        return tx.identifiers()[0];
      },
    },
  } as any;
  const compiledContract = CompiledContract.make('age_gate', contractModule.Contract).pipe(CompiledContract.withWitnesses(athravBrowserWitnesses()));
  const deployed = await findDeployedContract(providers, { compiledContract: compiledContract as any, contractAddress });
  const call = (deployed.callTx as Record<string, (...callArgs: unknown[]) => Promise<any>>)[circuitId];
  if (!call) throw new Error(`Circuit “${circuitId}” is not available in the deployed age_gate contract.`);
  const result = await call(...args);
  return result.public;
}
import { Buffer } from 'buffer';

if (typeof globalThis !== 'undefined' && !(globalThis as any).Buffer) {
  (globalThis as any).Buffer = Buffer;
}

setNetworkId(NETWORK_ID);
