import { db } from "@/lib/db";
import { reports } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/server";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";

/** Cap on inbound PDF uploads for the PUT handler. Defensive — the extract
 *  route already enforces size, but this endpoint accepts raw bodies. */
const MAX_PDF_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const limit = await checkRateLimit("sessionApi", session.user.id);
  if (!limit.success) {
    return new Response("Rate limit exceeded", {
      status: 429,
      headers: rateLimitHeaders(limit, true),
    });
  }

  const { id } = await params;
  const [row] = await db
    .select({ pdfData: reports.pdfData })
    .from(reports)
    .where(and(eq(reports.id, id), eq(reports.userId, session.user.id)));

  if (!row?.pdfData) {
    return new Response(null, { status: 404 });
  }

  // neon HTTP driver may return bytea as hex string despite Buffer type annotation
  const raw: unknown = row.pdfData;
  const bytes =
    typeof raw === "string"
      ? Buffer.from(raw.replace(/^\\x/, ""), "hex")
      : new Uint8Array(raw as Buffer);

  return new Response(bytes, {
    headers: { "Content-Type": "application/pdf" },
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const limit = await checkRateLimit("sessionApi", session.user.id);
  if (!limit.success) {
    return new Response("Rate limit exceeded", {
      status: 429,
      headers: rateLimitHeaders(limit, true),
    });
  }

  const { id } = await params;

  // Verify ownership before allowing PDF upload
  const [existing] = await db
    .select({ id: reports.id })
    .from(reports)
    .where(and(eq(reports.id, id), eq(reports.userId, session.user.id)));

  if (!existing) {
    return new Response("Not found", { status: 404 });
  }

  const buffer = Buffer.from(await request.arrayBuffer());
  if (buffer.length > MAX_PDF_UPLOAD_BYTES) {
    return new Response("Payload too large", { status: 413 });
  }

  // Defense-in-depth: the ownership SELECT above already blocks cross-user
  // writes, but keep the userId in this WHERE so a future refactor that
  // removes the SELECT can't silently regress isolation.
  await db
    .update(reports)
    .set({ pdfData: buffer, pdfSizeBytes: buffer.length })
    .where(and(eq(reports.id, id), eq(reports.userId, session.user.id)));

  return new Response(null, { status: 204 });
}
