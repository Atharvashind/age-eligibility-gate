# Age Eligibility Gate

![Frontend CI](https://github.com/Atharvashind/age-eligibility-gate/actions/workflows/frontend-ci.yml/badge.svg?branch=main) ![Contract CI](https://github.com/Atharvashind/age-eligibility-gate/actions/workflows/contract-ci.yml/badge.svg?branch=main)

An issuer-led eligibility service that answers “does this person meet the minimum age policy?” without revealing a date of birth.

## Evaluation dossier

Start with the [idea submission](./PROPOSAL.md), inspect the [age-policy scenarios](./src/test/age_gate.test.ts), then reproduce them with the [test protocol](./TESTING.md). The confirmed chain record is in [`deployment.json`](./deployment.json).

## Why it exists

Age checks usually force an applicant to disclose more identity data than the relying party needs. This application gives an issuer a registration surface and a verifier a simple policy result. The credential desk shows the configured threshold, trusted issuer state, wallet readiness, proof status, and live deployment identity.

## Verification journey

1. An issuer is registered with `registerIssuer(issuer_pk)`.
2. A credential is checked through `verifyCredential(bdate, sig)`.
3. A relying party requests the policy result with `verifyAge(current_time)`.
4. The dashboard reports only the eligibility outcome and confirmed transaction state.

The `age_gate` ledger keeps the minimum age, trusted issuer map, and administrator key. Birthdate and credential payload remain witness data.

## Deployment record

| Network | Midnight Preview |
| --- | --- |
| Compact contract | `age_gate` |
| Address | `2f8b772c1f9434cd30baf3fcce6e61cd1baf1d7100d271d78f7c5ac32f1a8c82` |
| Deployment transaction | `00eda70afd3703e514310e9aae8ebb695a128ed347252b993f2dab03ba64f69349` |
| Deployer | `mn_addr_preview10rdle78pj20g0ahkqmcntqe0h7sl60rxd546z5rucer3gsu9n96sqxm5qa` |
| Deployed at | `2026-08-03T18:45:22.286Z` |
| Indexer status | Confirmed |

## Developer setup

Preview test funds come from the [official Midnight Preview faucet](https://faucet.preview.midnight.network/).

```bash
npm install
npm run compile
npm test
npm run build
npm run dev
```

To exercise deployment locally, configure the connected Preview wallet and provider variables before running:

```bash
npm run deploy
```

## Trust model

The issuer is trusted to attest the credential; the contract verifies the issuer registration and policy proof. The application does not claim to establish legal identity. It demonstrates selective disclosure on Midnight Preview.

Never use real identity documents or recovery phrases in this demo.

## Delivery pipeline

Every push is checked by the frontend build workflow and the Compact compile/test workflow. Release tags create an artifact containing the frontend, generated contract output, and a deployment manifest. Scheduled dependency auditing is kept separate from the release path.

Demo video: [open the credential-gate walkthrough](https://drive.google.com/file/d/1VGilF7x1SVB0WBUXBUjU0oAMZ11UQmwg/view?usp=sharing).

## Verification

Privacy is the product feature: the relying party learns only the eligibility result, while the birth date and credential details remain private. Run `npm test`, `npm run compile`, and `npm run build`; the five contract scenarios are documented in [TESTING.md](./TESTING.md), the product scope is in [PROPOSAL.md](./PROPOSAL.md), and both CI workflows run on every push and pull request.
