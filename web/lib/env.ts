import { z } from "zod";

/** Validates the runtime environment at import time and exports a typed `env`.
 *  Missing/invalid vars throw immediately — fail fast during build and cold
 *  start instead of 500-ing on the first request.
 *
 *  Upstash is optional so local dev works without it; rate limiting becomes a
 *  no-op when unset. In production we require it (see `.env.example`). */
/** Treat empty strings the same as missing values. Vercel/Next often
 *  materializes unset env vars as "" rather than undefined, which would
 *  otherwise fail `.url()` validation even when the field is optional. */
const emptyAsUndefined = (v: unknown) => (v === "" ? undefined : v);
const optionalUrl = z.preprocess(emptyAsUndefined, z.string().url().optional());
const optionalString = z.preprocess(
  emptyAsUndefined,
  z.string().min(1).optional()
);

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  DATABASE_URL: z.string().url("DATABASE_URL must be a valid Postgres URL"),
  NEON_AUTH_BASE_URL: z.string().url("NEON_AUTH_BASE_URL must be a URL"),
  NEON_AUTH_COOKIE_SECRET: z
    .string()
    .min(32, "NEON_AUTH_COOKIE_SECRET must be at least 32 chars"),

  // Optional — per-user keys are stored in settings; this is a fallback.
  OPENROUTER_API_KEY: optionalString,

  // Optional — rate limiting is a no-op without these, with a warning in dev.
  UPSTASH_REDIS_REST_URL: optionalUrl,
  UPSTASH_REDIS_REST_TOKEN: optionalString,

  // Public app URL (client-side safe; no trailing slash enforced by getAppUrl)
  NEXT_PUBLIC_APP_URL: optionalUrl,
  VERCEL_PROJECT_PRODUCTION_URL: optionalString,
});

/** The Vercel Upstash Marketplace integration exposes credentials under
 *  two possible naming schemes depending on integration version:
 *  - Modern ("Upstash for Redis"): UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
 *  - Legacy ("Vercel KV"):         KV_REST_API_URL         / KV_REST_API_TOKEN
 *  Accept either so the app works regardless of which the user provisioned. */
const rawEnv: NodeJS.ProcessEnv = {
  ...process.env,
  UPSTASH_REDIS_REST_URL:
    process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
  UPSTASH_REDIS_REST_TOKEN:
    process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
};

const parsed = schema.safeParse(rawEnv);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("\n");
  throw new Error(
    `Invalid environment configuration:\n${issues}\n\nSee web/.env.example for the full template.`
  );
}

export const env = parsed.data;

if (
  env.NODE_ENV === "production" &&
  (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN)
) {
  // Hard fail in prod — rate limiting is a security control, not a nice-to-have.
  throw new Error(
    "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in production"
  );
}
