// Bulk-loads a folder of CVs through the real pipeline into Neon (same code path as
// the Upload page), then drafts briefs + emails. Role comes from the file prefix:
// pm_* -> PM, spm_* -> SPM, anything else -> not specified (the screen routes it).
// Usage: npm run ingest -- <folder> [--role PM|SPM|AUTO]
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "../lib/db";
import { ingestCv, refreshDrafts } from "../lib/pipeline";
import type { Role } from "../lib/rubric-data";

const roleFromFile = (f: string): Role | "AUTO" => (/^spm_/i.test(f) ? "SPM" : /^pm_/i.test(f) ? "PM" : "AUTO");

async function main() {
  const args = process.argv.slice(2);
  const dir = args[0];
  const forced = args.includes("--role") ? (args[args.indexOf("--role") + 1] as Role | "AUTO") : null;
  if (!dir) throw new Error("Usage: npm run ingest -- <folder> [--role PM|SPM|AUTO]");

  const already = new Set(((await sql()`SELECT file_name FROM candidates`) as { file_name: string }[]).map((r) => r.file_name));
  const files = readdirSync(dir).filter((f) => /\.(pdf|docx|txt)$/i.test(f) && !already.has(f)).sort();
  console.log(`${files.length} new file(s) to process (${already.size} already in the database)`);

  // Sequential on purpose: each CV's duplicate check must see the ones before it.
  for (const f of files) {
    const t = Date.now();
    try {
      await ingestCv(f, new Uint8Array(readFileSync(join(dir, f))), forced ?? roleFromFile(f));
      console.log(`ok   ${f} (${((Date.now() - t) / 1000).toFixed(1)}s)`);
    } catch (e) {
      console.log(`FAIL ${f}: ${(e as Error).message}`);
    }
  }

  for (let i = 0; i < 60; i++) {
    const r = await refreshDrafts(8);
    console.log(`drafts: ${r.done} done, ${r.remaining} remaining${r.errors.length ? `, errors: ${r.errors.join(" | ")}` : ""}`);
    if (!r.remaining) break;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
