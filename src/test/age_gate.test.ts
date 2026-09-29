import { AgeGateSimulator } from "./age-gate-simulator.js";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { describe, expect, it } from "vitest";
import { randomBytes } from "./utils.js";

setNetworkId("undeployed");

describe("Age credential commitment contract", () => {
  const adminSecret = randomBytes(32);
  const minAge = 18n;
  const setup = (birthYear: bigint, salt: Uint8Array) => {
    const bootstrap = new AgeGateSimulator(adminSecret, 0n, new Uint8Array(32), minAge, new Uint8Array(32));
    return new AgeGateSimulator(randomBytes(32), birthYear, salt, minAge, bootstrap.publicKey(adminSecret));
  };

  it("initializes the minimum age", () => {
    expect(setup(2000n, randomBytes(32)).getLedger().min_age_requirement).toBe(18n);
  });

  it("allows only the administrator to issue a credential commitment", () => {
    const salt = randomBytes(32);
    const sim = setup(2000n, salt);
    const commitment = sim.credentialCommitment(2000n, salt);
    expect(() => sim.issueCredential(commitment)).toThrow(/Only admin/);
    sim.switchUser(adminSecret, 0n, new Uint8Array(32));
    expect(sim.issueCredential(commitment).issued_credentials.member(commitment)).toBe(true);
  });

  it("proves age from an issued private birth year and salt", () => {
    const salt = randomBytes(32);
    const sim = setup(2000n, salt);
    const commitment = sim.credentialCommitment(2000n, salt);
    sim.switchUser(adminSecret, 0n, new Uint8Array(32));
    sim.issueCredential(commitment);
    sim.switchUser(randomBytes(32), 2000n, salt);
    expect(sim.verifyAge(2026n)).toBe(true);
  });

  it("rejects an unissued credential", () => {
    const sim = setup(2000n, randomBytes(32));
    expect(() => sim.verifyAge(2026n)).toThrow(/not issued/);
  });

  it("rejects an under-age credential", () => {
    const salt = randomBytes(32);
    const sim = setup(2012n, salt);
    const commitment = sim.credentialCommitment(2012n, salt);
    sim.switchUser(adminSecret, 0n, new Uint8Array(32));
    sim.issueCredential(commitment);
    sim.switchUser(randomBytes(32), 2012n, salt);
    expect(() => sim.verifyAge(2026n)).toThrow(/under/);
  });

  it("rejects future birth years without unsigned underflow", () => {
    const salt = randomBytes(32);
    const sim = setup(2030n, salt);
    const commitment = sim.credentialCommitment(2030n, salt);
    sim.switchUser(adminSecret, 0n, new Uint8Array(32));
    sim.issueCredential(commitment);
    sim.switchUser(randomBytes(32), 2030n, salt);
    expect(() => sim.verifyAge(2026n)).toThrow(/future/);
  });
});
