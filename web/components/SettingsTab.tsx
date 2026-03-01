"use client";

import { useSettingsData } from "@/hooks/useSettingsData";
import { PageSpinner } from "./Spinner";
import { ApiKeySection } from "./settings/ApiKeySection";
import { ModelSection } from "./settings/ModelSection";
import { PrivacySection } from "./settings/PrivacySection";
import { ExportSection } from "./settings/ExportSection";
import { ApiKeysSection } from "./settings/ApiKeysSection";
import { PasswordSection } from "./settings/PasswordSection";
import { DeleteAccountSection } from "./settings/DeleteAccountSection";

export function SettingsTab() {
  const {
    settings,
    loading,
    loadError,
    loadSettings,
    saving,
    saved,
    saveError,
    apiKeyInput,
    setApiKeyInput,
    showKey,
    setShowKey,
    keyStored,
    keyDirty,
    setKeyDirty,
    setSaved,
    setSaveError,
    saveApiKey,
    handleModelChange,
    exporting,
    handleExport,
    apiKeysList,
    setApiKeysList,
  } = useSettingsData();

  if (loading) {
    return <PageSpinner />;
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {loadError && (
        <div className="card px-4 py-3 text-sm text-[var(--color-error-text)] bg-[var(--color-error-bg)] border-[var(--color-error-bg)] flex items-center justify-between">
          <span>{loadError}</span>
          <button
            onClick={loadSettings}
            className="ml-4 px-3 py-1 text-xs font-medium bg-[var(--color-surface)]/60 hover:bg-[var(--color-surface)] rounded-lg transition-colors flex-shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      <ApiKeySection
        apiKeyInput={apiKeyInput}
        setApiKeyInput={setApiKeyInput}
        showKey={showKey}
        setShowKey={setShowKey}
        saving={saving}
        saved={saved}
        saveError={saveError}
        keyStored={keyStored}
        keyDirty={keyDirty}
        setKeyDirty={setKeyDirty}
        setSaved={setSaved}
        setSaveError={setSaveError}
        onSave={saveApiKey}
      />

      <ModelSection
        defaultModel={settings?.defaultModel}
        saving={saving}
        onModelChange={handleModelChange}
      />

      <PrivacySection />

      <ExportSection exporting={exporting} onExport={handleExport} />

      <ApiKeysSection apiKeysList={apiKeysList} setApiKeysList={setApiKeysList} />

      <PasswordSection />

      <DeleteAccountSection />
    </div>
  );
}
