import { Ledger } from "../contracts/managed/age_gate/contract/index.js";
import { WitnessContext } from "@midnight-ntwrk/compact-runtime";

export type AgeGatePrivateState = {
  readonly secretKey: Uint8Array;
  readonly birthYear: bigint;
  readonly credentialSalt: Uint8Array;
};

export const createAgeGatePrivateState = (secretKey: Uint8Array, birthYear: bigint, credentialSalt: Uint8Array) => ({
  secretKey,
  birthYear,
  credentialSalt,
});

export const witnesses = {
  localSecretKey: ({ privateState }: WitnessContext<Ledger, AgeGatePrivateState>): [AgeGatePrivateState, Uint8Array] => [privateState, privateState.secretKey],
  birthYear: ({ privateState }: WitnessContext<Ledger, AgeGatePrivateState>): [AgeGatePrivateState, bigint] => [privateState, privateState.birthYear],
  credentialSalt: ({ privateState }: WitnessContext<Ledger, AgeGatePrivateState>): [AgeGatePrivateState, Uint8Array] => [privateState, privateState.credentialSalt],
};
