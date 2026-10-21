import { AppError } from "@/lib/api/app-error";

/** Read a single uploaded file plus its text fields from a multipart request. */
export async function readUpload(
  request: Request
): Promise<{ file: Blob; originalFileName: string; fields: Record<string, string> }> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw new AppError("Expected a file upload.", 400);
  }
  const file = form.get("file");
  if (!file || !(file instanceof Blob)) {
    throw new AppError("No file uploaded", 400);
  }
  const fields: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (key !== "file" && typeof value === "string" && value.trim()) fields[key] = value;
  }
  const originalFileName =
    ("name" in file && typeof file.name === "string" && file.name) || "resume.pdf";
  return { file, originalFileName, fields };
}
