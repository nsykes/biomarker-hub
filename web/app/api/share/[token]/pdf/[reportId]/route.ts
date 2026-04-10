import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { reports } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { validateShareAccess } from "@/lib/db/actions/doctor-shares";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; reportId: string }> }
) {
  const { token, reportId } = await params;
  const password = request.nextUrl.searchParams.get("p");
  if (!password) {
    return new Response("Missing password", { status: 400 });
  }

  const access = await validateShareAccess(token, password);
  if (!access) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Verify the report belongs to the shared user
  const [row] = await db
    .select({ pdfData: reports.pdfData, userId: reports.userId })
    .from(reports)
    .where(eq(reports.id, reportId));

  if (!row?.pdfData || row.userId !== access.userId) {
    return new Response(null, { status: 404 });
  }

  const raw: unknown = row.pdfData;
  const bytes =
    typeof raw === "string"
      ? Buffer.from(raw.replace(/^\\x/, ""), "hex")
      : new Uint8Array(raw as Buffer);

  return new Response(bytes, {
    headers: { "Content-Type": "application/pdf" },
  });
}
