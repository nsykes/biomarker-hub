import { EXTRACTION_PROMPT } from "@/lib/prompt";
import { ExtractionResult } from "@/lib/types";
import { extractionResultSchema } from "@/lib/extraction-schema";
import {
  OPENROUTER_API_URL,
  EXTRACTION_MAX_TOKENS,
  EXTRACTION_TEMPERATURE,
} from "@/lib/constants";
import { UserError } from "./errors";

interface OpenRouterUsage {
  total_tokens?: number;
}

/** Send a single PDF buffer to OpenRouter and return a parsed extraction.
 *  All thrown errors are `UserError` with messages safe to display. */
export async function extractChunk(
  pdfBuffer: Buffer,
  filename: string,
  model: string,
  apiKey: string,
  signal: AbortSignal
): Promise<{ extraction: ExtractionResult; usage: OpenRouterUsage | undefined }> {
  const base64Pdf = pdfBuffer.toString("base64");

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-Title": "Biomarker Hub",
    },
    body: JSON.stringify({
      model,
      provider: { data_collection: "deny" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: EXTRACTION_PROMPT },
            {
              type: "file",
              file: {
                filename,
                file_data: `data:application/pdf;base64,${base64Pdf}`,
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      temperature: EXTRACTION_TEMPERATURE,
      max_tokens: EXTRACTION_MAX_TOKENS,
    }),
    signal,
  });

  if (!response.ok) {
    throw new UserError(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.choices?.[0]?.message?.content) {
    throw new UserError("No content in LLM response");
  }

  if (data.choices[0].finish_reason === "length") {
    throw new UserError(
      "The extraction output was truncated because the report contains too many results. Please try a shorter report."
    );
  }

  let extraction: ExtractionResult;
  try {
    const raw = JSON.parse(data.choices[0].message.content);
    extraction = extractionResultSchema.parse(raw) as ExtractionResult;
  } catch {
    throw new UserError("Failed to parse LLM response as JSON");
  }

  return { extraction, usage: data.usage };
}
