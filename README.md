# Age Eligibility Gate

![Frontend CI](https://github.com/Atharvashind/age-eligibility-gate/actions/workflows/frontend-ci.yml/badge.svg?branch=main) ![Contract CI](https://github.com/Atharvashind/age-eligibility-gate/actions/workflows/contract-ci.yml/badge.svg?branch=main)

An issuer-led eligibility service that answers “does this person meet the minimum age policy?” without revealing a date of birth.

## Why it exists

Age checks usually force an applicant to disclose more identity data than the relying party needs. This application gives an issuer a registration surface and a verifier a simple policy result. The credential desk shows the configured threshold, trusted issuer state, wallet readiness, proof status, and live deployment identity.

## Verification journey

1. An issuer is registered with `registerIssuer(issuer_pk)`.
2. A credential is checked through `verifyCredential(bdate, sig)`.
3. A relying party requests the policy result with `verifyAge(current_time)`.
4. The dashboard reports only the eligibility outcome and confirmed transaction state.

The `age_gate` ledger keeps the minimum age, trusted issuer map, and administrator key. Birthdate and credential payload remain witness data.

## Deployment record

| Network | Midnight Preprod |
| --- | --- |
| Compact contract | `age_gate` |
| Address | `cf7668c47edbbd5d6c5de324f901c6ce3da3a830e3fcd917dbbb7e42b506a092` |
| Deployment transaction | `1870092717a4f4f0f911e3a6824ae9cca34edf405dbd5c847beedcce23f0ddb8` |
| Indexer status | Confirmed |

## Developer setup

```bash
npm install
npm run compile
npm test
npm run build
npm run dev
```

To exercise deployment locally, configure the connected Preprod wallet and provider variables before running:

```bash
npm run deploy
```

## Trust model

The issuer is trusted to attest the credential; the contract verifies the issuer registration and policy proof. The application does not claim to establish legal identity. It demonstrates selective disclosure on Midnight Preprod.

Never use real identity documents or recovery phrases in this demo.

## Delivery pipeline

Every push is checked by the frontend build workflow and the Compact compile/test workflow. Release tags create an artifact containing the frontend, generated contract output, and a deployment manifest. Scheduled dependency auditing is kept separate from the release path.

Demo video: [open the credential-gate walkthrough](https://drive.google.com/file/d/1VGilF7x1SVB0WBUXBUjU0oAMZ11UQmwg/view?usp=sharing).

## Verification

Privacy is the product feature: the relying party learns only the eligibility result, while the birth date and credential details remain private. Run `npm test`, `npm run compile`, and `npm run build`; the five contract scenarios are documented in [TESTING.md](./TESTING.md), the product scope is in [PROPOSAL.md](./PROPOSAL.md), and both CI workflows run on every push and pull request.
