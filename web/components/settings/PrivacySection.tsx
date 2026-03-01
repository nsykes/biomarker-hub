export function PrivacySection() {
  return (
    <section className="card p-5">
      <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-3">
        Privacy
      </h2>
      <div className="rounded-xl p-4 space-y-3 text-sm text-[var(--color-text-secondary)]" style={{ background: 'var(--color-privacy-gradient)' }}>
        <div>
          <p className="font-medium text-[var(--color-text-primary)]">Sub-processor</p>
          <p>OpenRouter routes LLM requests to model providers.</p>
        </div>
        <div>
          <p className="font-medium text-[var(--color-text-primary)]">Zero Data Retention</p>
          <p>
            ZDR is enabled on OpenRouter. All model serving vendors through
            OpenRouter have ZDR enabled.
          </p>
        </div>
        <div>
          <p className="font-medium text-[var(--color-text-primary)]">Data Handling</p>
          <p>
            No lab report data is retained by any third party. PDF content is
            sent to the model for extraction and immediately discarded.
          </p>
        </div>
        <div>
          <p className="font-medium text-[var(--color-text-primary)]">Storage</p>
          <p>
            Extraction results and uploaded PDFs are stored in your Neon
            PostgreSQL database (encrypted at rest). You can re-open any
            saved report with the original PDF in the split-pane viewer.
          </p>
        </div>
      </div>
    </section>
  );
}
