-- Phase 3: finalize doctor-share bcrypt migration + tighten reports.user_id.
--
-- Doctor shares: the 4-week co-existence window from 0001 has passed.
-- All active (non-revoked) rows have populated `password_hash_v2`, so the
-- legacy `password` (plaintext) and `password_hash` (SHA256) columns can
-- be dropped and `password_hash_v2` made NOT NULL.
--
-- Reports: `user_id` was nullable historically but the app has never
-- written NULL and every row is populated. Tighten the column so the
-- schema matches the app invariant.
--
-- Apply against the Vercel-managed Neon project (NOT `buki-project`).

-- Safety gate: abort if any active row still relies on legacy hashes.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM doctor_shares
    WHERE revoked_at IS NULL
      AND (password_hash_v2 IS NULL OR password_hash_v2 = '')
  ) THEN
    RAISE EXCEPTION 'doctor_shares has active rows without password_hash_v2 — aborting';
  END IF;
END $$;

-- Backfill revoked rows so the NOT NULL constraint can be applied.
UPDATE doctor_shares SET password_hash_v2 = '' WHERE password_hash_v2 IS NULL;

ALTER TABLE doctor_shares ALTER COLUMN password_hash_v2 SET NOT NULL;
ALTER TABLE doctor_shares DROP COLUMN password;
ALTER TABLE doctor_shares DROP COLUMN password_hash;

ALTER TABLE reports ALTER COLUMN user_id SET NOT NULL;
