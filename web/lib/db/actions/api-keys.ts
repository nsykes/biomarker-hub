"use server";

import crypto from "crypto";
import { db } from "../index";
import { apiKeys } from "../schema";
import { eq, and, isNull } from "drizzle-orm";
import { requireUser } from "./auth";
import { ApiKeyInfo } from "@/lib/types";

function generateApiKey(): string {
  return "bh_" + crypto.randomBytes(20).toString("hex");
}

function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

/** Create a new API key. Returns the full key (shown once) + metadata. */
export async function createApiKey(
  name: string
): Promise<{ key: string; info: ApiKeyInfo }> {
  const userId = await requireUser();
  const key = generateApiKey();
  const hash = hashKey(key);
  const prefix = key.slice(0, 11); // "bh_" + first 8 hex chars

  const [row] = await db
    .insert(apiKeys)
    .values({ userId, name, keyHash: hash, keyPrefix: prefix })
    .returning();

  return {
    key,
    info: {
      id: row.id,
      name: row.name,
      keyPrefix: row.keyPrefix,
      lastUsedAt: null,
      createdAt: row.createdAt.toISOString(),
    },
  };
}

/** List all active (non-revoked) API keys for the current user. */
export async function listApiKeys(): Promise<ApiKeyInfo[]> {
  const userId = await requireUser();
  const rows = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    keyPrefix: r.keyPrefix,
    lastUsedAt: r.lastUsedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  }));
}

/** Revoke an API key (soft delete). */
export async function revokeApiKey(id: string): Promise<void> {
  const userId = await requireUser();
  await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)));
}

/** Validate an API key from a request. Returns userId or null. */
export async function validateApiKey(key: string): Promise<string | null> {
  const hash = hashKey(key);
  const rows = await db
    .select({ userId: apiKeys.userId, id: apiKeys.id })
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, hash), isNull(apiKeys.revokedAt)));

  if (rows.length === 0) return null;

  // Update lastUsedAt (fire-and-forget)
  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, rows[0].id))
    .then(() => {})
    .catch(() => {});

  return rows[0].userId;
}
