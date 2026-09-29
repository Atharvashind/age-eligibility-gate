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
To build and verify this application independently:
1. **Prerequisites:** Node.js 20+, npm 10+, and Compact compiler 0.30.0 (compact 0.5.1).
2. **Install Dependencies:** Run 
up to date, audited 27 packages in 782ms

3 packages are looking for funding
  run `npm fund` for details

4 vulnerabilities (1 moderate, 3 high)

To address issues that do not require attention, run:
  npm audit fix

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details. in this project directory.
3. **Compile Circuits:** Run  to build the Compact zero-knowledge circuits and generate verification keys.
4. **Run Test Suite:** Run  to execute all smart contract circuit tests and witness checks.
5. **Local Proof Server:** (Optional) Start the Docker proof server via .
6. **Launch Frontend:** Run 
> moonlight-dashboard@1.0.0 dev
> vite


  VITE v5.4.21  ready in 207 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
3:37:48 PM [vite] page reload jaynam/dist/index.html
3:37:50 PM [vite] page reload jaynam/dist/index.html to start the local web application.
