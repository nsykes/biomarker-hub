import { NextRequest } from "next/server";
import { PDFDocument } from "pdf-lib";
import { auth } from "@/lib/auth/server";
import { ExtractionResult, ExtractionResponse } from "@/lib/types";
import { DEFAULT_MODEL, CHUNK_PAGE_THRESHOLD, FETCH_TIMEOUT_MS } from "@/lib/constants";
import { validatePdfBytes, classifyPdfLoadError } from "@/lib/pdf-validation";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { log } from "@/lib/logger";
import { extractChunk } from "@/lib/extraction/extract-chunk";
import { chunkPdf } from "@/lib/extraction/chunk-pdf";
import { postProcessExtraction } from "@/lib/extraction/post-process";
import { UserError } from "@/lib/extraction/errors";
import { jsonResponse } from "@/lib/http";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const { data: session } = await auth.getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const limit = await checkRateLimit("extraction", session.user.id);
  if (!limit.success) {
    return jsonResponse(
      { error: "Rate limit exceeded. Try again shortly." },
      { status: 429, headers: rateLimitHeaders(limit, true) }
    );
  }

  const startTime = Date.now();

  try {
    const formData = await request.formData();
    const file = formData.get("pdf") as File | null;
    const model = (formData.get("model") as string) || DEFAULT_MODEL;

    if (!file) {
      return jsonResponse({ error: "No PDF file provided" }, { status: 400 });
    }

    const apiKey = formData.get("apiKey") as string;
    if (!apiKey) {
      return jsonResponse(
        {
          error:
            "No API key configured. Add your OpenRouter API key in Settings.",
        },
        { status: 400 }
      );
    }

    const pdfBuffer = Buffer.from(await file.arrayBuffer());
    const filename = file.name || "lab-report.pdf";

    const pdfError = validatePdfBytes(pdfBuffer);
    if (pdfError) {
      return jsonResponse({ error: pdfError.message }, { status: 400 });
    }

    // Stream response with keep-alive to prevent browser timeout
    // (ERR_NETWORK_IO_SUSPENDED) during long extractions
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const keepAlive = setInterval(() => {
          controller.enqueue(encoder.encode(" "));
        }, 15_000);

        try {
          let pdfDoc;
          try {
            pdfDoc = await PDFDocument.load(pdfBuffer);
          } catch (loadErr) {
            throw new UserError(classifyPdfLoadError(loadErr).message);
          }
          const pageCount = pdfDoc.getPageCount();

          let extraction: ExtractionResult;
          let totalTokens: number | null = null;

          const abortController = new AbortController();
          const timeout = setTimeout(
            () => abortController.abort(),
            FETCH_TIMEOUT_MS
          );
          try {
            if (pageCount <= CHUNK_PAGE_THRESHOLD) {
              const result = await extractChunk(
                pdfBuffer,
                filename,
                model,
                apiKey,
                abortController.signal
              );
              extraction = result.extraction;
              totalTokens = result.usage?.total_tokens ?? null;
            } else {
              const chunks = await chunkPdf(pdfDoc, pageCount);
              const results = await Promise.all(
                chunks.map((chunk, idx) =>
                  extractChunk(
                    chunk.buffer,
                    `${filename} (chunk ${idx + 1}/${chunks.length})`,
                    model,
                    apiKey,
                    abortController.signal
                  )
                )
              );

              extraction = {
                reportInfo: results[0].extraction.reportInfo,
                biomarkers: [],
              };
              for (let i = 0; i < results.length; i++) {
                const offset = chunks[i].startPage - 1;
                for (const b of results[i].extraction.biomarkers) {
                  extraction.biomarkers.push({ ...b, page: b.page + offset });
                }
              }

              totalTokens = results.reduce(
                (sum, r) => sum + (r.usage?.total_tokens ?? 0),
                0
              );
            }
          } finally {
            clearTimeout(timeout);
          }

          extraction = postProcessExtraction(extraction);

          const result: ExtractionResponse = {
            extraction,
            meta: {
              model,
              tokensUsed: totalTokens,
              duration: Date.now() - startTime,
            },
          };

          controller.enqueue(encoder.encode(JSON.stringify(result)));
        } catch (err: unknown) {
          const e = err as { name?: string; message?: string } | undefined;
          let errorBody: { error: string };
          if (e?.name === "AbortError") {
            errorBody = {
              error: "Extraction timed out. Please try a shorter report.",
            };
          } else if (err instanceof UserError) {
            errorBody = { error: err.message };
          } else {
            log.error("extract.failed", err);
            errorBody = { error: "Internal extraction error" };
          }
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
  } catch (err: unknown) {
    // This catch only handles errors before streaming starts (formData parsing)
    log.error("extract.pre_failed", err);
    return jsonResponse({ error: "Internal error" }, { status: 500 });
  }
}
