import { Resend } from "resend";
import { EMAIL_FROM, EMAIL_OVERRIDE_TO } from "./config";
import { sql, type CandidateRow, type EmailDraftRow } from "./db";
import { firstName } from "./pii";
import { fillName } from "./writing";

export function recipientFor(c: Pick<CandidateRow, "personal_details">) {
  return EMAIL_OVERRIDE_TO || c.personal_details?.email || null;
}

/** Sends the candidate's current draft via Resend. Only ever called from Arjun's Confirm click. */
export async function sendCandidateEmail(id: string, note?: string) {
  const [c] = (await sql()`SELECT * FROM candidates WHERE id = ${id}`) as CandidateRow[];
  const [d] = (await sql()`SELECT * FROM email_drafts WHERE candidate_id = ${id}`) as EmailDraftRow[];
  if (!c || !d) throw new Error("No draft email for this candidate yet");
  if (d.status === "sent") throw new Error("This email was already sent");

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set - add it to the environment and redeploy");
  const to = recipientFor(c);
  if (!to) throw new Error("No email address on file for this candidate - add one under Personal details");

  const first = firstName(c.personal_details?.name);
  const subject = fillName(d.subject, first);
  const text = fillName(d.body, first);

  const { data, error } = await new Resend(apiKey).emails.send({ from: EMAIL_FROM, to, subject, text });

  if (error || !data) {
    const msg = error?.message ?? "Unknown Resend error";
    await sql()`UPDATE email_drafts SET status = 'failed', error = ${msg}, updated_at = now() WHERE candidate_id = ${id}`;
    throw new Error(`Resend: ${msg}`);
  }

  const decision = d.type === "invite" ? "invite" : "reject";
  const q = sql();
  await q.transaction([
    q`UPDATE email_drafts SET status = 'sent', sent_at = now(), sent_to = ${to}, resend_id = ${data.id}, error = NULL, updated_at = now()
      WHERE candidate_id = ${id}`,
    q`UPDATE candidates SET decision = ${decision}, decision_note = ${note?.trim() || null}, decided_at = now() WHERE id = ${id}`,
  ]);
  return { to, id: data.id };
}
