import {
  type CircuitContext,
  QueryContext,
  sampleContractAddress,
  createConstructorContext,
  CostModel,
} from "@midnight-ntwrk/compact-runtime";
import {
  Contract,
  type Ledger,
  ledger,
} from "../../contracts/managed/age_gate/contract/index.js";
import { type AgeGatePrivateState, witnesses } from "../witnesses.js";

export class AgeGateSimulator {
  readonly contract: Contract<AgeGatePrivateState>;
  circuitContext: CircuitContext<AgeGatePrivateState>;

  constructor(secretKey: Uint8Array, birthdate: bigint, issuerSignature: Uint8Array, minAge: bigint, adminPk: Uint8Array) {
    this.contract = new Contract<AgeGatePrivateState>(witnesses);
    const {
      currentPrivateState,
      currentContractState,
      currentZswapLocalState,
    } = this.contract.initialState(
      createConstructorContext({ secretKey, birthdate, issuerSignature }, "0".repeat(64)),
      minAge,
      adminPk
    );
    this.circuitContext = {
      currentPrivateState,
      currentZswapLocalState,
      costModel: CostModel.initialCostModel(),
      currentQueryContext: new QueryContext(
        currentContractState.data,
        sampleContractAddress(),
      ),
    };
  }

  public switchUser(secretKey: Uint8Array, birthdate: bigint, issuerSignature: Uint8Array) {
    this.circuitContext.currentPrivateState = {
      secretKey,
      birthdate,
      issuerSignature
    };
  }

  public getLedger(): Ledger {
    return ledger(this.circuitContext.currentQueryContext.state);
  }

  public getPrivateState(): AgeGatePrivateState {
    return this.circuitContext.currentPrivateState;
  }

  public registerIssuer(issuerPk: Uint8Array): Ledger {
    this.circuitContext = this.contract.impureCircuits.registerIssuer(
      this.circuitContext,
      issuerPk,
    ).context;
    return this.getLedger();
  }

  public verifyAge(currentTime: bigint): boolean {
    const result = this.contract.circuits.verifyAge(
      this.circuitContext,
      currentTime,
    );
    return result.result;
  }

  public publicKey(sk: Uint8Array): Uint8Array {
    return this.contract.circuits.publicKey(
      this.circuitContext,
      sk,
    ).result;
  }
}
