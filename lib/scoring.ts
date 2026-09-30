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

/** Scores redacted CV content against BOTH the PM and SPM rubric in one call. */
export async function scoreCandidate(content: string, criteria: Criterion[]): Promise<ScoreResult> {
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
  )}). Score PM and SPM criteria independently - the SPM anchors have a higher bar.`;

  const out = await generateJSON<ModelOutput>({ system: SYSTEM, prompt, schema });

  const results: CriterionResult[] = criteria.map((c) => {
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
  });

  return {
    headline: (out.headline ?? "").trim(),
    results,
    pm_score: weightedScore(results, criteria.filter((c) => c.role === "PM")),
    spm_score: weightedScore(results, criteria.filter((c) => c.role === "SPM")),
  };
}
