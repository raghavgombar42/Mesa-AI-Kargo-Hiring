// Runs past-hire CVs through the real pipeline (parse -> PII split -> Gemini
// scoring) WITHOUT touching the database, and compares against the calibration
// table in rubric.txt section 6. Usage: npm run calibrate -- <folder-of-cvs>

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileToText } from "../lib/parse";
import { splitPersonalDetails } from "../lib/pii";
import { RUBRIC } from "../lib/rubric-data";
import { scoreCandidate } from "../lib/scoring";

const EXPECTED: Record<string, { rating: string; pm: number; spm: number }> = {
  rohan: { rating: "Exceeds", pm: 97.5, spm: 95.0 },
  sunita: { rating: "Exceeds", pm: 96.3, spm: 95.0 },
  lavanya: { rating: "Exceeds", pm: 95.0, spm: 95.0 },
  meghna: { rating: "Exceeds", pm: 87.5, spm: 86.3 },
  aditya: { rating: "Exceeds", pm: 71.3, spm: 70.0 },
  preetham: { rating: "Below", pm: 22.5, spm: 20.0 },
  rahul: { rating: "Meets", pm: 17.5, spm: 17.5 },
  vikram: { rating: "Meets", pm: 12.5, spm: 13.8 },
};

async function main() {
  const dir = process.argv[2];
  if (!dir) throw new Error("Usage: npm run calibrate -- <folder-of-cvs>");
  const files = readdirSync(dir).filter((f) => /\.(pdf|docx|txt)$/i.test(f));
  const rows = [];
  for (const f of files) {
    const raw = await fileToText(f, new Uint8Array(readFileSync(join(dir, f))));
    const { personal, content } = splitPersonalDetails(raw, f);
    const r = await scoreCandidate(content, RUBRIC);
    const key = Object.keys(EXPECTED).find((k) => f.toLowerCase().includes(k));
    const exp = key ? EXPECTED[key] : undefined;
    const crit = (role: string) => r.results.filter((x) => x.role === role).map((x) => x.score).join(" ");
    rows.push({
      name: personal.name, rating: exp?.rating ?? "?",
      "PM crit": crit("PM"), PM: r.pm_score, "PM exp": exp?.pm,
      "SPM crit": crit("SPM"), SPM: r.spm_score, "SPM exp": exp?.spm,
      unverified: r.results.filter((x) => !x.evidence_verified && x.reason.startsWith("Scored 0: the quoted")).length,
    });
    console.log(`scored ${f}`);
  }
  console.table(rows);
  const exceeds = rows.filter((r) => r.rating === "Exceeds").map((r) => r.PM);
  const others = rows.filter((r) => r.rating !== "Exceeds" && r.rating !== "?").map((r) => r.PM);
  if (exceeds.length && others.length) {
    console.log(`Lowest Exceeds PM score: ${Math.min(...exceeds)} | highest Meets/Below PM score: ${Math.max(...others)} -> ${Math.min(...exceeds) > Math.max(...others) ? "SEPARATES ✓" : "DOES NOT SEPARATE ✗"}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
