import { createHash } from "crypto";

export const PDF_MIME = "application/pdf";
export const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** Below this many characters we treat the file as having no readable text (e.g. a scan). */
export const MIN_READABLE_CHARS = 200;

export interface ExtractedResumeText {
  text: string;
  pageCount: number | null;
}

export class TextExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TextExtractionError";
  }
}

/**
 * Extract plain text from a PDF or DOCX resume, keeping one line per paragraph /
 * bullet so the analysis can reference individual bullets.
 */
export async function extractResumeText(
  buffer: Buffer,
  file: { mimeType?: string; fileType?: string }
): Promise<ExtractedResumeText> {
  const kind = detectKind(file);

  let raw: string;
  let pageCount: number | null = null;

  if (kind === "pdf") {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const result = await extractText(pdf, { mergePages: false });
    pageCount = result.totalPages;
    raw = result.text.join("\n");
  } else if (kind === "docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    raw = result.value;
  } else {
    throw new TextExtractionError("Only PDF and DOCX resumes can be analyzed.");
  }

  const text = normalizeText(raw);
  if (text.length < MIN_READABLE_CHARS) {
    throw new TextExtractionError(
      "We couldn't read any text from this file. If it's a scanned image, export it as a text-based PDF or DOCX."
    );
  }

  return { text, pageCount };
}

function detectKind(file: { mimeType?: string; fileType?: string }): "pdf" | "docx" | null {
  const ext = (file.fileType || "").toLowerCase();
  if (file.mimeType === PDF_MIME || ext === ".pdf" || ext === "pdf") return "pdf";
  if (file.mimeType === DOCX_MIME || ext === ".docx" || ext === "docx") return "docx";
  return null;
}

/** Collapse runs of spaces, trim each line, and drop empty lines. */
export function normalizeText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/ /g, " ")
    .split("\n")
    .map((line) => line.replace(/[ \t\f\v]+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

export function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}
