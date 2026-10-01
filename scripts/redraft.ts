// Regenerates email drafts with the current writer. Skips sent emails and drafts
// Arjun has edited (locked). Usage: npm run redraft [-- --dry <n>]
import { getCriteria, sql, type CandidateRow, type EmailDraftRow, type ScoreRow } from "../lib/db";
import { findAiTells, writeEmail } from "../lib/writing";

async function main() {
  const dry = process.argv.includes("--dry") ? Number(process.argv[process.argv.indexOf("--dry") + 1] ?? 2) : 0;
  const criteria = await getCriteria();
  let drafts = (await sql()`SELECT * FROM email_drafts WHERE status <> 'sent' AND locked = false ORDER BY type`) as EmailDraftRow[];
  if (dry) drafts = [drafts.find((d) => d.type === "invite")!, drafts.find((d) => d.type === "rejection")!].slice(0, dry);
  console.log(`${dry ? "DRY RUN on" : "Redrafting"} ${drafts.length} email(s)`);
  let next = 0, done = 0;
  await Promise.all(Array.from({ length: dry ? 1 : 3 }, async () => {
    while (next < drafts.length) {
      const d = drafts[next++];
      const [c] = (await sql()`SELECT * FROM candidates WHERE id = ${d.candidate_id}`) as CandidateRow[];
      const scores = (await sql()`SELECT * FROM scores WHERE candidate_id = ${d.candidate_id}`) as ScoreRow[];
      try {
        const e = await writeEmail({ type: d.type, role: c.applied_role, content: c.cv_content, criteria,
          scores: scores.map((s) => ({ code: s.criterion_code, score: s.score, reason: s.reason, evidence: s.evidence, doubt: s.doubt })) });
        if (dry) { console.log(`\n=== ${c.personal_details.name} (${d.type})\nSubject: ${e.subject}\n\n${e.body}\n--- tells: ${findAiTells(e.subject + e.body).join(", ") || "none"}`); continue; }
        await sql()`UPDATE email_drafts SET subject = ${e.subject}, body = ${e.body}, updated_at = now() WHERE candidate_id = ${d.candidate_id} AND status <> 'sent' AND locked = false`;
        done++;
        if (done % 10 === 0) console.log(`${done}/${drafts.length}`);
      } catch (err) { console.log(`FAIL ${c.personal_details.name}: ${(err as Error).message.slice(0, 150)}`); }
    }
  }));
  if (!dry) console.log(`done: ${done}/${drafts.length}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
