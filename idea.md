# Project Idea: Age / Eligibility Gate (Over 18/21 Access Gate)

An eligibility check system that lets users prove they are of legal age (e.g., over 18 or 21) without disclosing their exact birthdate, name, or identity documents.

## 1. Midnight Network Specialty (ZK & Privacy Features)
*   **Selective Disclosure:** Allows threshold validation (proving value >= threshold) without revealing the underlying private data value.
*   **Shielded Storage:** The user's birthdate remains completely in their private local wallet state and is never exposed on the public ledger.
*   **Credential Attestation:** Uses ZK circuits to verify that the birthdate was signed by a trusted identity issuer before running the age calculation.

## 2. Technical Architecture (Compact Contract)
*   **Public State:**
    *   `trusted_issuers`: Set of public keys representing authorized identity providers.
    *   `min_age_requirement`: The required age limit (e.g., 18).
*   **Private State (User Wallet):**
    *   `birthdate_timestamp`: The user's unix birthdate.
    *   `issuer_signature`: Signature from an authorized issuer confirming the birthdate.
*   **Circuits (ZK Proofs):**
    *   `verify_age_threshold(current_time, birthdate_timestamp, issuer_signature)`:
        1. Checks that the `issuer_signature` is valid and belongs to an address in `trusted_issuers`.
        2. Calculates the user's age: `age = current_time - birthdate_timestamp`.
        3. Asserts that `age >= min_age_requirement`.
        *Output:* A boolean assertion proof validating eligibility.

## 3. Frontend & Integration (Level 3 Focus)
*   **User Interface:** A portal where users upload a cryptographically signed identity file, specify the age requirement, run proof generation, and display an access token or QR code to the verifying web service.
*   **Lace/Midnight Wallet Integration:**
    *   Connects to retrieve the user's private credentials.
    *   Fires up the local proof server to compile ZK age verification statements.

## 4. Verification & Testing Plan
*   **Unit Tests:**
    *   Validate that an age >= 18 generates a successful ZK proof.
    *   Verify that a user who is under 18 fails the age threshold check.
    *   Assert that credentials with forged signatures are rejected.

---

## 5. How to Build & Deploy on Midnight
To build this project without errors, refer to the master build guide located at the root of the workspace: [BUILD_GUIDE.md](file:///Users/neelsubhashpote/moonlight/BUILD_GUIDE.md). It details how to:
1. Fix language pragma version mismatches.
2. Resolve SDK `4.x` dependency issues.
3. Start the Docker-based local ZK proof server.
4. Deploy the contract using a custom `deploy.mjs` script.
5. Prevent DUST gas errors.
