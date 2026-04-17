-- Phase 2: bcrypt migration for doctor shares.
--
-- Adds a nullable `password_hash_v2` column to store bcrypt hashes.
-- - New rows write bcrypt here and leave the v1 columns as empty strings.
-- - Existing rows (SHA256 in `password_hash`, plaintext in `password`) keep
--   working via a fallback code path that opportunistically upgrades them
--   on successful validation.
-- - After ~4 weeks, once `password_hash_v2 IS NOT NULL` for every active
--   row, a follow-up migration drops `password` and `password_hash` and
--   makes `password_hash_v2` NOT NULL.
--
-- Apply against the Vercel-managed Neon project (NOT `buki-project`).

ALTER TABLE doctor_shares ADD COLUMN IF NOT EXISTS password_hash_v2 text;
