import { notFound } from "next/navigation";
import { REGISTRY } from "@/lib/biomarker-registry";
import { getBiomarkerDetail } from "@/lib/db/actions";
import { BiomarkerDetailPage } from "@/components/BiomarkerDetailPage";

export default async function BiomarkerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = REGISTRY.find((e) => e.slug === slug);
  if (!entry) notFound();

  const { history, referenceRange } = await getBiomarkerDetail(slug);

  return (
    <BiomarkerDetailPage
      data={{
        slug: entry.slug,
        displayName: entry.displayName,
        fullName: entry.fullName,
        category: entry.category,
        defaultUnit: entry.defaultUnit,
        history,
        referenceRange,
      }}
    />
  );
}
