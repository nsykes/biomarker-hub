-- Add sort_order to dashboards, backfilled per-user in created_at order
-- so existing dashboards keep their current display order.
-- Apply against the Vercel-managed Neon project (NOT `buki-project`).

ALTER TABLE dashboards ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

UPDATE dashboards AS d
SET sort_order = sub.rn - 1
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) AS rn
  FROM dashboards
) AS sub
WHERE d.id = sub.id;
