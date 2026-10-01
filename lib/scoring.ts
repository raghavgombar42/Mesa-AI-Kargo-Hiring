import { SCORING_READS, SCORING_THINKING } from "./config";
import { generateJSON } from "./gemini";
import { SCORING_RULES, type Criterion, type Role } from "./rubric-data";

export type CriterionResult = {
  role: Role;
  code: string;
  score: number;
  reason: string;
  evidence: string;
  doubt: string;
  evidence_verified: boolean;
};

export type ScoreResult = {
  headline: string;
  results: CriterionResult[];
  pm_score: number;
  spm_score: number;
};

const SYSTEM = `You are the hiring analyst for Kargo, a Series A logistics SaaS company in Mumbai that builds software for mid-sized freight forwarders and 3PLs (shipment tracking, documentation, carrier coordination).

You score one CV against a rubric that was calibrated on the founder's past hires - NOT on the job description. The people who thrived at Kargo had (A) personally sat in the operator's chair of live freight/logistics operations, (B) built fixes nobody asked for that other people adopted, and (C) absorbed breaks themselves without extra headcount or escalation. Polished PM credentials, frameworks and brand names did NOT predict success.

You will only ever see redacted CV text. Personal details appear as [CANDIDATE], [EMAIL], [PHONE], [LINK]. Never guess at identity, gender, age or origin.

${SCORING_RULES}

Be strict and consistent: two analysts reading the same CV must reach the same score. When between two anchors, choose the lower one and write the doubt down.`;

function renderRubric(criteria: Criterion[]) {
  return criteria
    .map(
      (c) =>
        `### ${c.code} - ${c.name} (${c.role}, weight ${c.weight}%)\nWhat a strong candidate looks like: ${c.description}\nAnchors:\n${c.anchors
          .map((a) => `  ${a.score} - ${a.text}`)
          .join("\n")}`,
    )
    .join("\n\n");
}

// --- Evidence check: the quoted evidence must actually appear in the CV.
const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export function evidenceAppears(evidence: string, content: string) {
  const e = norm(evidence);
  if (!e) return false;
  const c = norm(content);
  if (c.includes(e)) return true;
  // Allow light trimming/ellipsis: 80% of the quote's words must appear in the CV
  // and they must include a contiguous run of 5+ words.
  const words = e.split(" ");
  const cvWords = new Set(c.split(" "));
  const coverage = words.filter((w) => cvWords.has(w)).length / words.length;
  let longestRun = 0;
  for (let i = 0; i < words.length; i++) {
    for (let j = words.length; j > i + longestRun; j--) {
      if (c.includes(words.slice(i, j).join(" "))) {
        longestRun = j - i;
        break;
      }
    }
  }
  return coverage >= 0.8 && longestRun >= Math.min(5, words.length);
}

export function weightedScore(results: { code: string; score: number }[], criteria: Criterion[]) {
  const total = criteria.reduce((sum, c) => {
    const r = results.find((x) => x.code === c.code);
    return sum + ((r?.score ?? 0) / 4) * c.weight;
  }, 0);
  return Math.round(total * 10) / 10;
}

type ModelOutput = {
  headline: string;
  criteria: { code: string; evidence: string; score: number; reason: string; doubt: string }[];
};

/**
 * Scores redacted CV content against both the PM and the SPM rubric. Each role is
 * its own model call and the calls run in parallel: smaller, focused prompts are
 * about 3x faster than one big call and just as consistent (see the speed notes in
 * docs/HIRING_WORKFLOW.md).
 */
export async function scoreCandidate(content: string, criteria: Criterion[]): Promise<ScoreResult> {
  const roles = [...new Set(criteria.map((c) => c.role))];
  const parts = await Promise.all(roles.map((role) => scoreGroup(content, criteria.filter((c) => c.role === role))));
  const results = parts.flatMap((p) => p.results);
  return {
    headline: parts.find((p) => p.headline)?.headline ?? "",
    results,
    pm_score: weightedScore(results, criteria.filter((c) => c.role === "PM")),
    spm_score: weightedScore(results, criteria.filter((c) => c.role === "SPM")),
  };
}

