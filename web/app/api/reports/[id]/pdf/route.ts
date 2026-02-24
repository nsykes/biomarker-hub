import { db } from "@/lib/db";
import { reports } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
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

  await db
    .update(reports)
    .set({ pdfData: buffer, pdfSizeBytes: buffer.length })
    .where(eq(reports.id, id));

  return new Response(null, { status: 204 });
}
