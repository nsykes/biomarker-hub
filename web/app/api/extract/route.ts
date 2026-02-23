import { NextRequest, NextResponse } from "next/server";
import { EXTRACTION_PROMPT } from "@/lib/prompt";
import { ExtractionResult, ExtractionResponse } from "@/lib/types";
import { matchBiomarker } from "@/lib/biomarker-registry";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const formData = await request.formData();
    const file = formData.get("pdf") as File | null;
    const model =
      (formData.get("model") as string) || "google/gemini-2.5-pro";

    if (!file) {
      return NextResponse.json(
        { error: "No PDF file provided" },
        { status: 400 }
      );
    }

    const apiKey =
      (formData.get("apiKey") as string) || process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "No API key provided. Set one in Settings or configure OPENROUTER_API_KEY." },
        { status: 500 }
      );
    }

    const pdfBuffer = Buffer.from(await file.arrayBuffer());
    const base64Pdf = pdfBuffer.toString("base64");

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "X-Title": "Biomarker Extract",
        },
        body: JSON.stringify({
          model,
          provider: {
            data_collection: "deny",
          },
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: EXTRACTION_PROMPT },
                {
                  type: "file",
                  file: {
                    filename: file.name || "lab-report.pdf",
                    file_data: `data:application/pdf;base64,${base64Pdf}`,
                  },
                },
              ],
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0,
          max_tokens: 16000,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter error:", response.status, errorText);
      return NextResponse.json(
        { error: `OpenRouter API error: ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.json();

    if (!data.choices?.[0]?.message?.content) {
      return NextResponse.json(
        { error: "No content in LLM response" },
        { status: 502 }
      );
    }

    let extraction: ExtractionResult;
    try {
      extraction = JSON.parse(data.choices[0].message.content);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse LLM response as JSON" },
        { status: 502 }
      );
    }

    // Add UUIDs to each biomarker
    extraction.biomarkers = extraction.biomarkers.map((b) => ({
      ...b,
      id: crypto.randomUUID(),
    }));

    // Match against canonical biomarker registry
    extraction.biomarkers = extraction.biomarkers.map((b) => {
      const specimen =
        b.category === "Urinalysis"
          ? "urine"
          : ["Body Composition", "Bone", "Muscle Balance"].includes(b.category)
            ? "body_composition"
            : "blood";
      const canonical = matchBiomarker(
        b.rawName,
        specimen as "blood" | "urine" | "body_composition",
        b.region
      );
      return {
        ...b,
        canonicalSlug: canonical?.slug ?? null,
        metricName: canonical?.displayName ?? b.metricName,
        category: canonical?.category ?? b.category,
      };
    });

    const duration = Date.now() - startTime;

    const result: ExtractionResponse = {
      extraction,
      meta: {
        model: data.model || model,
        tokensUsed: data.usage?.total_tokens ?? null,
        duration,
      },
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("Extraction error:", err);
    return NextResponse.json(
      { error: "Internal extraction error" },
      { status: 500 }
    );
  }
}
