# Project Context

Product vision, design decisions, infrastructure details, and future plans.

## Infrastructure

### Neon Postgres

**IMPORTANT: There are two Neon organizations. Use the correct one.**

| Org | Name | ID | Purpose |
|-----|------|----|---------|
| **Production (Vercel-managed)** | Vercel: Nyle Sykes' projects | `org-tiny-hat-28280839` | **This is the real database. All schema changes go here.** |
| Personal (unused by app) | hello@nylesykes.com | `org-bold-butterfly-00471472` | Contains `buki-project`. NOT used by the deployed app. Do not push schemas here. |

**Production project details:**
- Project: `biomarker-hub` (ID: `jolly-sky-75880073`)
- Region: `aws-us-east-1`
- Database: `neondb`
- Branch: `main` (ID: `br-late-mouse-aiuckkws`)
- Endpoint: `ep-still-mountain-aiw3nd72` (pooler: `ep-still-mountain-aiw3nd72-pooler.c-4.us-east-1.aws.neon.tech`)

When running `drizzle-kit push`, always use the DATABASE_URL from the Vercel-managed project, not from `buki-project`.

### Vercel

- Team: `Nyle Sykes' projects` (ID: `team_iUFTfq9Qj4FVqHrvkSfC9SCX`)
- Project: `biomarker-hub` (ID: `prj_MXyXCGzJdhZkpEbxCq7CvfEZdza8`)
- Domain: `biomarker-hub.vercel.app`
- Framework: Next.js 16 (Turbopack)
- Node: 24.x
- Region: `iad1` (US East)
- GitHub: `nsykes/biomarker-hub` (public, auto-deploy on push to main)

### Neon Auth

- Google OAuth via Neon Auth (managed service)
- Auth schema: `neon_auth` (in the production database, managed externally)
- App tables reference `neon_auth.user.id` via `userId` columns (no FK constraint, managed externally)

## Design Decisions

- **BYOK model**: Users provide their own OpenRouter API key. No server-side key, no shared costs.
- **MCP server**: Remote only (Streamable HTTP at `/api/mcp/mcp`). Local stdio server was removed in PR #53.
- **MCP data philosophy**: Return raw factual data only (values, flags, directions, reference ranges). No subjective interpretation. Let the consuming LLM decide what matters.
- **PDF storage**: Stored as `bytea` in Postgres. Considered moving to object storage but deferred.
- **Unit normalization**: Display-time conversion only. Original units preserved in DB.
- **Derivative biomarkers**: Auto-calculated from extracted components. 77 derivatives across the registry.
