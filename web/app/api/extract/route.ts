import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { EXTRACTION_PROMPT } from "@/lib/prompt";
import { ExtractionResult, ExtractionResponse } from "@/lib/types";
import { matchBiomarker } from "@/lib/biomarker-registry";
import { PDFDocument } from "pdf-lib";
import {
  OPENROUTER_API_URL,
  DEFAULT_MODEL,
  EXTRACTION_MAX_TOKENS,
  EXTRACTION_TEMPERATURE,
  CHUNK_PAGE_THRESHOLD,
  CHUNK_SIZE,
  FETCH_TIMEOUT_MS,
} from "@/lib/constants";

export const maxDuration = 300;

async function extractChunk(
  pdfBuffer: Buffer,
  filename: string,
  model: string,
  apiKey: string,
  signal: AbortSignal
): Promise<{ extraction: ExtractionResult; usage: any }> {
  const base64Pdf = pdfBuffer.toString("base64");

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-Title": "Biomarker Extract",
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
    const errorText = await response.text();
    console.error("OpenRouter error:", response.status, errorText);
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.choices?.[0]?.message?.content) {
    throw new Error("No content in LLM response");
  }

  const finishReason = data.choices[0].finish_reason;
  if (finishReason === "length") {
    console.error("Extraction truncated: output hit max_tokens limit");
    throw new Error(
      "The extraction output was truncated because the report contains too many results. Please try a shorter report."
    );
  }

  let extraction: ExtractionResult;
  try {
    extraction = JSON.parse(data.choices[0].message.content);
  } catch {
    const contentLength = data.choices[0].message.content?.length ?? 0;
    console.error(
      "JSON parse failed — finish_reason:",
      finishReason,
      "content length:",
      contentLength
    );
    throw new Error("Failed to parse LLM response as JSON");
  }

  return { extraction, usage: data.usage };
}

export async function POST(request: NextRequest) {
  const { data: session } = await auth.getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const startTime = Date.now();

  try {
    const formData = await request.formData();
    const file = formData.get("pdf") as File | null;
    const model = (formData.get("model") as string) || DEFAULT_MODEL;

    if (!file) {
      return NextResponse.json(
        { error: "No PDF file provided" },
        { status: 400 }
      );
    }

    const apiKey = formData.get("apiKey") as string;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "No API key configured. Add your OpenRouter API key in Settings.",
        },
        { status: 400 }
      );
    }

    const pdfBuffer = Buffer.from(await file.arrayBuffer());
    const filename = file.name || "lab-report.pdf";

    // Stream response with keep-alive to prevent browser timeout
    // (ERR_NETWORK_IO_SUSPENDED) during long extractions
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const keepAlive = setInterval(() => {
          controller.enqueue(encoder.encode(" "));
        }, 15_000);

        try {
          // Determine if we need to chunk
          const pdfDoc = await PDFDocument.load(pdfBuffer);
          const pageCount = pdfDoc.getPageCount();

          let extraction: ExtractionResult;
          let totalTokens: number | null = null;

          if (pageCount <= CHUNK_PAGE_THRESHOLD) {
            // Small PDF — single extraction call
            const abortController = new AbortController();
            const timeout = setTimeout(() => abortController.abort(), FETCH_TIMEOUT_MS);
            try {
              const result = await extractChunk(
                pdfBuffer,
                filename,
                model,
                apiKey,
                abortController.signal
              );
              extraction = result.extraction;
              totalTokens = result.usage?.total_tokens ?? null;
            } finally {
              clearTimeout(timeout);
            }
          } else {
            // Large PDF — split into chunks and extract in parallel
            const chunks: { buffer: Buffer; startPage: number }[] = [];
            for (let i = 0; i < pageCount; i += CHUNK_SIZE) {
              const chunkDoc = await PDFDocument.create();
              const end = Math.min(i + CHUNK_SIZE, pageCount);
              const pageIndices = Array.from(
                { length: end - i },
                (_, idx) => i + idx
              );
              const copiedPages = await chunkDoc.copyPages(pdfDoc, pageIndices);
              copiedPages.forEach((page) => chunkDoc.addPage(page));
              const chunkBytes = await chunkDoc.save();
              chunks.push({
                buffer: Buffer.from(chunkBytes),
                startPage: i + 1, // 1-indexed
              });
            }

            console.log(
              `Chunked extraction: ${pageCount} pages → ${chunks.length} chunks`
            );

            const abortController = new AbortController();
            const timeout = setTimeout(() => abortController.abort(), FETCH_TIMEOUT_MS);
            try {
              const results = await Promise.all(
                chunks.map(async (chunk, idx) => {
                  const chunkStart = Date.now();
                  const result = await extractChunk(
                    chunk.buffer,
                    `${filename} (chunk ${idx + 1}/${chunks.length})`,
                    model,
                    apiKey,
                    abortController.signal
                  );
                  console.log(
                    `Chunk ${idx + 1}/${chunks.length} completed in ${((Date.now() - chunkStart) / 1000).toFixed(1)}s`
                  );
                  return result;
                })
              );

              // Merge: reportInfo from first chunk, concatenate biomarkers with page offset
              extraction = {
                reportInfo: results[0].extraction.reportInfo,
                biomarkers: [],
              };

              const seen = new Set<string>();
              for (let i = 0; i < results.length; i++) {
                const offset = chunks[i].startPage - 1;
                for (const b of results[i].extraction.biomarkers) {
                  const adjusted = { ...b, page: b.page + offset };
                  const dedupKey = `${b.rawName}|${b.value}`;
                  if (!seen.has(dedupKey)) {
                    seen.add(dedupKey);
                    extraction.biomarkers.push(adjusted);
                  }
                }
              }

              // Aggregate tokens
              totalTokens = results.reduce(
                (sum, r) => sum + (r.usage?.total_tokens ?? 0),
                0
              );
            } finally {
              clearTimeout(timeout);
            }
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
              model: model,
              tokensUsed: totalTokens,
              duration,
            },
          };

          controller.enqueue(encoder.encode(JSON.stringify(result)));
        } catch (err: any) {
          const errorBody = err?.name === "AbortError"
            ? { error: "Extraction timed out. Please try a shorter report." }
            : { error: err?.message || "Internal extraction error" };
          if (err?.name !== "AbortError") console.error("Extraction error:", err);
          controller.enqueue(encoder.encode(JSON.stringify(errorBody)));
        } finally {
          clearInterval(keepAlive);
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    // This catch only handles errors before streaming starts (formData parsing)
    console.error("Pre-extraction error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal error" },
      { status: 500 }
    );
  }
}
