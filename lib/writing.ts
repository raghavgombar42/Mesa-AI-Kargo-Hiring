// Brief + email drafting. Inputs are redacted CV content and scores only; the
// candidate's real name is substituted for [NAME] at display/send time.

import { COMPANY_NAME, SENDER_NAME } from "./config";
import { generateJSON } from "./gemini";
import type { Criterion, Role } from "./rubric-data";

export type ScoreLine = { code: string; score: number; reason: string; evidence: string | null; doubt: string | null };

function scoreSummary(role: Role, criteria: Criterion[], scores: ScoreLine[]) {
  return criteria
    .filter((c) => c.role === role)
    .map((c) => {
      const s = scores.find((x) => x.code === c.code);
      return `${c.code} ${c.name} (weight ${c.weight}%): ${s?.score ?? 0}/4 - ${s?.reason ?? ""}${s?.doubt ? ` | Doubt: ${s.doubt}` : ""}\n  Standard probe: ${c.probe}`;
    })
    .join("\n");
}

export async function writeBrief(input: {
  role: Role;
  content: string;
  headline: string | null;
  weighted: number;
  rank: number;
  total: number;
  criteria: Criterion[];
  scores: ScoreLine[];
}) {
  const system = `You write interview briefs for Arjun, the founder of Kargo (logistics SaaS). He reads each brief in under a minute and decides whether to interview. Be concrete, cite what is on the CV, no hype, no adjectives without evidence. Refer to the person as "the candidate" - never guess a name or gender.`;
  const prompt = `Role: ${input.role === "PM" ? "Product Manager" : "Senior Product Manager"}
Rank: ${input.rank} of ${input.total} applicants for this role. Weighted rubric score: ${input.weighted}/100.
Headline: ${input.headline ?? ""}

Rubric scores:
${scoreSummary(input.role, input.criteria, input.scores)}

CV (redacted):
${input.content}

Write:
1. "brief": EXACTLY three sentences. Sentence 1 - who they are (the operating background that matters). Sentence 2 - why the system ranked them here (the strongest rubric evidence, and the weakest criterion). Sentence 3 - the single most important thing to probe in the interview.
2. "probes": 2-3 specific interview questions, each tied to a doubt or low score on THIS CV (adapt the standard probes to their actual history).`;

  return generateJSON<{ brief: string; probes: string[] }>({
    system,
    prompt,
    temperature: 0.2,
    schema: {
      type: "object",
      properties: {
        brief: { type: "string" },
        probes: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 3 },
      },
      required: ["brief", "probes"],
    },
  });
}

export async function writeEmail(input: {
  type: "invite" | "rejection";
  role: Role;
  content: string;
  criteria: Criterion[];
  scores: ScoreLine[];
}) {
  const roleName = input.role === "PM" ? "Product Manager" : "Senior Product Manager";
  const system = `You draft candidate emails for ${SENDER_NAME}, founder of ${COMPANY_NAME}, a Series A logistics SaaS startup in Mumbai. He writes plainly and warmly, like a founder - short sentences, no corporate HR phrasing, no exclamation-mark cheer. Every email must reference one or two SPECIFIC things from this candidate's actual work history, so it could not have been sent to anyone else.

Hard rules:
- Start the body with "Hi [NAME]," exactly - [NAME] is replaced with the real first name later. Never invent a name.
- Never mention scores, rubrics, rankings, criteria, AI, or automated screening.
- Never promise anything about future roles, timelines or feedback calls that isn't stated here.
- Sign off as:\n${SENDER_NAME}\nFounder, ${COMPANY_NAME}
- Plain text, no markdown. 90-160 words for the body.`;

  const brief =
    input.type === "invite"
      ? `Write an INTERVIEW INVITE for the ${roleName} role. Say what specifically in their background made Arjun want to talk. Invite them to a 45-minute conversation with Arjun (in person at the Mumbai office or video) and ask them to reply with two or three times that work next week.`
      : `Write a WARM REJECTION for the ${roleName} role. Thank them for applying and for their patience (Kargo was slow to respond). Acknowledge one genuine, specific strength from their CV. Say clearly and kindly that Kargo won't be moving forward for this role right now. Do not give reasons tied to gaps or weaknesses. Wish them well.`;

  const prompt = `${brief}

What stood out in their CV (for your reference only - do not quote scores):
${scoreSummary(input.role, input.criteria, input.scores)}

CV (redacted):
${input.content}`;

  const out = await generateJSON<{ subject: string; body: string }>({
    system,
    prompt,
    temperature: 0.4,
    schema: {
      type: "object",
      properties: {
        subject: { type: "string", description: "Short, human subject line (max 9 words)." },
        body: { type: "string" },
      },
      required: ["subject", "body"],
    },
  });
  let body = out.body.trim();
  if (!/^hi \[name\],/i.test(body)) body = `Hi [NAME],\n\n${body.replace(/^(hi|hello|dear)\b[^\n]*\n+/i, "")}`;
  return { subject: out.subject.trim(), body };
}

export function fillName(text: string, first: string) {
  return text.replace(/\[NAME\]/gi, first);
}