async function scoreGroup(content: string, criteria: Criterion[]): Promise<Pick<ScoreResult, "headline" | "results">> {
  const codes = criteria.map((c) => c.code);

  const schema = {
    type: "object",
    properties: {
      headline: {
        type: "string",
        description:
          "One line (max 20 words) describing who this candidate is professionally: current function, domain, and the most relevant operating background. No name, no adjectives.",
      },
      criteria: {
        type: "array",
        description: `Exactly one entry for each of: ${codes.join(", ")}`,
        minItems: codes.length,
        maxItems: codes.length,
        items: {
          type: "object",
          properties: {
            code: { type: "string", enum: codes },
            evidence: {
              type: "string",
              description:
                "The single most relevant excerpt COPIED VERBATIM from the CV (one continuous span, max 35 words). Empty string only if score is 0.",
            },
            score: { type: "integer", minimum: 0, maximum: 4 },
            reason: {
              type: "string",
              description: "One line (max 25 words): which anchor this matches and why, pointing at the evidence.",
            },
            doubt: {
              type: "string",
              description: "What is ambiguous and should be probed in interview. Empty string if nothing.",
            },
          },
          required: ["code", "evidence", "score", "reason", "doubt"],
        },
      },
    },
    required: ["headline", "criteria"],
  };

  const prompt = `RUBRIC\n\n${renderRubric(criteria)}\n\n---\nCV (redacted)\n\n${content}\n\n---\nScore this CV on every criterion above (${codes.join(
    ", ",
  )}).${criteria.some((c) => c.role === "SPM") ? " These are the Senior PM anchors: the bar is higher than for a PM." : ""}`;

  // Several independent fast reads in parallel. Each criterion is checked against
  // the CV (evidence or zero), then the LOWEST read wins - the rubric's own rule
  // ("where evidence is ambiguous, score the lower anchor"). Same wall-clock time
  // as one read, much less run-to-run noise than a single fast read.
  const reads = await Promise.all(
    Array.from({ length: SCORING_READS }, () => generateJSON<ModelOutput>({ system: SYSTEM, prompt, schema, thinking: SCORING_THINKING })),
  );

  const checked = (out: ModelOutput, c: Criterion): CriterionResult => {
    const r = out.criteria?.find((x) => x.code === c.code);
    if (!r) {
      return { role: c.role, code: c.code, score: 0, reason: "Not scored by the model.", evidence: "", doubt: "Re-run scoring.", evidence_verified: false };
    }
    let score = Math.max(0, Math.min(4, Math.round(Number(r.score) || 0)));
    const evidence = (r.evidence ?? "").trim();
    const verified = score > 0 && evidenceAppears(evidence, content);
    let reason = (r.reason ?? "").trim();
    // Evidence or zero.
    if (score > 0 && !verified) {
      reason = `Scored 0: the quoted evidence could not be found in the CV (model proposed ${score}). ${reason}`;
      score = 0;
    }
    return { role: c.role, code: c.code, score, reason, evidence, doubt: (r.doubt ?? "").trim(), evidence_verified: verified };
  };

  const results: CriterionResult[] = criteria.map((c) => {
    const options = reads.map((out) => checked(out, c));
    const lowest = options.reduce((lo, x) => (x.score < lo.score ? x : lo));
    const split = new Set(options.map((x) => x.score)).size > 1;
    // If the reads disagreed, say so - it's exactly what to probe in interview.
    const doubt = split && !lowest.doubt ? `Reads disagreed (${options.map((x) => x.score).join(" vs ")}); scored the lower.` : lowest.doubt;
    return { ...lowest, doubt };
  });
  const out = reads[0];

  return { headline: (out.headline ?? "").trim(), results };
}
