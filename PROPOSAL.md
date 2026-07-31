# Product Proposal: Age Eligibility Gate

## Problem

Age-gated services often collect a full birthdate when they only need an eligibility answer.

## Proposed product

Age Eligibility Gate lets a trusted issuer register a credential and lets a verifier request an 18+ policy result without publishing the birthdate.

## Privacy model

The policy threshold and issuer registration are auditable. Birthdate, credential signature payload, and identity context remain private witness inputs.

## User journey

1. Administrator registers an issuer key.
2. Applicant presents an issuer-backed credential through the wallet.
3. The circuit evaluates the threshold.
4. The dashboard returns an eligibility result and confirmed transaction.

## Success criteria

- Trusted issuers can be registered.
- Under-age credentials fail.
- Untrusted issuers fail.
- Tests cover initialization, issuer registration, valid proof, and rejection paths.

