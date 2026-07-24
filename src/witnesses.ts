import { Ledger } from "../contracts/managed/age_gate/contract/index.js";
import { WitnessContext } from "@midnight-ntwrk/compact-runtime";

export type AgeGatePrivateState = {
  readonly secretKey: Uint8Array;
  readonly birthdate: bigint;
  readonly issuerSignature: Uint8Array;
};

export const createAgeGatePrivateState = (secretKey: Uint8Array, birthdate: bigint, issuerSignature: Uint8Array) => ({
  secretKey,
  birthdate,
  issuerSignature
});

export const witnesses = {
  localSecretKey: ({
    privateState,
  }: WitnessContext<Ledger, AgeGatePrivateState>): [
    AgeGatePrivateState,
    Uint8Array,
  ] => [privateState, privateState.secretKey],

  birthdate: ({
    privateState,
  }: WitnessContext<Ledger, AgeGatePrivateState>): [
    AgeGatePrivateState,
    bigint,
  ] => [privateState, privateState.birthdate],

  issuerSignature: ({
    privateState,
  }: WitnessContext<Ledger, AgeGatePrivateState>): [
    AgeGatePrivateState,
    Uint8Array,
  ] => [privateState, privateState.issuerSignature],
};
