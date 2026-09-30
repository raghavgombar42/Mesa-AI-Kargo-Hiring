/* eslint-disable @typescript-eslint/no-explicit-any */
// Dry run of Stage 1 (parse -> PII split -> duplicate check -> screen) over a folder,
// no database. Usage: npm run screen-report -- <folder> [out.json]
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileToText } from "../lib/parse";
import { splitPersonalDetails } from "../lib/pii";
import { evaluateScreen, extractScreenFacts, findDuplicate } from "../lib/screening";
import { RUBRIC } from "../lib/rubric-data";
import { scoreCandidate } from "../lib/scoring";
import type { Role } from "../lib/rubric-data";

const roleFromFile = (f: string): Role | "AUTO" => (/^spm_/i.test(f) ? "SPM" : /^pm_/i.test(f) ? "PM" : "AUTO");

async function main() {
  const [dir, out] = process.argv.slice(2);
  const files = readdirSync(dir).filter((f) => /\.(pdf|docx|txt)$/i.test(f)).sort();
  const docs: { file: string; name: string | null | undefined; content: string; selected: Role | "AUTO"; duplicateOf: string | null }[] = [];
  for (const f of files) {
    const raw = await fileToText(f, new Uint8Array(readFileSync(join(dir, f))));
    const { personal, content } = splitPersonalDetails(raw, f);
    const dup = findDuplicate(content, docs.map((d) => ({ id: d.file, cv_content: d.content })));
    docs.push({ file: f, name: personal.name, content, selected: roleFromFile(f), duplicateOf: dup?.id ?? null });
  }
  const results: any[] = new Array(docs.length);
  let next = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (next < docs.length) {
      const i = next++;
      const d = docs[i];
      const facts = await extractScreenFacts(d.content);
      const s = evaluateScreen(d.selected, facts, d.content, d.duplicateOf);
      const sc = await scoreCandidate(d.content, RUBRIC);
      results[i] = { ...d, content: undefined, ...s, headline: sc.headline, pm_score: sc.pm_score, spm_score: sc.spm_score,
        crit: sc.results.map((x) => ({ code: x.code, score: x.score, reason: x.reason })) };
      process.stdout.write(".");
    }
  }));
  console.log();
  for (const r of results) {
    const fails = r.gates.filter((g: any) => !g.pass).map((g: any) => g.key).join(",");
    console.log(`${r.file.padEnd(28)} ${String(r.selected).padEnd(4)}->${r.role.padEnd(3)} ${r.passed ? "PASS" : "FAIL"} ft=${r.facts.full_time_months} own=${r.facts.ownership_months} ops=${r.facts.ops_exposure} out=${r.facts.quantified_outcomes.length} ${fails ? "failed:" + fails : ""}${r.duplicateOf ? " dup-of:" + r.duplicateOf : ""} PM=${r.pm_score} SPM=${r.spm_score}`);
  }
  const pass = results.filter((r) => r.passed);
  console.log(`\nPassed ${pass.length}/${results.length}  (PM ${pass.filter((r) => r.role === "PM").length}, SPM ${pass.filter((r) => r.role === "SPM").length})`);
  if (out) writeFileSync(out, JSON.stringify(results, null, 2));
}
main().catch((e) => { console.error(e); process.exit(1); });
