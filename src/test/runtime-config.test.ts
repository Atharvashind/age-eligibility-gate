import { describe, expect, it } from 'vitest';
import { verifyAgeGateDeployment, validateAgeGateDeploymentRuntime } from '../runtimeConfig';

const deployment = {
  contractName: 'age_gate',
  contractAddress: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  network: 'preview',
  transactionHash: '000000000000000000000000000000000000000000000000000000000000000000',
  deployedAt: '2026-08-03T18:00:00.000Z',
};

describe('Age Eligibility Gate production configuration', () => {
  it('accepts matching Preview deployment evidence', () => {
    expect(verifyAgeGateDeployment(deployment).contractName).toBe('age_gate');
  });

  it('rejects evidence copied from another project', () => {
    expect(() => verifyAgeGateDeployment({ ...deployment, contractName: 'foreign_contract' })).toThrow(/different contract/);
  });

  it('rejects malformed contract and transaction identifiers', () => {
    expect(() => verifyAgeGateDeployment({ ...deployment, contractAddress: 'preview1bad' })).toThrow(/32-byte/);
    expect(() => verifyAgeGateDeployment({ ...deployment, transactionHash: 'pending' })).toThrow(/transaction evidence/);
  });

  it('prevents demo mode and network drift in production', () => {
    expect(() => validateAgeGateDeploymentRuntime({ networkId: 'preprod' })).toThrow(/Preview/);
    expect(() => validateAgeGateDeploymentRuntime({ production: true, demoMode: 'true' })).toThrow(/forbidden/);
  });
});

