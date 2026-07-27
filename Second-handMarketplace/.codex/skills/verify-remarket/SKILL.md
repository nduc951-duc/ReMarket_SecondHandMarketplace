---
name: verify-remarket
description: Verify ReMarket changes with the repository's real test, lint, formatting, build, and graph commands. Use after implementing or reviewing code, before committing, when diagnosing CI-like failures, or when deciding the minimum proportional validation for frontend, backend, SQL, or cross-stack changes.
---

# Verify ReMarket

Read `references/checks.md`, then run checks proportional to the changed scope.

## Select checks

- Backend-only: backend tests, lint, and format check.
- Frontend-only: frontend tests, lint, format check, and production build.
- Shared API/auth/payment/Supabase work: run both frontend and backend suites.
- Documentation-only: inspect links and paths; do not run unrelated builds.
- SQL: validate with available Supabase tooling and explicitly report if unavailable.

## Execute

Run commands from the repository root. Start with focused tests when possible,
then run the package-level gate. Do not use auto-fix commands unless formatting
or lint changes are within task scope.

After code changes, run:

```powershell
graphify update .
```

Report every failed or skipped check. Distinguish failures introduced by the
change from pre-existing failures when evidence allows.
