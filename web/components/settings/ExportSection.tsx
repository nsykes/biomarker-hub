interface ExportSectionProps {
  exporting: boolean;
  onExport: () => void;
}

export function ExportSection({ exporting, onExport }: ExportSectionProps) {
  return (
    <section className="card p-5">
      <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-3">
        Export Data
      </h2>
      <p className="text-sm text-[var(--color-text-secondary)] mb-3">
        Download all your biomarker data as a CSV file. Includes dates, values, units, flags, reference ranges, and source information for every result across all reports.
      </p>
      <button
        onClick={onExport}
        disabled={exporting}
        className="btn-secondary"
      >
        {exporting ? "Exporting..." : "Export CSV"}
      </button>
    </section>
  );
}
