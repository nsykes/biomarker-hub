"use client";

import { useState } from "react";
import { AVAILABLE_MODELS } from "@/lib/models";

interface ModelSelectorProps {
  value: string;
  onChange: (model: string) => void;
  disabled?: boolean;
}

export function ModelSelector({ value, onChange, disabled }: ModelSelectorProps) {
  const [isCustom, setIsCustom] = useState(false);
  const [customValue, setCustomValue] = useState("");

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    if (selected === "__custom__") {
      setIsCustom(true);
    } else {
      setIsCustom(false);
      onChange(selected);
    }
  };

  const handleCustomSubmit = () => {
    if (customValue.trim()) {
      onChange(customValue.trim());
    }
  };

  return (
    <div className="flex items-center gap-2">
      <select
        value={isCustom ? "__custom__" : value}
        onChange={handleSelectChange}
        disabled={disabled}
        className="border rounded px-2 py-1 text-sm bg-white disabled:opacity-50"
      >
        {AVAILABLE_MODELS.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
        <option value="__custom__">Custom model...</option>
      </select>
      {isCustom && (
        <div className="flex gap-1">
          <input
            type="text"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCustomSubmit()}
            placeholder="e.g. meta-llama/llama-3-70b"
            className="border rounded px-2 py-1 text-sm w-64"
            autoFocus
          />
          <button
            onClick={handleCustomSubmit}
            className="px-2 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
          >
            Set
          </button>
        </div>
      )}
    </div>
  );
}
