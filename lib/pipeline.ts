import { BRIEF_TOP_N, INVITE_MIN_SCORE, INVITE_TOP_N } from "./config";
import { getCriteria, num, sql, type CandidateRow, type EmailDraftRow, type ScoreRow } from "./db";
import { fileToText } from "./parse";
import { splitPersonalDetails } from "./pii";
import type { Criterion, Role } from "./rubric-data";
import { scoreCandidate } from "./scoring";
import { evaluateScreen, extractScreenFacts, findDuplicate } from "./screening";
import { writeBrief, writeEmail, type ScoreLine } from "./writing";

const errMsg = (e: unknown) => String((e as Error)?.message ?? e).slice(0, 500);

/**
 * Stage 0: read the file and split personal details off (code only), check for a
 * duplicate (code only), store. Then stage 1 + 2 run on the redacted content.
 */
export async function ingestCv(fileName: string, bytes: Uint8Array, selected: Role | "AUTO") {
  const raw = await fileToText(fileName, bytes);
  const { personal, content } = splitPersonalDetails(raw, fileName);

  const existing = (await sql()`SELECT id, cv_content FROM candidates`) as Pick<CandidateRow, "id" | "cv_content">[];
  const dup = findDuplicate(content, existing);

  const [row] = await sql()`
    INSERT INTO candidates (applied_role, selected_role, file_name, personal_details, cv_content, status, duplicate_of)
    VALUES (${selected === "AUTO" ? "PM" : selected}, ${selected}, ${fileName}, ${JSON.stringify(personal)}::jsonb, ${content}, 'scoring', ${dup?.id ?? null})
    RETURNING id`;
  const id = row.id as string;
  await scoreStoredCandidate(id);
  return id;
}

/**
 * Stage 1 (hard screen) and stage 2 (rubric on both roles) in parallel. Every
 * candidate is scored, even if screened out: it costs one call, satisfies "every
 * candidate has both scores", and lets us flag a screen that looks wrong.
 */
export async function scoreStoredCandidate(id: string) {
  const [cand] = (await sql()`SELECT id, cv_content, selected_role, duplicate_of FROM candidates WHERE id = ${id}`) as Pick<
    CandidateRow,
    "id" | "cv_content" | "selected_role" | "duplicate_of"
  >[];
  if (!cand) throw new Error("Candidate not found");
  await sql()`UPDATE candidates SET status = 'scoring', error = NULL WHERE id = ${id}`;
  try {
    const criteria = await getCriteria();
    // Only the redacted cv_content goes to the model.
    const [facts, result] = await Promise.all([extractScreenFacts(cand.cv_content), scoreCandidate(cand.cv_content, criteria)]);
    const screen = evaluateScreen(cand.selected_role, facts, cand.cv_content, cand.duplicate_of);

    const q = sql();
    await q.transaction([
      q`DELETE FROM scores WHERE candidate_id = ${id}`,
      ...result.results.map(
        (r) => q`INSERT INTO scores (candidate_id, role, criterion_code, score, reason, evidence, doubt, evidence_verified)
                 VALUES (${id}, ${r.role}, ${r.code}, ${r.score}, ${r.reason}, ${r.evidence}, ${r.doubt}, ${r.evidence_verified})`,
      ),
      q`UPDATE candidates SET status = 'scored', error = NULL, headline = ${result.headline},
          applied_role = ${screen.role}, screen = ${JSON.stringify({ facts: screen.facts, gates: screen.gates, role_note: screen.role_note })}::jsonb,
          screen_passed = ${screen.passed},
          pm_score = ${result.pm_score}, spm_score = ${result.spm_score},
          brief = NULL, probes = NULL, brief_generated_at = NULL
        WHERE id = ${id}`,
    ]);
    return result;
  } catch (e) {
    await sql()`UPDATE candidates SET status = 'error', error = ${errMsg(e)} WHERE id = ${id}`;
    throw e;
  }
}

/** Screen decision after Arjun's override (override wins when set). */
export const isScreenedIn = (c: Pick<CandidateRow, "screen_passed" | "screen_override">) => c.screen_override ?? c.screen_passed ?? false;

// ------------------------------------------------------------------ ranking

export type RankedCandidate = CandidateRow & {
  rank: number;
  score: number;
  aboveLine: boolean;
  otherScore: number | null;
  draft: EmailDraftRow | null;
};

export function roleScore(c: Pick<CandidateRow, "pm_score" | "spm_score">, role: Role) {
  return num(role === "PM" ? c.pm_score : c.spm_score) ?? 0;
}

type WithDraft = CandidateRow & { draft: EmailDraftRow | null };

async function scoredWithDrafts(): Promise<WithDraft[]> {
  return (await sql()`
    SELECT c.*, CASE WHEN d.candidate_id IS NULL THEN NULL ELSE to_jsonb(d) END AS draft
    FROM candidates c LEFT JOIN email_drafts d ON d.candidate_id = c.id
    WHERE c.status = 'scored'`) as WithDraft[];
}

