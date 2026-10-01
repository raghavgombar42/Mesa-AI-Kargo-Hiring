// Brief + email drafting. Inputs are redacted CV content and scores only; the
// candidate's real name is substituted for [NAME] at display/send time.

import { COMPANY_NAME, FAST_THINKING, SENDER_NAME } from "./config";
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
    thinking: FAST_THINKING,
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

// ------------------------------------------------------------------ emails

// Phrases that make an email read as machine-written. A draft containing any of
// them is redrafted once; dashes, curly quotes and "!" are fixed in code regardless.
export const AI_TELLS = [
  "hope this (email|message|note) finds you", "came across your (profile|cv|resume|application)", "caught my (eye|attention)", "stood out",
  "wanted to reach out", "reaching out", "delve", "testament", "thrilled", "excited", "passionate", "journey", "leverag", "synerg",
  "impressive", "impressed", "truly", "genuinely", "incredibl", "invaluable", "resonat", "in today's", "fast-paced", "dynamic",
  "game[- ]chang", "cutting[- ]edge", "rest assured", "hesitate", "feel free", "earliest convenience", "unique blend", "deep dive",
  "tapestry", "navigat", "landscape", "elevate", "empower", "seamless", "robust", "speaks volumes", "it's clear", "it is clear",
  "on file", "future opportunit", "exciting", "keen interest", "aligns? (perfectly|well) with",
  "let us schedule", "i read about your work", "reviewed your (profile|application|cv) (carefully|thoroughly)", "time you spent with us",
  "i would like to talk with you about this role", "solid understanding", "is critical when", "best in your search", "wish you (all )?the best of luck",
  "after careful consideration", "we have decided to move forward with other", "other candidates whose",
];

export function findAiTells(text: string) {
  return AI_TELLS.filter((t) => new RegExp(`\\b${t}`, "i").test(text));
}

