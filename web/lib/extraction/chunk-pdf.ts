import { PDFDocument } from "pdf-lib";
import { CHUNK_SIZE } from "@/lib/constants";

export interface PdfChunk {
  buffer: Buffer;
  /** 1-indexed starting page in the original document. Used to offset
   *  biomarker `page` fields back to original-PDF coordinates after chunked
   *  extraction. */
  startPage: number;
}

/** Split a multi-page PDF into fixed-size chunks for parallel extraction. */
export async function chunkPdf(
  pdfDoc: PDFDocument,
  pageCount: number
): Promise<PdfChunk[]> {
  const chunks: PdfChunk[] = [];
  for (let i = 0; i < pageCount; i += CHUNK_SIZE) {
    const chunkDoc = await PDFDocument.create();
    const end = Math.min(i + CHUNK_SIZE, pageCount);
    const pageIndices = Array.from({ length: end - i }, (_, idx) => i + idx);
    const copiedPages = await chunkDoc.copyPages(pdfDoc, pageIndices);
    copiedPages.forEach((page) => chunkDoc.addPage(page));
    const chunkBytes = await chunkDoc.save();
    chunks.push({ buffer: Buffer.from(chunkBytes), startPage: i + 1 });
  }
  return chunks;
}
