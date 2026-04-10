"use server";

import crypto from "crypto";
import { db } from "../index";
import { doctorShares } from "../schema";
import { eq, and, isNull } from "drizzle-orm";
import { requireUser } from "./auth";
import { DoctorShareInfo, BiomarkerDetailData } from "@/lib/types";
import {
  getUserBiomarkerSlugs,
  getBiomarkerHistoryByUser,
} from "../queries/biomarkers";

function generateToken(): string {
  return crypto.randomBytes(16).toString("hex");
}

function generatePassword(): string {
  return crypto.randomBytes(4).toString("hex");
}

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

/** Create a new doctor share. Returns the token, password (shown once), + metadata. */
export async function createDoctorShare(
  label: string,
  userName: string,
  expiresAt: string | null
): Promise<{ token: string; password: string; info: DoctorShareInfo }> {
  const userId = await requireUser();
  const token = generateToken();
  const password = generatePassword();
  const hash = hashPassword(password);

  let row;
  try {
    [row] = await db
      .insert(doctorShares)
      .values({
        userId,
        label,
        userName,
        token,
        passwordHash: hash,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      })
      .returning();
  } catch (err) {
    console.error("createDoctorShare insert failed:", err);
    throw err;
  }

  return {
    token,
    password,
    info: {
      id: row.id,
      label: row.label,
      token: row.token,
      expiresAt: row.expiresAt?.toISOString() ?? null,
      lastAccessedAt: null,
      createdAt: row.createdAt.toISOString(),
    },
  };
}

/** List all active (non-revoked) doctor shares for the current user. */
export async function listDoctorShares(): Promise<DoctorShareInfo[]> {
  const userId = await requireUser();
  let rows;
  try {
    rows = await db
      .select()
      .from(doctorShares)
      .where(and(eq(doctorShares.userId, userId), isNull(doctorShares.revokedAt)));
  } catch (err) {
    console.error("listDoctorShares query failed:", err);
    throw err;
  }

  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    token: r.token,
    expiresAt: r.expiresAt?.toISOString() ?? null,
    lastAccessedAt: r.lastAccessedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  }));
}

/** Revoke a doctor share (soft delete). */
export async function revokeDoctorShare(id: string): Promise<void> {
  const userId = await requireUser();
  await db
    .update(doctorShares)
    .set({ revokedAt: new Date() })
    .where(and(eq(doctorShares.id, id), eq(doctorShares.userId, userId)));
}

/** Validate share token + password. Returns share info or null. NO auth required. */
export async function validateShareAccess(
  token: string,
  password: string
): Promise<{ userId: string; userName: string; label: string } | null> {
  const rows = await db
    .select()
    .from(doctorShares)
    .where(and(eq(doctorShares.token, token), isNull(doctorShares.revokedAt)));

  if (rows.length === 0) return null;
  const share = rows[0];

  // Check expiration
  if (share.expiresAt && share.expiresAt < new Date()) return null;

  // Check password
  const hash = hashPassword(password);
  if (hash !== share.passwordHash) return null;

  // Fire-and-forget lastAccessedAt update
  db.update(doctorShares)
    .set({ lastAccessedAt: new Date() })
    .where(eq(doctorShares.id, share.id))
    .then(() => {})
    .catch(() => {});

  return { userId: share.userId, userName: share.userName, label: share.label };
}

/** Look up a share by token (no password needed). For the share page server component. */
export async function getShareByToken(
  token: string
): Promise<{ userName: string; label: string; expired: boolean } | null> {
  const rows = await db
    .select({
      userName: doctorShares.userName,
      label: doctorShares.label,
      expiresAt: doctorShares.expiresAt,
    })
    .from(doctorShares)
    .where(and(eq(doctorShares.token, token), isNull(doctorShares.revokedAt)));

  if (rows.length === 0) return null;
  const share = rows[0];
  const expired = share.expiresAt ? share.expiresAt < new Date() : false;
  return { userName: share.userName, label: share.label, expired };
}

export interface SharedBiomarkerSummary {
  slug: string;
  latestValue: number | null;
  latestValueText: string | null;
  latestFlag: string;
  unit: string | null;
}

/** Get all biomarker summaries for a shared user. Validates token + password. */
export async function getSharedBiomarkerList(
  token: string,
  password: string
): Promise<SharedBiomarkerSummary[] | null> {
  const access = await validateShareAccess(token, password);
  if (!access) return null;

  const slugs = await getUserBiomarkerSlugs(access.userId);
  if (slugs.length === 0) return [];

  // Get latest value per slug in a single batch query
  const { getBatchChartDataByUser } = await import("../queries/biomarkers");
  const batchData = await getBatchChartDataByUser(access.userId, slugs);

  return batchData
    .filter((d) => d.history.length > 0)
    .map((d) => {
      const latest = d.history[d.history.length - 1]; // history is sorted asc by date
      return {
        slug: d.slug,
        latestValue: latest.value,
        latestValueText: latest.valueText,
        latestFlag: latest.flag,
        unit: latest.unit ?? d.defaultUnit,
      };
    });
}

/** Get biomarker detail for a shared user. Validates token + password. */
export async function getSharedBiomarkerDetail(
  token: string,
  password: string,
  slug: string
): Promise<BiomarkerDetailData | null> {
  const access = await validateShareAccess(token, password);
  if (!access) return null;

  const { history, referenceRange } = await getBiomarkerHistoryByUser(
    access.userId,
    slug
  );

  const { REGISTRY } = await import("@/lib/biomarker-registry");
  const entry = REGISTRY.find((e) => e.slug === slug);

  return {
    slug,
    displayName: entry?.displayName ?? slug,
    fullName: entry?.fullName ?? slug,
    category: entry?.category ?? "Unknown",
    defaultUnit: entry?.defaultUnit ?? null,
    summary: entry?.summary,
    history,
    referenceRange,
  };
}
