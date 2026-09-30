import { NextResponse } from "next/server";
import { refreshDrafts } from "@/lib/pipeline";

export const maxDuration = 300;

// Generates missing briefs / email drafts for the current ranking, a batch at a time.
export async function POST() {
  try {
    return NextResponse.json(await refreshDrafts());
  } catch (e) {
    return NextResponse.json({ error: String((e as Error)?.message ?? e) }, { status: 500 });
  }
}
