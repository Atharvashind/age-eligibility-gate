import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
  localSecretKey(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  birthYear(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
  credentialSalt(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
}

export type ImpureCircuits<PS> = {
  issueCredential(context: __compactRuntime.CircuitContext<PS>,
                  commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  verifyAge(context: __compactRuntime.CircuitContext<PS>, current_year_0: bigint): __compactRuntime.CircuitResults<PS, boolean>;
}

export type ProvableCircuits<PS> = {
  issueCredential(context: __compactRuntime.CircuitContext<PS>,
                  commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  verifyAge(context: __compactRuntime.CircuitContext<PS>, current_year_0: bigint): __compactRuntime.CircuitResults<PS, boolean>;
}

export type PureCircuits = {
  credentialCommitment(year_0: bigint, salt_0: Uint8Array): Uint8Array;
  publicKey(sk_0: Uint8Array): Uint8Array;
}

export type Circuits<PS> = {
  issueCredential(context: __compactRuntime.CircuitContext<PS>,
                  commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  verifyAge(context: __compactRuntime.CircuitContext<PS>, current_year_0: bigint): __compactRuntime.CircuitResults<PS, boolean>;
  credentialCommitment(context: __compactRuntime.CircuitContext<PS>,
                       year_0: bigint,
                       salt_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  publicKey(context: __compactRuntime.CircuitContext<PS>, sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
}

export type Ledger = {
  readonly min_age_requirement: bigint;
  issued_credentials: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<[Uint8Array, boolean]>
  };
  readonly admin: Uint8Array;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>,
               min_age_0: bigint,
               admin_pk_0: Uint8Array): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
