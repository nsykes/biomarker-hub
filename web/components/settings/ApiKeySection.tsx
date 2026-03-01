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
    <section className="card p-5">
      <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-3">
        API Key
      </h2>
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
          Your OpenRouter API key. Stored as plaintext in your Neon database
          (encrypted at rest by Neon).
        </p>
      </div>
    </section>
  );
}
