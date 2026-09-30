"use client";

import { useActionState, useState } from "react";
import { saveDraftAction, sendEmailAction, switchEmailTypeAction, updatePersonalAction, type ActionState } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";
import type { EmailDraftRow } from "@/lib/db";

function Status({ state }: { state: ActionState }) {
  if (!state) return null;
  return <p className={`text-xs ${state.error ? "text-red-700" : "text-emerald-700"}`}>{state.error ?? state.ok}</p>;
}

export function EmailPanel({
  id,
  draft,
  greeting,
  recipient,
  aboveLine,
  decisionNote,
}: {
  id: string;
  draft: EmailDraftRow | null;
  greeting: string;
  recipient: string | null;
  aboveLine: boolean;
  decisionNote: string | null;
}) {
  const [saveState, save] = useActionState(saveDraftAction, null);
  const [switchState, switchType] = useActionState(switchEmailTypeAction, null);
  const [sendState, send] = useActionState(sendEmailAction, null);
  const [subject, setSubject] = useState(draft?.subject ?? "");
  const [body, setBody] = useState(draft?.body ?? "");
  const key = `${draft?.type}-${draft?.updated_at}`;
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    // A new draft arrived from the server (e.g. type switched) - reset the editor.
    setLastKey(key);
    setSubject(draft?.subject ?? "");
    setBody(draft?.body ?? "");
  }

  if (!draft) {
    return (
      <section className="rounded-lg border border-stone-200 bg-white p-4">
        <h2 className="mb-2 font-semibold">Email</h2>
        <p className="text-stone-500">No draft yet. Use “Update briefs &amp; drafts” on the dashboard.</p>
      </section>
    );
  }

  const sent = draft.status === "sent";
  const dirty = subject !== draft.subject || body !== draft.body;
  const other = draft.type === "invite" ? "rejection" : "invite";
  const isOverride = (draft.type === "invite") !== aboveLine;

  return (
    <section className={`rounded-lg border bg-white p-4 ${draft.type === "invite" ? "border-sky-300" : "border-stone-200"}`}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">{draft.type === "invite" ? "Interview invite" : "Rejection"} email</h2>
        {sent ? (
          <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">Sent</span>
        ) : (
          <span className="rounded bg-stone-100 px-2 py-0.5 text-xs text-stone-600">Draft{draft.locked ? " · edited by you" : ""}</span>
        )}
      </div>

      {isOverride && !sent && (
        <p className="mb-2 rounded bg-amber-50 p-2 text-xs text-amber-800">
          You&apos;ve overridden the system: this candidate is {aboveLine ? "above" : "below"} the interview line.
        </p>
      )}

      {sent ? (
        <div className="space-y-2">
          <p className="text-xs text-stone-500">
            Sent to {draft.sent_to} on {new Date(draft.sent_at!).toLocaleString()} · Resend id {draft.resend_id}
          </p>
          {decisionNote && <p className="text-xs text-stone-600">Your note: {decisionNote}</p>}
          <p className="font-medium">{draft.subject.replace(/\[NAME\]/gi, greeting)}</p>
          <pre className="whitespace-pre-wrap font-sans text-stone-700">{draft.body.replace(/\[NAME\]/gi, greeting)}</pre>
        </div>
      ) : (
        <>
          <form action={save} className="space-y-2">
            <input type="hidden" name="id" value={id} />
            <label className="block text-xs text-stone-500">
              To: <span className="text-stone-800">{recipient ?? "— no email on file —"}</span>
            </label>
            <input name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full rounded border border-stone-300 px-2 py-1.5 font-medium" />
            <textarea name="body" value={body} onChange={(e) => setBody(e.target.value)} rows={14} className="w-full rounded border border-stone-300 px-2 py-1.5 leading-relaxed" />
            <p className="text-xs text-stone-500">[NAME] becomes “{greeting}” when sent.</p>
            <div className="flex items-center gap-3">
              <SubmitButton pendingText="Saving…" className="rounded border border-stone-300 px-3 py-1.5 hover:bg-stone-50">Save edits</SubmitButton>
              <Status state={saveState} />
            </div>
          </form>

          <form action={switchType} className="mt-2 flex items-center gap-3">
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="type" value={other} />
            <SubmitButton pendingText="Drafting…" confirmText={`Replace this draft with a new ${other} email?`} className="text-xs text-stone-600 underline">
              Switch to {other}
            </SubmitButton>
            <Status state={switchState} />
          </form>

          <form action={send} className="mt-4 space-y-2 border-t border-stone-100 pt-4">
            <input type="hidden" name="id" value={id} />
            <input name="note" placeholder="Why? (optional note for your records)" className="w-full rounded border border-stone-300 px-2 py-1.5 text-xs" />
            {dirty && <p className="text-xs text-amber-700">Save your edits before sending.</p>}
            {draft.status === "failed" && <p className="text-xs text-red-700">Last attempt failed: {draft.error}</p>}
            <SubmitButton
              pendingText="Sending…"
              disabled={dirty}
              confirmText={`Send this ${draft.type} to ${recipient}?`}
              className={`w-full rounded px-4 py-2 font-semibold text-white ${draft.type === "invite" ? "bg-sky-700 hover:bg-sky-800" : "bg-stone-800 hover:bg-stone-900"}`}
            >
              Confirm &amp; send {draft.type}
            </SubmitButton>
            <Status state={sendState} />
          </form>
        </>
      )}
    </section>
  );
}

export function PersonalForm({ id, name, email, phone }: { id: string; name: string; email: string; phone: string }) {
  const [state, action] = useActionState(updatePersonalAction, null);
  return (
    <form action={action} className="space-y-2 rounded-lg border border-stone-200 bg-white p-4">
      <h2 className="font-semibold">Personal details</h2>
      <p className="text-xs text-stone-500">Stored privately. Never sent to any AI step. Fix here if extraction got it wrong.</p>
      <input type="hidden" name="id" value={id} />
      {[
        ["name", "Name", name],
        ["email", "Email", email],
        ["phone", "Phone", phone],
      ].map(([field, label, value]) => (
        <label key={field} className="flex items-center gap-2">
          <span className="w-12 text-xs text-stone-500">{label}</span>
          <input name={field} defaultValue={value} className="flex-1 rounded border border-stone-300 px-2 py-1" />
        </label>
      ))}
      <div className="flex items-center gap-3">
        <SubmitButton pendingText="Saving…" className="rounded border border-stone-300 px-3 py-1 hover:bg-stone-50">Save</SubmitButton>
        <Status state={state} />
      </div>
    </form>
  );
}
