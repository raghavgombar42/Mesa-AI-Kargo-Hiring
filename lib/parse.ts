import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";

export async function fileToText(fileName: string, bytes: Uint8Array): Promise<string> {
  const ext = fileName.toLowerCase().split(".").pop();
  let text: string;

  if (ext === "pdf") {
    const pdf = await getDocumentProxy(bytes);
    const { text: pages } = await extractText(pdf, { mergePages: false });
    text = pages.join("\n");
  } else if (ext === "docx") {
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    text = value;
  } else if (ext === "txt" || ext === "md") {
    text = new TextDecoder().decode(bytes);
  } else {
    throw new Error(`Unsupported file type ".${ext}" - upload PDF, DOCX or TXT`);
  }

  text = text
    // Postgres rejects NUL bytes; some PDFs embed them (and other control chars) in text runs.
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t ]+/g, " ")
    .split("\n")
    .map((l) => l.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (text.length < 200) {
    throw new Error("Almost no text could be read from this file - it may be a scanned image. Upload a text-based PDF or DOCX.");
  }
  return text;
}
