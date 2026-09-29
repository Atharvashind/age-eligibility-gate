import { type CircuitContext, QueryContext, sampleContractAddress, createConstructorContext, CostModel } from "@midnight-ntwrk/compact-runtime";
import { Contract, type Ledger, ledger } from "../../contracts/managed/age_gate/contract/index.js";
import { type AgeGatePrivateState, witnesses } from "../witnesses.js";

export class AgeGateSimulator {
  readonly contract: Contract<AgeGatePrivateState>;
  circuitContext: CircuitContext<AgeGatePrivateState>;

  constructor(secretKey: Uint8Array, birthYear: bigint, credentialSalt: Uint8Array, minAge: bigint, adminPk: Uint8Array) {
    this.contract = new Contract<AgeGatePrivateState>(witnesses);
    const state = this.contract.initialState(
      createConstructorContext({ secretKey, birthYear, credentialSalt }, "0".repeat(64)),
      minAge,
      adminPk,
    );
    this.circuitContext = {
      currentPrivateState: state.currentPrivateState,
      currentZswapLocalState: state.currentZswapLocalState,
      costModel: CostModel.initialCostModel(),
      currentQueryContext: new QueryContext(state.currentContractState.data, sampleContractAddress()),
    };
  }

  switchUser(secretKey: Uint8Array, birthYear: bigint, credentialSalt: Uint8Array) {
    this.circuitContext.currentPrivateState = { secretKey, birthYear, credentialSalt };
  }

  getLedger(): Ledger { return ledger(this.circuitContext.currentQueryContext.state); }
  publicKey(sk: Uint8Array) { return this.contract.circuits.publicKey(this.circuitContext, sk).result; }
  credentialCommitment(year: bigint, salt: Uint8Array) { return this.contract.circuits.credentialCommitment(this.circuitContext, year, salt).result; }

  issueCredential(commitment: Uint8Array): Ledger {
    this.circuitContext = this.contract.impureCircuits.issueCredential(this.circuitContext, commitment).context;
    return this.getLedger();
  }

  verifyAge(currentYear: bigint): boolean {
    return this.contract.circuits.verifyAge(this.circuitContext, currentYear).result;
  }
}
