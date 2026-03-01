import { useState, useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { AppSettings, ApiKeyInfo } from "@/lib/types";
import { getSettingsSafe, updateSettingsSafe, listApiKeys } from "@/lib/db/actions";
import { DEFAULT_MODEL } from "@/lib/constants";

export function useSettingsData() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [keyStored, setKeyStored] = useState(false);
  const [keyDirty, setKeyDirty] = useState(false);
  const [exporting, setExporting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [apiKeysList, setApiKeysList] = useState<ApiKeyInfo[]>([]);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [result, keys] = await Promise.all([
        getSettingsSafe(),
        listApiKeys(),
      ]);
      if (result.error) {
        setLoadError(result.error);
      } else {
        const s = result.data!;
        setSettings(s);
        setApiKeyInput(s.openRouterApiKey || "");
        setKeyStored(!!s.openRouterApiKey);
      }
      setApiKeysList(keys);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveApiKey = useCallback(async () => {
    setSaving("apiKey");
    setSaveError(null);
    try {
      const result = await updateSettingsSafe({ openRouterApiKey: apiKeyInput || null });
      if (result.error) {
        setSaveError(result.error);
      } else {
        const s = result.data!;
        setSettings(s);
        setApiKeyInput(s.openRouterApiKey || "");
        setKeyStored(!!s.openRouterApiKey);
        setKeyDirty(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(null);
    }
  }, [apiKeyInput]);

  const handleModelChange = useCallback(
    (model: string) => {
      setSettings((prev) => (prev ? { ...prev, defaultModel: model } : prev));
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        setSaving("model");
        try {
          const result = await updateSettingsSafe({ defaultModel: model });
          if (result.error) console.error("Failed to save model:", result.error);
        } catch (err) {
          console.error("Failed to save model:", err);
        } finally {
          setSaving(null);
        }
      }, 300);
    },
    []
  );

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/account/export");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] || "biomarker-export.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  }, []);

  return {
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
    setApiKeysList: setApiKeysList as Dispatch<SetStateAction<ApiKeyInfo[]>>,
  };
}
