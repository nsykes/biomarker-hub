import { ModelOption } from "./types";

export const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: "google/gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    description: "Best for PDF/OCR extraction",
    default: true,
  },
  {
    id: "anthropic/claude-sonnet-4",
    name: "Claude Sonnet 4",
    description: "Strong structured output",
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    description: "Good multimodal baseline",
  },
];

export function getDefaultModel(): string {
  const defaultModel = AVAILABLE_MODELS.find((m) => m.default);
  return defaultModel?.id ?? AVAILABLE_MODELS[0].id;
}
