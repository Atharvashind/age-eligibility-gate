import { AgeGateSimulator } from "./age-gate-simulator.js";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { describe, it, expect } from "vitest";
import { randomBytes } from "./utils.js";

setNetworkId("undeployed");

describe("Age / Eligibility Gate Smart Contract Tests", () => {
  const adminSecret = randomBytes(32);
  const minAge = 18n;

  // Setup helper to create a simulator
  const setupSimulator = (voterSecret: Uint8Array, birthdate: bigint, issuerSig: Uint8Array) => {
    const tempSim = new AgeGateSimulator(adminSecret, 0n, new Uint8Array(32), minAge, new Uint8Array(32));
    const adminPk = tempSim.publicKey(adminSecret);
    return new AgeGateSimulator(voterSecret, birthdate, issuerSig, minAge, adminPk);
  };

  it("1. Properly initializes contract parameters and min age requirement", () => {
    const userSecret = randomBytes(32);
    const simulator = setupSimulator(userSecret, 1000n, new Uint8Array(32));
    const ledgerState = simulator.getLedger();

    expect(ledgerState.min_age_requirement).toEqual(18n);
  });

  it("2. Lets admin register a trusted issuer public key", () => {
    const userSecret = randomBytes(32);
    const simulator = setupSimulator(userSecret, 1000n, new Uint8Array(32));
    
    // Switch to admin to register issuer
    simulator.switchUser(adminSecret, 0n, new Uint8Array(32));
    const issuerPk = randomBytes(32);
    
    const ledgerState = simulator.registerIssuer(issuerPk);
    expect(ledgerState.trusted_issuers.member(issuerPk)).toEqual(true);
  });

  it("3. Returns true when age is higher than threshold and signature matches", () => {
    const userSecret = randomBytes(32);
    const issuerPk = randomBytes(32); // We use issuer public key directly as signature for this ZK mock
    const birthdate = 100n;
    const currentTime = 150n; // Age: 50, which is >= 18
    
    const simulator = setupSimulator(userSecret, birthdate, issuerPk);

    // Admin registers issuer
    simulator.switchUser(adminSecret, 0n, new Uint8Array(32));
    simulator.registerIssuer(issuerPk);

    // User runs validation
    simulator.switchUser(userSecret, birthdate, issuerPk);
    const isEligible = simulator.verifyAge(currentTime);
    expect(isEligible).toEqual(true);
  });

  it("4. Throws when user is under the min age requirement", () => {
    const userSecret = randomBytes(32);
    const issuerPk = randomBytes(32);
    const birthdate = 100n;
    const currentTime = 110n; // Age: 10, which is < 18

    const simulator = setupSimulator(userSecret, birthdate, issuerPk);

    // Admin registers issuer
    simulator.switchUser(adminSecret, 0n, new Uint8Array(32));
    simulator.registerIssuer(issuerPk);

    // User runs validation
    simulator.switchUser(userSecret, birthdate, issuerPk);
    expect(() => simulator.verifyAge(currentTime)).toThrow("failed assert: User is under the required age");
  });

  it("5. Throws when the credential is not signed by a trusted issuer", () => {
    const userSecret = randomBytes(32);
    const untrustedIssuerPk = randomBytes(32);
    const birthdate = 100n;
    const currentTime = 150n;

    const simulator = setupSimulator(userSecret, birthdate, untrustedIssuerPk);

    // User runs validation (untrustedIssuerPk has not been registered by admin)
    expect(() => simulator.verifyAge(currentTime)).toThrow("failed assert: Credential not signed by trusted issuer");
  });
});
