import { NextResponse } from "next/server";
import { ingestCv } from "@/lib/pipeline";

export const maxDuration = 300;

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  const role = form.get("role");

  if (!(file instanceof File)) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  if (role !== "PM" && role !== "SPM" && role !== "AUTO") return NextResponse.json({ error: "Select PM, SPM or Not specified" }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "File is over 10 MB" }, { status: 400 });

  try {
    const id = await ingestCv(file.name, new Uint8Array(await file.arrayBuffer()), role);
    return NextResponse.json({ id });
  } catch (e) {
    return NextResponse.json({ error: String((e as Error)?.message ?? e) }, { status: 500 });
  }
}
