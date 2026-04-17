export function PrivacySection() {
  return (
    <section className="card p-4 md:p-5">
      <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-3">
        Privacy
      </h2>
      <div
        className="rounded-xl p-4 space-y-3 text-sm text-[var(--color-text-secondary)]"
        style={{ background: "var(--color-privacy-gradient)" }}
      >
        <div>
          <p className="font-medium text-[var(--color-text-primary)]">
            LLM extraction
          </p>
          <p>
            When you upload a lab report, the PDF is sent through your
            OpenRouter account to an LLM for biomarker extraction. Nothing is
            sent to any third party other than OpenRouter and the model
            provider it routes to.
          </p>
        </div>
        <div>
          <p className="font-medium text-[var(--color-text-primary)]">
            Zero Data Retention
          </p>
          <p>
            Whether the model provider can retain or train on your prompts
            depends on the privacy settings of your OpenRouter account. Turn
            on <span className="font-medium">ZDR Endpoints Only</span> in the
            OpenRouter API Key section above to route only to providers that
            promise not to retain inputs.
          </p>
        </div>
        <div>
          <p className="font-medium text-[var(--color-text-primary)]">
            Storage
          </p>
          <p>
            Extraction results and uploaded PDFs are stored only in the app&apos;s
            Neon Postgres database (encrypted at rest). PDFs are kept so you
            can re-open the original in the split-pane viewer. Your data is
            scoped to your account and not visible to other users.
          </p>
        </div>
        <div>
          <p className="font-medium text-[var(--color-text-primary)]">
            Your OpenRouter API key
          </p>
          <p>
            Saved in the app database as plaintext (encrypted at rest by
            Neon). The key is sent from the app server to OpenRouter on every
            extraction request. Revoke it in{" "}
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noreferrer"
              className="text-[var(--color-primary)] hover:underline font-medium"
            >
              openrouter.ai/keys
            </a>{" "}
            if you ever need to rotate it.
          </p>
        </div>
        <div>
          <p className="font-medium text-[var(--color-text-primary)]">
            Doctor shares
          </p>
          <p>
            Shares you create are protected by a one-time password hashed with
            bcrypt. The password is shown only once at creation — revoke and
            recreate the share if it&apos;s lost.
          </p>
        </div>
      </div>
    </section>
  );
}
