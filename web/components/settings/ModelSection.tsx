import { AVAILABLE_MODELS } from "@/lib/models";
import { DEFAULT_MODEL } from "@/lib/constants";

interface ModelSectionProps {
  defaultModel: string | undefined;
  saving: string | null;
  onModelChange: (model: string) => void;
}

export function ModelSection({ defaultModel, saving, onModelChange }: ModelSectionProps) {
  return (
    <section className="card p-5">
      <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-3">
        Default Model
      </h2>
      <div className="space-y-2">
        <select
          value={defaultModel || DEFAULT_MODEL}
          onChange={(e) => onModelChange(e.target.value)}
          className="input-base !w-auto"
        >
          {AVAILABLE_MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        {saving === "model" && (
          <p className="text-xs text-[var(--color-text-tertiary)]">Saving...</p>
        )}
        <p className="text-xs text-[var(--color-text-tertiary)]">
          The model used for new extractions. We strongly recommend Gemini
          2.5 Pro for the most accurate results.
        </p>
      </div>
    </section>
  );
}
