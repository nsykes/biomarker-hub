import type { Dispatch, SetStateAction } from "react";

interface ApiKeySectionProps {
  apiKeyInput: string;
  setApiKeyInput: Dispatch<SetStateAction<string>>;
  showKey: boolean;
  setShowKey: Dispatch<SetStateAction<boolean>>;
  saving: string | null;
  saved: boolean;
  saveError: string | null;
  keyStored: boolean;
  keyDirty: boolean;
  setKeyDirty: Dispatch<SetStateAction<boolean>>;
  setSaved: Dispatch<SetStateAction<boolean>>;
  setSaveError: Dispatch<SetStateAction<string | null>>;
  onSave: () => void;
}

export function ApiKeySection({
  apiKeyInput,
  setApiKeyInput,
  showKey,
  setShowKey,
  saving,
  saved,
  saveError,
  keyStored,
  keyDirty,
  setKeyDirty,
  setSaved,
  setSaveError,
  onSave,
}: ApiKeySectionProps) {
  return (
    <section className="card p-4 md:p-5">
      <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">
        OpenRouter API Key
      </h2>
      <p className="text-xs text-[var(--color-text-tertiary)] mb-3">
        Used to send lab report PDFs to an LLM for biomarker extraction. Get a
        key at{" "}
        <a
          href="https://openrouter.ai/keys"
          target="_blank"
          rel="noreferrer"
          className="text-[var(--color-primary)] hover:underline font-medium"
        >
          openrouter.ai/keys
        </a>
        .
      </p>
      <div className="space-y-2.5">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={showKey ? "text" : "password"}
              value={apiKeyInput}
              onChange={(e) => {
                setApiKeyInput(e.target.value);
                setKeyDirty(true);
                setSaved(false);
                setSaveError(null);
              }}
              placeholder="sk-or-v1-..."
              className="input-base !pr-16"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] font-medium"
            >
              {showKey ? "Hide" : "Show"}
            </button>
          </div>
          <button
            onClick={onSave}
            disabled={saving === "apiKey"}
            className={saved ? "btn-primary !bg-[var(--color-success)]" : "btn-primary"}
          >
            {saving === "apiKey"
              ? "Saving..."
              : saved
                ? "Saved!"
                : "Save"}
          </button>
        </div>
        {saveError && (
          <div className="rounded-lg px-3 py-2 text-sm text-[var(--color-error-text)] bg-[var(--color-error-bg)]">
            {saveError}
          </div>
        )}
        {keyStored && !keyDirty && !saveError && (
          <p className="text-xs text-[var(--color-success)] font-medium">Key saved</p>
        )}
        <p className="text-xs text-[var(--color-text-tertiary)]">
          Stored as plaintext in your Neon database (encrypted at rest by Neon).
        </p>
      </div>

      {/* Zero Data Retention setup */}
      <div className="mt-4 pt-4 border-t border-[var(--color-border-light)]">
        <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">
          Turn on Zero Data Retention
        </p>
        <p className="text-xs text-[var(--color-text-tertiary)] mb-2">
          By default, some LLM providers may retain or train on the prompts
          they see. Lab reports contain sensitive health data, so you should
          route only to providers that promise not to retain inputs.
        </p>
        <ol className="text-xs text-[var(--color-text-secondary)] list-decimal pl-5 space-y-1 mb-2">
          <li>
            Open{" "}
            <a
              href="https://openrouter.ai/settings/guardrails"
              target="_blank"
              rel="noreferrer"
              className="text-[var(--color-primary)] hover:underline font-medium"
            >
              openrouter.ai/settings/guardrails
            </a>
          </li>
          <li>
            Under <span className="font-medium">Privacy Settings</span>, turn
            on <span className="font-medium">ZDR Endpoints Only</span>.
          </li>
          <li>
            Leave the &ldquo;train on inputs&rdquo; and &ldquo;publish
            prompts&rdquo; toggles off.
          </li>
        </ol>
        <p className="text-xs text-[var(--color-text-tertiary)]">
          These settings apply to your OpenRouter account, not this app. You
          only need to do it once.
        </p>
      </div>
    </section>
  );
}
