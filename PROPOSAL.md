# Product Proposal: Age Eligibility Gate

**Category:** Identity/credentials  
**Maintainer:** `Atharvashind`  
**Evidence:** Midnight Preview deployment plus five automated scenarios

## Problem

Age-gated services often collect a full birthdate when they only need an eligibility answer.

## Proposed product

Age Eligibility Gate lets an authorized issuer anchor a one-way credential commitment and lets a verifier request an 18+ policy result without publishing the birth year.

## Privacy model

The policy threshold and issued commitment are auditable. Birth year, credential salt, user secret, and identity context remain private witness inputs.

## User journey

1. Administrator registers an issuer key.
2. Applicant presents an issuer-backed credential through the wallet.
3. The circuit evaluates the threshold.
4. The dashboard returns an eligibility result and confirmed transaction.

## Success criteria

- The administrator can issue credential commitments.
- Under-age credentials fail.
- Unissued commitments fail.
- Tests cover initialization, issuer registration, valid proof, and rejection paths.
