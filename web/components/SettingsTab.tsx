"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AppSettings } from "@/lib/types";
import { getSettings, updateSettings } from "@/lib/db/actions";
import { AVAILABLE_MODELS } from "@/lib/models";
import { DEFAULT_MODEL } from "@/lib/constants";
import { PageSpinner } from "./Spinner";

export function SettingsTab() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showKey, setShowKey] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    getSettings()
      .then((s) => {
        setSettings(s);
        setApiKeyInput(s.openRouterApiKey || "");
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const saveApiKey = useCallback(async () => {
    setSaving("apiKey");
    try {
      await updateSettings({ openRouterApiKey: apiKeyInput || null });
      setSettings((prev) =>
        prev ? { ...prev, openRouterApiKey: apiKeyInput || null } : prev
      );
    } catch (err) {
      console.error("Failed to save API key:", err);
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
          await updateSettings({ defaultModel: model });
        } catch (err) {
          console.error("Failed to save model:", err);
        } finally {
          setSaving(null);
        }
      }, 300);
    },
    []
  );

  if (loading) {
    return <PageSpinner />;
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      {/* API Key */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
          API Key
        </h2>
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showKey ? "text" : "password"}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="sk-or-v1-..."
                className="w-full px-3 py-2 border rounded-lg text-sm pr-16 focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
              >
                {showKey ? "Hide" : "Show"}
              </button>
            </div>
            <button
              onClick={saveApiKey}
              disabled={saving === "apiKey"}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {saving === "apiKey" ? "Saving..." : "Save"}
            </button>
          </div>
          <p className="text-xs text-gray-400">
            Your OpenRouter API key. Stored as plaintext in your Neon database
            (encrypted at rest by Neon).
          </p>
        </div>
      </section>

      {/* Default Model */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
          Default Model
        </h2>
        <div className="space-y-2">
          <select
            value={settings?.defaultModel || DEFAULT_MODEL}
            onChange={(e) => handleModelChange(e.target.value)}
            className="border rounded px-2 py-1.5 text-sm bg-white"
          >
            {AVAILABLE_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          {saving === "model" && (
            <p className="text-xs text-gray-400">Saving...</p>
          )}
          <p className="text-xs text-gray-400">
            The model used for new extractions.
          </p>
        </div>
      </section>

      {/* Privacy FAQ */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
          Privacy
        </h2>
        <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm text-gray-600">
          <div>
            <p className="font-medium text-gray-900">Sub-processor</p>
            <p>OpenRouter routes LLM requests to model providers.</p>
          </div>
          <div>
            <p className="font-medium text-gray-900">Zero Data Retention</p>
            <p>
              ZDR is enabled on OpenRouter. All model serving vendors through
              OpenRouter have ZDR enabled.
            </p>
          </div>
          <div>
            <p className="font-medium text-gray-900">Data Handling</p>
            <p>
              No lab report data is retained by any third party. PDF content is
              sent to the model for extraction and immediately discarded.
            </p>
          </div>
          <div>
            <p className="font-medium text-gray-900">Storage</p>
            <p>
              Extraction results and uploaded PDFs are stored in your Neon
              PostgreSQL database (encrypted at rest). You can re-open any
              saved report with the original PDF in the split-pane viewer.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
