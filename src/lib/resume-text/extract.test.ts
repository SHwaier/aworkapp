import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import {
  DOCX_MIME,
  extractResumeText,
  normalizeText,
  PDF_MIME,
  TextExtractionError,
} from "./extract";

const LINES = [
  "Jordan Rivera",
  "jordan.rivera@example.com",
  "Experience",
  "Built a Node.js and TypeScript ingestion service processing 2M events per day.",
  "Led migration of reporting jobs from cron scripts to a queue-based worker system.",
  "Education",
  "B.S. Computer Science, State University",
  "Skills",
  "TypeScript, Node.js, Python, Django, PostgreSQL, Redis, Docker, Git",
];

/** Minimal valid .docx with one paragraph per line. */
async function makeDocx(lines: string[]): Promise<Buffer> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`
  );
  const paragraphs = lines
    .map((l) => `<w:p><w:r><w:t xml:space="preserve">${l.replace(/&/g, "&amp;")}</w:t></w:r></w:p>`)
    .join("");
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs}</w:body></w:document>`
  );
  return zip.generateAsync({ type: "nodebuffer" });
}

/** Minimal valid one-page PDF with one text line per resume line. */
function makePdf(lines: string[]): Buffer {
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const stream = [
    "BT",
    "/F1 10 Tf",
    "14 TL",
    "50 780 Td",
    ...lines.map((l) => `(${esc(l)}) Tj T*`),
    "ET",
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

describe("normalizeText", () => {
  it("trims lines, collapses spaces and drops blank lines", () => {
    expect(normalizeText("  a   b \r\n\r\n\tc  ")).toBe("a b\nc");
  });
});

describe("extractResumeText", () => {
  it("extracts DOCX text with one line per paragraph", async () => {
    const { text, pageCount } = await extractResumeText(await makeDocx(LINES), {
      mimeType: DOCX_MIME,
    });
    expect(text.split("\n")).toEqual(LINES);
    expect(pageCount).toBeNull();
  });

  it("extracts PDF text and page count", async () => {
    const { text, pageCount } = await extractResumeText(makePdf(LINES), { mimeType: PDF_MIME });
    expect(pageCount).toBe(1);
    for (const line of LINES) expect(text).toContain(line);
  });

  it("detects the format from the file extension too", async () => {
    const { text } = await extractResumeText(await makeDocx(LINES), { fileType: ".docx" });
    expect(text).toContain("Jordan Rivera");
  });

  it("rejects files with almost no text, like scans", async () => {
    await expect(
      extractResumeText(await makeDocx(["Jordan"]), { mimeType: DOCX_MIME })
    ).rejects.toThrow(TextExtractionError);
  });

  it("rejects unsupported formats", async () => {
    await expect(extractResumeText(Buffer.from("hi"), { mimeType: "text/plain" })).rejects.toThrow(
      /Only PDF and DOCX/
    );
  });
});
