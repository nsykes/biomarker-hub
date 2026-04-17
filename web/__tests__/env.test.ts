import { describe, it, expect, afterEach, vi } from "vitest";

/** env.ts validates `process.env` at import time, so each test must reset
 *  modules to re-trigger validation with fresh stubs. */
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("env validation", () => {
  it("throws when DATABASE_URL is missing", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("NEON_AUTH_BASE_URL", "https://example.com");
    vi.stubEnv("NEON_AUTH_COOKIE_SECRET", "a".repeat(32));

    await expect(import("@/lib/env")).rejects.toThrow(/DATABASE_URL/);
  });

  it("throws when NEON_AUTH_COOKIE_SECRET is too short", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://u:p@host/db");
    vi.stubEnv("NEON_AUTH_BASE_URL", "https://example.com");
    vi.stubEnv("NEON_AUTH_COOKIE_SECRET", "short");

    await expect(import("@/lib/env")).rejects.toThrow(
      /NEON_AUTH_COOKIE_SECRET/
    );
  });

  it("accepts a complete dev config without Upstash", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DATABASE_URL", "postgresql://u:p@host/db");
    vi.stubEnv("NEON_AUTH_BASE_URL", "https://example.com");
    vi.stubEnv("NEON_AUTH_COOKIE_SECRET", "a".repeat(32));
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");

    const mod = await import("@/lib/env");
    expect(mod.env.DATABASE_URL).toMatch(/^postgresql:\/\//);
  });

  it("requires Upstash in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_URL", "postgresql://u:p@host/db");
    vi.stubEnv("NEON_AUTH_BASE_URL", "https://example.com");
    vi.stubEnv("NEON_AUTH_COOKIE_SECRET", "a".repeat(32));
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");

    await expect(import("@/lib/env")).rejects.toThrow(
      /UPSTASH_REDIS_REST_URL/
    );
  });
});
