import {
  PDF_MAX_SIZE_BYTES,
  PDF_MAX_SIZE_LABEL,
  PDF_MAGIC_BYTES,
} from "@/lib/constants";

export type PdfValidationCode =
  | "FILE_TOO_LARGE"
  | "NOT_A_PDF"
  | "PASSWORD_PROTECTED"
  | "CORRUPTED_PDF";

export interface PdfValidationError {
  code: PdfValidationCode;
  message: string;
}

/** Client-side: validate file size before upload. */
export function validatePdfFile(file: File): PdfValidationError | null {
  if (file.size > PDF_MAX_SIZE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      code: "FILE_TOO_LARGE",
      message: `File is too large (${sizeMB} MB). Maximum size is ${PDF_MAX_SIZE_LABEL}.`,
    };
  }
  return null;
}

/** Server-side: validate file size + magic bytes (%PDF header). */
export function validatePdfBytes(buffer: Buffer): PdfValidationError | null {
  if (buffer.length > PDF_MAX_SIZE_BYTES) {
    const sizeMB = (buffer.length / (1024 * 1024)).toFixed(1);
    return {
      code: "FILE_TOO_LARGE",
      message: `File is too large (${sizeMB} MB). Maximum size is ${PDF_MAX_SIZE_LABEL}.`,
    };
  }

  if (buffer.length < PDF_MAGIC_BYTES.length) {
    return {
      code: "NOT_A_PDF",
      message: "This file is not a valid PDF.",
    };
  }

  for (let i = 0; i < PDF_MAGIC_BYTES.length; i++) {
    if (buffer[i] !== PDF_MAGIC_BYTES[i]) {
      return {
        code: "NOT_A_PDF",
        message: "This file is not a valid PDF.",
      };
    }
  }

  return null;
}

/** Classify a pdf-lib load error into a specific user message. */
export function classifyPdfLoadError(err: unknown): PdfValidationError {
  const message =
    err instanceof Error ? err.message : String(err);

  if (/encrypt/i.test(message)) {
    return {
      code: "PASSWORD_PROTECTED",
      message:
        "This PDF is password-protected. Please remove the password and try again.",
    };
  }

  return {
    code: "CORRUPTED_PDF",
    message:
      "This PDF appears to be corrupted or invalid. Please try a different file.",
  };
}
