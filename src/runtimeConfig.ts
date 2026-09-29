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
  network: 'preview' | 'preprod';
  transactionHash: string;
  deployedAt: string;
};

const ADDRESS = /^[0-9a-f]{64}$/i;
const TRANSACTION = /^(?:[0-9a-f]{64}|[0-9a-f]{66})$/i;
const FAUCETS = {
  preview: 'https://faucet.preview.midnight.network/',
  preprod: 'https://faucet.preprod.midnight.network/',
} as const;

export function verifyAgeGateDeployment(value: unknown): VerifiedDeployment {
  if (!value || typeof value !== 'object') {
    throw new Error('Age Eligibility Gate: deployment evidence is missing.');
  }

  const candidate = value as Record<string, unknown>;
  if (candidate.contractName !== 'age_gate') {
    throw new Error('Age Eligibility Gate: deployment belongs to a different contract.');
  }
  if (candidate.network !== 'preview' && candidate.network !== 'preprod') {
    throw new Error('Age Eligibility Gate: deployment network must be Preview or Preprod.');
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
  const networkId = env.networkId || 'preprod';
  if (networkId !== 'preview' && networkId !== 'preprod') {
    throw new Error('Age Eligibility Gate: wallet network must be Preview or Preprod.');
  }
  const faucetUrl = env.faucetUrl || FAUCETS[networkId];

  if (faucetUrl !== FAUCETS[networkId]) {
    throw new Error('Age Eligibility Gate: faucet host does not match the selected Midnight network.');
  }
  if (env.contractAddress && !ADDRESS.test(env.contractAddress)) {
    throw new Error('Age Eligibility Gate: VITE_CONTRACT_ADDRESS is malformed.');
  }
  if (env.production && env.demoMode === 'true') {
    throw new Error('Age Eligibility Gate: simulated chain activity is forbidden in production.');
  }

  return { networkId, faucetUrl, contractAddress: env.contractAddress || null };
}
