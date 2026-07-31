# Verification checklist

The executable contract suite is `src/test/age_gate.test.ts`.

```bash
npm test
npm run compile
npm run build
```

Five passing scenarios cover initialization, trusted-issuer registration, a valid private eligibility proof, under-age rejection, and untrusted-issuer rejection. These tests exercise the privacy boundary: the application verifies eligibility without exposing the person’s exact birth date.

CI runs the contract tests/compile and frontend build independently on every push and pull request.