/** Candidates on the `role` track who passed the hard screen, ranked by that role's rubric. */
export async function rankRole(role: Role, rows?: WithDraft[]): Promise<RankedCandidate[]> {
  rows ??= await scoredWithDrafts();
  return rows
    .filter((c) => c.applied_role === role && isScreenedIn(c))
    .map((c) => ({ ...c, score: roleScore(c, role), otherScore: roleScore(c, role === "PM" ? "SPM" : "PM") }))
    .sort((a, b) => b.score - a.score || new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map((c, i) => ({ ...c, rank: i + 1, aboveLine: i < INVITE_TOP_N && c.score >= INVITE_MIN_SCORE }));
}

/** Candidates the hard screen removed (they still get a rejection draft and a rubric score). */
export async function screenedOut(rows?: WithDraft[]) {
  rows ??= await scoredWithDrafts();
  return rows
    .filter((c) => !isScreenedIn(c))
    .map((c) => ({ ...c, best: Math.max(roleScore(c, "PM"), roleScore(c, "SPM")) }))
    .sort((a, b) => b.best - a.best);
}

/** Safety net: the rubric likes someone the screen removed. */
export const screenLooksWrong = (c: Pick<CandidateRow, "pm_score" | "spm_score">) =>
  Math.max(roleScore(c, "PM"), roleScore(c, "SPM")) >= INVITE_MIN_SCORE;

export function candidateFlags(c: RankedCandidate, scores: Pick<ScoreRow, "criterion_code" | "score">[]) {
  const flags: string[] = [];
  const s = (code: string) => scores.find((x) => x.criterion_code === code)?.score ?? 0;
  const other = c.applied_role === "PM" ? "SPM" : "PM";
  if ((c.otherScore ?? 0) >= INVITE_MIN_SCORE && (c.otherScore ?? 0) > c.score) flags.push(`Scores higher for ${other}`);
  const p = c.applied_role; // rubric "honest limits": strong on B + C but no ops background
  if (s(`${p}-1`) === 0 && s(`${p}-2`) === 4 && s(`${p}-3`) === 4) flags.push("No ops background but strong builder/absorber - look manually");
  return flags;
}

// ------------------------------------------------------------------ briefs + drafts

type Task = { kind: "brief" | "email"; candidateId: string; role: Role; rank: number; total: number; type?: "invite" | "rejection" };

async function planTasks(): Promise<Task[]> {
  const tasks: Task[] = [];
  const rows = await scoredWithDrafts();
  for (const c of await screenedOut(rows)) {
    const d = c.draft;
    if (!d || (!d.locked && d.status !== "sent" && d.type !== "rejection")) {
      tasks.push({ kind: "email", candidateId: c.id, role: c.applied_role, rank: 10_000, total: 0, type: "rejection" });
    }
  }
  for (const role of ["PM", "SPM"] as Role[]) {
    const ranked = await rankRole(role, rows);
    for (const c of ranked) {
      if (c.rank <= BRIEF_TOP_N && !c.brief) tasks.push({ kind: "brief", candidateId: c.id, role, rank: c.rank, total: ranked.length });
      const wanted = c.aboveLine ? "invite" : "rejection";
      const d = c.draft;
      if (!d || (!d.locked && d.status !== "sent" && d.type !== wanted)) {
        tasks.push({ kind: "email", candidateId: c.id, role, rank: c.rank, total: ranked.length, type: wanted });
      }
    }
  }
  // Invites and briefs first: they matter most to Arjun.
  return tasks.sort((a, b) => a.rank - b.rank);
}

async function loadForWriting(id: string) {
  const [c] = (await sql()`SELECT * FROM candidates WHERE id = ${id}`) as CandidateRow[];
  const scores = (await sql()`SELECT * FROM scores WHERE candidate_id = ${id}`) as ScoreRow[];
  const lines: ScoreLine[] = scores.map((s) => ({ code: s.criterion_code, score: s.score, reason: s.reason, evidence: s.evidence, doubt: s.doubt }));
  return { c, lines };
}

async function runTask(t: Task, criteria: Criterion[]) {
  const { c, lines } = await loadForWriting(t.candidateId);
  if (!c) return;
  if (t.kind === "brief") {
    const { brief, probes } = await writeBrief({
      role: t.role, content: c.cv_content, headline: c.headline, weighted: roleScore(c, t.role),
      rank: t.rank, total: t.total, criteria, scores: lines,
    });
    await sql()`UPDATE candidates SET brief = ${brief}, probes = ${JSON.stringify(probes)}::jsonb, brief_generated_at = now() WHERE id = ${c.id}`;
  } else {
    await draftEmail(c.id, t.type!, false, { c, lines, criteria });
  }
}

export async function draftEmail(
  id: string,
  type: "invite" | "rejection",
  locked: boolean,
  pre?: { c: CandidateRow; lines: ScoreLine[]; criteria: Criterion[] },
) {
  const { c, lines } = pre ?? (await loadForWriting(id));
  const criteria = pre?.criteria ?? (await getCriteria());
  const { subject, body } = await writeEmail({ type, role: c.applied_role, content: c.cv_content, criteria, scores: lines });
  await sql()`
    INSERT INTO email_drafts (candidate_id, type, subject, body, locked, status, updated_at)
    VALUES (${id}, ${type}, ${subject}, ${body}, ${locked}, 'draft', now())
    ON CONFLICT (candidate_id) DO UPDATE SET type = EXCLUDED.type, subject = EXCLUDED.subject, body = EXCLUDED.body,
      locked = EXCLUDED.locked, status = 'draft', error = NULL, updated_at = now()
    WHERE email_drafts.status <> 'sent'`;
}

/**
 * Brings briefs and drafts in line with the current ranking. Does at most
 * `limit` AI calls per invocation (serverless time limits); call again while
 * `remaining > 0`.
 */
export async function refreshDrafts(limit = 6) {
  const criteria = await getCriteria();
  const tasks = await planTasks();
  const errors: string[] = [];
  let done = 0;
  for (const t of tasks.slice(0, limit)) {
    try {
      await runTask(t, criteria);
      done++;
    } catch (e) {
      errors.push(`${t.kind} for ${t.candidateId}: ${errMsg(e)}`);
    }
  }
  const remaining = Math.max(0, tasks.length - done);
  // If every task in the batch failed, stop the client loop instead of spinning.
  return { done, remaining: errors.length && done === 0 ? 0 : remaining, errors };
}
