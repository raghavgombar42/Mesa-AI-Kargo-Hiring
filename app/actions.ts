"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/auth";
import { sql } from "@/lib/db";
import { draftEmail, refreshDrafts, scoreStoredCandidate } from "@/lib/pipeline";
import { sendCandidateEmail } from "@/lib/send";

export type ActionState = { ok?: string; error?: string } | null;

const msg = (e: unknown) => String((e as Error)?.message ?? e);

function refresh(id?: string) {
  revalidatePath("/");
  if (id) revalidatePath(`/candidates/${id}`);
}

export async function saveDraftAction(_: ActionState, form: FormData): Promise<ActionState> {
  const id = String(form.get("id"));
  const subject = String(form.get("subject") ?? "").trim();
  const body = String(form.get("body") ?? "").trim();
  if (!subject || !body) return { error: "Subject and body can't be empty" };
  await sql()`UPDATE email_drafts SET subject = ${subject}, body = ${body}, locked = true, updated_at = now()
              WHERE candidate_id = ${id} AND status <> 'sent'`;
  refresh(id);
  return { ok: "Draft saved" };
}

export async function switchEmailTypeAction(_: ActionState, form: FormData): Promise<ActionState> {
  const id = String(form.get("id"));
  const type = form.get("type") === "invite" ? "invite" : "rejection";
  try {
    await draftEmail(id, type, true);
    refresh(id);
    return { ok: `New ${type} drafted` };
  } catch (e) {
    return { error: msg(e) };
  }
}

export async function sendEmailAction(_: ActionState, form: FormData): Promise<ActionState> {
  const id = String(form.get("id"));
  const note = String(form.get("note") ?? "");
  try {
    const { to } = await sendCandidateEmail(id, note);
    refresh(id);
    return { ok: `Sent to ${to}` };
  } catch (e) {
    refresh(id);
    return { error: msg(e) };
  }
}

export async function rescoreAction(form: FormData) {
  const id = String(form.get("id"));
  try {
    await scoreStoredCandidate(id);
    await refreshDrafts();
  } catch {
    // error is stored on the candidate row and shown on the page
  }
  refresh(id);
}

export async function updatePersonalAction(_: ActionState, form: FormData): Promise<ActionState> {
  const id = String(form.get("id"));
  const name = String(form.get("name") ?? "").trim() || null;
  const email = String(form.get("email") ?? "").trim() || null;
  const phone = String(form.get("phone") ?? "").trim() || null;
  await sql()`UPDATE candidates
              SET personal_details = personal_details || ${JSON.stringify({ name, email, phone })}::jsonb
              WHERE id = ${id}`;
  refresh(id);
  return { ok: "Saved" };
}

export async function deleteCandidateAction(form: FormData) {
  const id = String(form.get("id"));
  await sql()`DELETE FROM candidates WHERE id = ${id}`;
  refresh();
  redirect("/");
}

export async function logoutAction() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

/** Arjun overrides the hard screen for one candidate ("pass" / "fail" / "reset" to the screen's own call). */
export async function overrideScreenAction(form: FormData) {
  const id = String(form.get("id"));
  const v = String(form.get("override"));
  const override = v === "pass" ? true : v === "fail" ? false : null;
  await sql()`UPDATE candidates SET screen_override = ${override} WHERE id = ${id}`;
  try {
    await refreshDrafts();
  } catch {
    // drafts can be refreshed from the dashboard
  }
  refresh(id);
}
