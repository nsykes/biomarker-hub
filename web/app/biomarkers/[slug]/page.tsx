import { redirect } from "next/navigation";

export default async function BiomarkerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/?tab=biomarkers&biomarker=${slug}`);
}
