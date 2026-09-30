import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import type { Criterion, Role } from "./rubric-data";
import type { GateResult, ScreenFacts } from "./screening";

let client: NeonQueryFunction<false, false> | null = null;

export function sql() {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set (add your Neon connection string to .env.local)");
    client = neon(url);
  }
  return client;
}

export type PersonalDetails = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  links?: string[];
  location?: string | null;
  header_extras?: string[];
};

export type CandidateRow = {
  id: string;
  created_at: string;
  applied_role: Role; // ranking track, set by the screen
  selected_role: Role | "AUTO";
  file_name: string | null;
  personal_details: PersonalDetails;
  cv_content: string;
  status: "scoring" | "scored" | "error";
  error: string | null;
  headline: string | null;
  screen: { facts: ScreenFacts; gates: GateResult[]; role_note: string | null } | null;
  screen_passed: boolean | null;
  screen_override: boolean | null;
  duplicate_of: string | null;
  pm_score: string | null; // NUMERIC comes back as string
  spm_score: string | null;
  brief: string | null;
  probes: string[] | null;
  brief_generated_at: string | null;
  decision: "invite" | "reject" | null;
  decision_note: string | null;
  decided_at: string | null;
};

export type ScoreRow = {
  candidate_id: string;
  role: Role;
  criterion_code: string;
  score: number;
  reason: string;
  evidence: string | null;
  doubt: string | null;
  evidence_verified: boolean;
};

export type EmailDraftRow = {
  candidate_id: string;
  type: "invite" | "rejection";
  subject: string;
  body: string;
  locked: boolean;
  status: "draft" | "sent" | "failed";
  sent_at: string | null;
  sent_to: string | null;
  resend_id: string | null;
  error: string | null;
  updated_at: string;
};

export async function getCriteria(): Promise<Criterion[]> {
  const rows = await sql()`SELECT role, code, name, weight, source, description, anchors, probe, red_flag, sort_order
                           FROM rubric_criteria ORDER BY role, sort_order`;
  if (rows.length === 0) throw new Error("rubric_criteria is empty - run `npm run db:setup` first");
  return rows as Criterion[];
}

export const num = (v: string | number | null | undefined) => (v == null ? null : Number(v));
