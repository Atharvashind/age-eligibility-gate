type RuntimeEnvironment = {
  networkId?: string;
  contractAddress?: string;
  faucetUrl?: string;
  demoMode?: string;
  production?: boolean;
};

export type VerifiedDeployment = {
  contractName: 'age_gate';
  contractAddress: string;
  network: 'preview';
  transactionHash: string;
  deployedAt: string;
};

const ADDRESS = /^[0-9a-f]{64}$/i;
const TRANSACTION = /^[0-9a-f]{66}$/i;
const PREVIEW_FAUCET = 'https://faucet.preview.midnight.network/';

export function verifyAgeGateDeployment(value: unknown): VerifiedDeployment {
  if (!value || typeof value !== 'object') {
    throw new Error('Age Eligibility Gate: deployment evidence is missing.');
  }

  const candidate = value as Record<string, unknown>;
  if (candidate.contractName !== 'age_gate') {
    throw new Error('Age Eligibility Gate: deployment belongs to a different contract.');
  }
  if (candidate.network !== 'preview') {
    throw new Error('Age Eligibility Gate: only the independently deployed Preview contract is accepted.');
  }
  if (typeof candidate.contractAddress !== 'string' || !ADDRESS.test(candidate.contractAddress)) {
    throw new Error('Age Eligibility Gate: contract address is not a 32-byte hexadecimal address.');
  }
  if (typeof candidate.transactionHash !== 'string' || !TRANSACTION.test(candidate.transactionHash)) {
    throw new Error('Age Eligibility Gate: finalized deployment transaction evidence is invalid.');
  }
  if (typeof candidate.deployedAt !== 'string' || Number.isNaN(Date.parse(candidate.deployedAt))) {
    throw new Error('Age Eligibility Gate: deployment timestamp is invalid.');
  }

  return candidate as VerifiedDeployment;
}

export function validateAgeGateDeploymentRuntime(env: RuntimeEnvironment) {
  const networkId = env.networkId || 'preview';
  const faucetUrl = env.faucetUrl || PREVIEW_FAUCET;

  if (networkId !== 'preview') {
    throw new Error('Age Eligibility Gate: wallet network must be Preview.');
  }
  if (faucetUrl !== PREVIEW_FAUCET) {
    throw new Error('Age Eligibility Gate: faucet host is not the approved Preview faucet.');
  }
  if (env.contractAddress && !ADDRESS.test(env.contractAddress)) {
    throw new Error('Age Eligibility Gate: VITE_CONTRACT_ADDRESS is malformed.');
  }
  if (env.production && env.demoMode === 'true') {
    throw new Error('Age Eligibility Gate: simulated chain activity is forbidden in production.');
  }

  return { networkId, faucetUrl, contractAddress: env.contractAddress || null };
}

