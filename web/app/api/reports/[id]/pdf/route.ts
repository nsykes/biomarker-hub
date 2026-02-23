import { db } from "@/lib/db";
import { reports } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [row] = await db
    .select({ pdfData: reports.pdfData })
    .from(reports)
    .where(eq(reports.id, id));

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
  const { id } = await params;
  const buffer = Buffer.from(await request.arrayBuffer());

  await db
    .update(reports)
    .set({ pdfData: buffer, pdfSizeBytes: buffer.length })
    .where(eq(reports.id, id));

  return new Response(null, { status: 204 });
}