/** Deterministic clean-up: no em/en dashes, straight quotes, no exclamation marks, tidy spacing. */
export function humanise(text: string) {
  return text
    .replace(/(\d)\s*[—–]\s*(\d)/g, "$1 to $2") // 2019–2021 -> 2019 to 2021
    .replace(/\s+-\s+/g, ", ") // " - " used as a clause dash
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, "...")
    .replace(/!/g, ".")
    .replace(/,\s*([,.])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +([,.])/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Always end with the same sign-off on its own lines, whatever closing the model wrote. */
export function normaliseSignOff(body: string) {
  const name = SENDER_NAME.replace(/\s+/g, "\\s+");
  const sig = new RegExp(`\\s*${name}[\\s,]*(Founder,?\\s*${COMPANY_NAME}\\.?)?\\s*$`, "i");
  const closing = /\n+\s*(best|best regards|regards|warm regards|kind regards|thanks|thank you|cheers|sincerely|warmly)[,.]?\s*$/i;
  const text = body.trim().replace(sig, "").trim().replace(closing, "").trim();
  return `${text}\n\nBest,\n${SENDER_NAME}\nFounder, ${COMPANY_NAME}`;
}

const EMAIL_SYSTEM = `You write candidate emails as ${SENDER_NAME}, founder of ${COMPANY_NAME}, a Series A startup in Mumbai that builds software for freight forwarders and 3PLs. The email must read as if Arjun typed it himself between meetings: direct, warm, specific and professional. It must not read like a recruiter template or a chatbot.

VOICE
- Plain, confident English. Short sentences. First person ("I"), and "we" for Kargo.
- Concrete over clever: name the actual company, document, number or project from their CV in plain words.
- Three short paragraphs. One idea per paragraph.
- Sound like someone who has read the CV properly, not a template with blanks filled in.
- Use natural contractions (I'm, I'd, we're, you've, it's). Open paragraph 1 with the specific fact itself, not with "I read" or "I saw".
- No HR filler: "after careful consideration", "we have reviewed your profile", "other candidates", "let us schedule", "I appreciate the time you spent".

TONE EXAMPLES (tone only; never reuse these facts, use the candidate's real ones)
Invite:
"Hi [NAME],

Three years running carrier allocation at a 3PL, then building the tool those same teams use. That's the path I look for, because the people who use Kargo every day are the people you used to be.

We're hiring our first Product Manager for the platform freight forwarders work in all day: tracking, documents, status. I'd like to tell you what we're building and hear how you'd approach it.

Would you have 45 minutes next week? I'm happy to meet at our Mumbai office or on video. Just reply with two or three times that suit you."

Rejection:
"Hi [NAME],

Thank you for applying for the Senior Product Manager role, and I'm sorry it took us this long to get back to you.

Building payout APIs that 50,000 businesses rely on is serious work. We've decided not to take your application forward for this role.

I hope the next step goes well for you."

NEVER
- Dashes as punctuation (no em dash, no en dash, no " - " between clauses). Use a full stop or a comma.
- Exclamation marks, emojis, bullet points, bold, headings or markdown.
- Stock phrases such as: "I hope this email finds you well", "I came across your profile", "caught my eye", "stood out", "I wanted to reach out", "impressive", "impressed", "truly", "genuinely", "thrilled", "excited", "passionate", "journey", "leverage", "delve", "testament", "unique blend", "fast-paced", "dynamic", "seamless", "robust", "navigate", "landscape", "don't hesitate", "feel free", "at your earliest convenience", "future opportunities", "keep your CV on file".
- Flattering adjectives. Let the specific fact carry the compliment.
- Any mention of scores, rubrics, rankings, criteria, screening, AI or automation in hiring.
- Promises about other roles, timelines or feedback that the brief does not state.
- Invented facts about Kargo or excuses (launches, busy periods, volume of applicants). The only true facts: Kargo is a Series A startup in Mumbai building software for freight forwarders and 3PLs, and it was slow to reply. Every fact about the candidate must come from their CV.

FORMAT
- The body's first line is exactly: Hi [NAME],
  ([NAME] is filled in later. Never invent a name.)
- End the body on the last sentence. Do NOT write a closing or signature; it is added automatically.
- Subject: plain and specific, 4 to 8 words, no dashes, no colon, no exclamation mark.`;

export async function writeEmail(input: {
  type: "invite" | "rejection";
  role: Role;
  content: string;
  criteria: Criterion[];
  scores: ScoreLine[];
}) {
  const roleName = input.role === "PM" ? "Product Manager" : "Senior Product Manager";
  const roleLine =
    input.role === "PM"
      ? "the first PM on our core operations platform, the tool freight forwarding teams use all day for tracking, documents and status"
      : "the most senior PM, owning our integrations and data layer: carrier systems, port portals and the tools our customers already run";

  const brief =
    input.type === "invite"
      ? `Write an INTERVIEW INVITE for the ${roleName} role, 110 to 150 words.
Paragraph 1: why Arjun is writing, anchored on one or two specific things they actually did (a named place, document, number or project), and why that experience matters when you build for freight forwarders.
Paragraph 2: the role in one or two plain sentences (${roleLine}), and that Arjun would like to talk.
Paragraph 3: the ask. A 45-minute conversation with Arjun, at the Mumbai office or on video. Ask them to reply with two or three times that suit them next week.`
      : `Write a REJECTION for the ${roleName} role, 80 to 120 words. Kind, clear and final.
Paragraph 1: thank them for applying, and apologise in one short clause that Kargo took a while to reply (no excuse or reason).
Paragraph 2: one specific, true thing from their CV that Arjun noticed (a plain fact, not flattery), then say clearly that Kargo is not taking their application forward for this role. Give no reasons and mention no weaknesses.
Paragraph 3: one sentence wishing them well with what comes next.`;

  const prompt = `${brief}

What stood out in their CV (for your reference only; never mention scores):
${scoreSummary(input.role, input.criteria, input.scores)}

CV (redacted):
${input.content}`;

  const schema = {
    type: "object",
    properties: {
      subject: { type: "string", description: "Plain, specific subject line, 4 to 8 words." },
      body: { type: "string" },
    },
    required: ["subject", "body"],
  };

  let out = await generateJSON<{ subject: string; body: string }>({ system: EMAIL_SYSTEM, prompt, temperature: 0.5, schema, thinking: FAST_THINKING });
  const tells = findAiTells(`${out.subject}\n${out.body}`);
  if (tells.length) {
    // One redraft with explicit feedback if stock phrasing slipped through.
    out = await generateJSON<{ subject: string; body: string }>({
      system: EMAIL_SYSTEM,
      prompt: `${prompt}\n\nYour previous draft used these banned phrases: ${tells.join(", ")}. Rewrite it without them, keeping it specific and human.\n\nPrevious draft:\n${out.body}`,
      temperature: 0.5,
      schema,
      thinking: FAST_THINKING,
    });
  }

  let body = humanise(out.body);
  if (!/^hi \[name\],/i.test(body)) body = `Hi [NAME],\n\n${body.replace(/^(hi|hello|dear)\b[^\n]*\n+/i, "")}`;
  return { subject: humanise(out.subject).replace(/[.:,]$/, ""), body: normaliseSignOff(body) };
}

export function fillName(text: string, first: string) {
  return text.replace(/\[NAME\]/gi, first);
}
