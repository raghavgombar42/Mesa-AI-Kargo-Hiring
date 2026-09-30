// Stage 1 - hard screen. Five must-haves checked BEFORE a CV is ranked on the rubric.
// Gemini only extracts facts (with verbatim quotes); the pass/fail rules below are
// plain code so every screening decision can be read, audited and overridden.

import { generateJSON } from "./gemini";
import type { Role } from "./rubric-data";
import { evidenceAppears } from "./scoring";

export const SCREEN_RULES = {
  PM: { minFullTimeMonths: 24, minOwnershipMonths: 12 },
  SPM: { minFullTimeMonths: 60, minOwnershipMonths: 36 },
  minQuantifiedOutcomes: 1,
  duplicateSimilarity: 0.85,
} as const;

export type GateKey = "genuine" | "experience" | "ownership" | "ops" | "evidence";

export const GATES: { key: GateKey; label: string; rule: (r: Role) => string }[] = [
  { key: "genuine", label: "Genuine, unique application", rule: () => "A readable CV of one person with a dated work history, and not a duplicate of a CV already received." },
  {
    key: "experience",
    label: "Full-time experience floor",
    rule: (r) => `At least ${SCREEN_RULES[r].minFullTimeMonths / 12} years of full-time work of ANY kind (internships and education don't count). Not PM years - an ops veteran who moved into product passes.`,
  },
  {
    key: "ownership",
    label: "Has owned what gets built",
    rule: (r) =>
      `At least ${SCREEN_RULES[r].minOwnershipMonths} months accountable for a product, product area or a self-built system others used (PM / product owner / product-building founder / engineer who owned a product). Project delivery, consulting, brand, analytics and "supporting" roles don't count.`,
  },
  { key: "ops", label: "Operations proximity", rule: () => "Has either done operations-heavy work (logistics, freight, ports, supply chain, warehousing, fulfilment, manufacturing, field ops) or built product for people who do it." },
  { key: "evidence", label: "Evidence, not adjectives", rule: () => `At least ${SCREEN_RULES.minQuantifiedOutcomes} results they personally drove, with a number (volume, %, adoption, time) - quoted from the CV.` },
];

export type ScreenFacts = {
  is_cv: boolean;
  stated_role: "PM" | "SPM" | "unclear";
  full_time_months: number;
  full_time_evidence: string;
  ownership_months: number;
  ownership_evidence: string;
  ops_exposure: "did_ops" | "built_for_ops" | "none";
  ops_evidence: string;
  quantified_outcomes: string[];
};

export type GateResult = { key: GateKey; label: string; pass: boolean; detail: string };

export type ScreenResult = {
  facts: ScreenFacts;
  gates: GateResult[]; // evaluated against the role track below
  role: Role; // track the candidate is ranked in
  role_note: string | null; // why the track differs from what was selected
  passed: boolean;
};

const SYSTEM = `You extract hiring FACTS from a redacted CV for Kargo, a logistics SaaS startup hiring a Product Manager (PM) and a Senior Product Manager (SPM). You do not judge quality - you measure. Personal details appear as [CANDIDATE], [EMAIL], [PHONE], [LINK].

Rules:
- Months: compute from the dates on the CV. Use Sep 2026 as "Present". Do not double-count overlapping roles. If a CV only says "X+ years", use X*12.
- full_time_months: all full-time paid work of any kind. EXCLUDE internships, trainee stints under 6 months, part-time, education, fellowships.
- ownership_months: months in roles where THIS person was accountable for what got built: PM/APM who owned a named product area, product owner, founder/co-founder/CPO who built the product, head/VP of product, or an engineer/operator who personally built a system or tool other people used. EXCLUDE: project/delivery/program management of someone else's product, consulting/advisory/strategy, brand/marketing management, data/BI analysis, sales, "supported senior PMs", internships.
- ops_exposure: "did_ops" if they personally worked in operations-heavy work (logistics, freight forwarding, customs/CHA, ports, carriers, supply chain, warehousing, fulfilment, manufacturing/plant, field operations, hospital/healthcare supply chain). "built_for_ops" only if they built/managed a product whose PRIMARY day-to-day users are operations teams (dispatchers, warehouse or plant staff, forwarders, carriers, field technicians). Analytics or forecasting models for clients, marketing tools, consulting engagements, or having logistics companies among many customers do NOT count on their own. Otherwise "none". Consumer apps, fintech, HR-tech, marketing, banking = "none" unless the CV shows operations work.
- Every *_evidence field and every quantified_outcomes item must be COPIED VERBATIM from the CV (one continuous span, max 30 words). Empty string if none.
- quantified_outcomes: up to 3 results the person personally drove that include a number.
- stated_role: "SPM" if the CV positions them as a senior/lead/head PM or product leader, "PM" if as PM/APM/aspiring PM, otherwise "unclear".
- is_cv: false only if this is not one person's professional CV with a dated work history.`;

const SCHEMA = {
  type: "object",
  properties: {
    is_cv: { type: "boolean" },
    stated_role: { type: "string", enum: ["PM", "SPM", "unclear"] },
    full_time_months: { type: "integer", minimum: 0 },
    full_time_evidence: { type: "string" },
    ownership_months: { type: "integer", minimum: 0 },
    ownership_evidence: { type: "string" },
    ops_exposure: { type: "string", enum: ["did_ops", "built_for_ops", "none"] },
    ops_evidence: { type: "string" },
    quantified_outcomes: { type: "array", items: { type: "string" }, maxItems: 3 },
  },
  required: ["is_cv", "stated_role", "full_time_months", "full_time_evidence", "ownership_months", "ownership_evidence", "ops_exposure", "ops_evidence", "quantified_outcomes"],
};

