# Runbook

Operational procedures for biomarker-hub.

## Deploying Phase 2 (bcrypt migration)

The code in `lib/db/actions/doctor-shares.ts` reads a new
`password_hash_v2` column. **Apply the migration BEFORE deploying the code**,
or the live site will error when someone opens the doctor-share settings.

```bash
# Against the Vercel-managed Neon project (NOT buki-project):
DATABASE_URL="<vercel-neon-url>" \
  psql -f web/drizzle/migrations/0001_doctor_share_password_v2.sql
```

Verify:

```sql
\d doctor_shares  -- should show password_hash_v2 text
```

Then deploy. New shares will bcrypt-hash. Existing SHA256 shares keep
working and upgrade opportunistically on each successful validation.

## Post-migration cleanup (+4 weeks)

Once all active shares have upgraded:

```sql
-- Confirm no un-migrated active rows:
SELECT count(*) FROM doctor_shares
WHERE password_hash_v2 IS NULL AND revoked_at IS NULL
  AND (expires_at IS NULL OR expires_at > NOW());
-- Expect: 0
```

If zero:

```sql
ALTER TABLE doctor_shares ALTER COLUMN password_hash_v2 SET NOT NULL;
ALTER TABLE doctor_shares DROP COLUMN password;
ALTER TABLE doctor_shares DROP COLUMN password_hash;
```

Also update `lib/db/schema.ts` to drop the legacy columns and `simplify
lib/db/actions/doctor-shares.ts` to use only `passwordHashV2`.

## Rotating NEON_AUTH_COOKIE_SECRET

Rotating the cookie secret invalidates all sessions (users must sign in
again). Do this if the secret is leaked.

```bash
NEW=$(openssl rand -base64 32)
# Update in Vercel dashboard → Project → Settings → Environment Variables
# Redeploy to pick up the new value
```

## Cycling OAuth access tokens

Forces every MCP client (Claude.ai connectors) to re-authorize. Do this
after an OAuth-related security incident.

```sql
TRUNCATE oauth_tokens;
-- Clients keep their client_id + client_secret; only access tokens cycle.
-- Users reconnect the Claude.ai MCP connector.
```

## Revoking all doctor shares

```sql
UPDATE doctor_shares SET revoked_at = NOW() WHERE revoked_at IS NULL;
```

Doctors will see the share-error page. Users create new shares in
Settings.

## Rate-limit tuning

Buckets live in `web/lib/rate-limit.ts`. Adjust requests-per-window there;
values persist in Upstash so changes are live on redeploy.

Monitor: Upstash dashboard → your Redis instance → Data Browser. Keys
prefixed `bh:` — e.g., `bh:extract:<userId>`.

## Promoting test-branch schema to production

When ready to apply schema changes from a Neon branch back to main:

```bash
# 1. On the branch, verify schema:
DATABASE_URL="<branch-url>" npx drizzle-kit push

# 2. Apply to production:
DATABASE_URL="<prod-url>" npx drizzle-kit push
```

For destructive changes (column drops, type changes), hand-write a
migration SQL file under `web/drizzle/migrations/` and apply via psql.

## Required production env vars

See `web/.env.example` for the full template. Required in Vercel:

- `DATABASE_URL`
- `NEON_AUTH_BASE_URL`
- `NEON_AUTH_COOKIE_SECRET` (32+ chars)
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Optional:

- `OPENROUTER_API_KEY` (fallback; users provide their own in settings)
- `NEXT_PUBLIC_APP_URL`

`lib/env.ts` enforces these at build time. A Vercel build fails loudly
if any required value is missing or malformed.

## Deferred work (from the productionize pass)

- Split `ResultsPanel.tsx` (323 LOC) — concerns are actually cohesive; revisit only if it gains new responsibilities.
- Extract `useModalForm.ts` from `CreateDashboardModal` + `CreateGoalModal` — both follow the same state shape; shared hook would drop ~80 LOC across the two files.
- Component directory reorganization (flat `/components` → `views/ tabs/ modals/ sections/ charts/ extraction/ shared/`). Pure relocation; saved for a quiet PR window.
- `api-keys.keyPrefix` index (`idx_api_keys_prefix`). Low-value at current scale.
