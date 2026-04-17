# Smoke tests

Pure-logic tests that don't touch the database. Run with:

```bash
npm test
```

## Scope

These tests catch regressions in the bits that would otherwise require
manual QA to notice: env validation, extraction post-processing, user-safe
error surfacing, and rate-limit no-op behavior in dev.

## Adding DB-backed tests

Doctor-share bcrypt flows, API key timing-safe compare, MCP tool user
isolation — these need a real Postgres to test end-to-end. To add them:

1. Create a dedicated Neon test branch under the Vercel-managed project.
2. Apply the schema: `DATABASE_URL=<test-branch-url> drizzle-kit push`.
3. Add `web/.env.test` (gitignored) with `DATABASE_URL`, `NEON_AUTH_BASE_URL`,
   and `NEON_AUTH_COOKIE_SECRET` pointed at the test branch.
4. Write tests under `__tests__/integration/` and gate them behind a
   `DATABASE_URL`-present check so `npm test` stays fast for contributors
   who only have unit-test setup.

The following scenarios are the highest-value additions when DB tests land:

- Doctor-share happy path (v2 bcrypt)
- v1 → v2 opportunistic upgrade on valid SHA256 password
- Doctor-share brute-force rate limit (with Redis mock)
- API key auth: valid vs. tampered
- MCP tool: user isolation (A's token can't read B's data)
- Server-action SafeResult contract