export async function extractScreenFacts(content: string): Promise<ScreenFacts> {
  return generateJSON<ScreenFacts>({ system: SYSTEM, prompt: `CV (redacted):\n\n${content}`, schema: SCHEMA });
}

// ------------------------------------------------------------------ duplicates (no AI)

function shingles(text: string) {
  const words = text.toLowerCase().replace(/\[[a-z]+\]/g, " ").replace(/[^a-z0-9]+/g, " ").split(" ").filter(Boolean);
  const set = new Set<string>();
  for (let i = 0; i + 5 <= words.length; i++) set.add(words.slice(i, i + 5).join(" "));
  return set;
}

export function similarity(a: string, b: string) {
  const A = shingles(a);
  const B = shingles(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const s of A) if (B.has(s)) inter++;
  return inter / (A.size + B.size - inter);
}

export function findDuplicate<T extends { id: string; cv_content: string }>(content: string, existing: T[]) {
  let best: { id: string; sim: number } | null = null;
  for (const e of existing) {
    const sim = similarity(content, e.cv_content);
    if (sim >= SCREEN_RULES.duplicateSimilarity && (!best || sim > best.sim)) best = { id: e.id, sim };
  }
  return best;
}

// ------------------------------------------------------------------ gates (no AI)

function gatesFor(role: Role, f: ScreenFacts, content: string, duplicateOf: string | null): GateResult[] {
  const rules = SCREEN_RULES[role];
  const verified = (q: string) => !!q && evidenceAppears(q, content);
  const outcomes = (f.quantified_outcomes ?? []).filter((q) => /\d/.test(q) && verified(q));
  const yrs = (m: number) => `${(m / 12).toFixed(1)} yrs`;

  return [
    {
      key: "genuine",
      label: GATES[0].label,
      pass: f.is_cv && !duplicateOf && content.length >= 800,
      detail: duplicateOf ? "Duplicate of a CV already received" : !f.is_cv || content.length < 800 ? "Not a readable single-person CV with a work history" : "OK",
    },
    {
      key: "experience",
      label: GATES[1].label,
      pass: f.full_time_months >= rules.minFullTimeMonths,
      detail: `${yrs(f.full_time_months)} full-time (needs ${yrs(rules.minFullTimeMonths)})`,
    },
    {
      key: "ownership",
      label: GATES[2].label,
      pass: f.ownership_months >= rules.minOwnershipMonths && verified(f.ownership_evidence),
      detail:
        f.ownership_months >= rules.minOwnershipMonths && !verified(f.ownership_evidence)
          ? "Ownership claimed but the quoted evidence isn't in the CV"
          : `${yrs(f.ownership_months)} owning what gets built (needs ${yrs(rules.minOwnershipMonths)})`,
    },
    {
      key: "ops",
      label: GATES[3].label,
      pass: f.ops_exposure !== "none" && verified(f.ops_evidence),
      detail: f.ops_exposure === "none" ? "No operations-heavy work or ops users" : verified(f.ops_evidence) ? (f.ops_exposure === "did_ops" ? "Did the operations work" : "Built product for ops teams") : "Ops exposure claimed but the quoted evidence isn't in the CV",
    },
    {
      key: "evidence",
      label: GATES[4].label,
      pass: outcomes.length >= SCREEN_RULES.minQuantifiedOutcomes,
      detail: `${outcomes.length} verified quantified outcome(s) (needs ${SCREEN_RULES.minQuantifiedOutcomes})`,
    },
  ];
}

const allPass = (g: GateResult[]) => g.every((x) => x.pass);

/**
 * selected = what Arjun picked at upload ("AUTO" = not specified). SPM applicants
 * who clear every must-have except the SPM seniority floors are rerouted to the PM
 * track instead of being screened out; unspecified CVs go to the most senior track
 * they clear.
 */
export function evaluateScreen(selected: Role | "AUTO", facts: ScreenFacts, content: string, duplicateOf: string | null): ScreenResult {
  const pm = gatesFor("PM", facts, content, duplicateOf);
  const spm = gatesFor("SPM", facts, content, duplicateOf);

  if (selected === "PM") return { facts, gates: pm, role: "PM", role_note: null, passed: allPass(pm) };

  if (selected === "SPM") {
    if (!allPass(spm) && allPass(pm)) {
      return { facts, gates: pm, role: "PM", role_note: "Applied for SPM; below the SPM seniority floor but clears every PM must-have - rerouted to the PM track.", passed: true };
    }
    return { facts, gates: spm, role: "SPM", role_note: null, passed: allPass(spm) };
  }

  // AUTO
  if (allPass(spm)) return { facts, gates: spm, role: "SPM", role_note: "Role not specified - routed to SPM (clears the SPM floors).", passed: true };
  const role: Role = facts.stated_role === "SPM" && !allPass(pm) ? "SPM" : "PM";
  const gates = role === "PM" ? pm : spm;
  return { facts, gates, role, role_note: `Role not specified - routed to ${role}.`, passed: allPass(gates) };
}

export function failedGates(s: Pick<ScreenResult, "gates"> | null | undefined) {
  return (s?.gates ?? []).filter((g) => !g.pass);
}
