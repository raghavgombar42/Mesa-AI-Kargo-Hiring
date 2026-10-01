import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { deleteCandidateAction, overrideScreenAction, rescoreAction } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { BandBadge, Card, CriterionCell, Stepper } from "@/components/ui";
import { closestPastHire } from "@/lib/past-hires";
import { getCriteria, sql, type CandidateRow, type EmailDraftRow, type ScoreRow } from "@/lib/db";
import { candidateFlags, isScreenedIn, rankRole, screenLooksWrong } from "@/lib/pipeline";
import { GATES } from "@/lib/screening";
import { firstName } from "@/lib/pii";
import type { Role } from "@/lib/rubric-data";
import { recipientFor } from "@/lib/send";
import { EmailPanel, PersonalForm } from "./panels";

// Server actions on this page call Gemini (re-drafting, re-scoring).
export const maxDuration = 300;

export default async function CandidatePage(props: PageProps<"/candidates/[id]">) {
  await connection();
  const { id } = await props.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const [c] = (await sql()`SELECT * FROM candidates WHERE id = ${id}`) as CandidateRow[];
  if (!c) notFound();
  const [scores, drafts, criteria] = await Promise.all([
    sql()`SELECT * FROM scores WHERE candidate_id = ${id}` as unknown as Promise<ScoreRow[]>,
    sql()`SELECT * FROM email_drafts WHERE candidate_id = ${id}` as unknown as Promise<EmailDraftRow[]>,
    getCriteria(),
  ]);
  const draft = drafts[0] ?? null;
  const ranked = c.status === "scored" ? await rankRole(c.applied_role) : [];
  const me = ranked.find((r) => r.id === id);
  const flags = me ? candidateFlags(me, scores) : [];
  const roles: Role[] = c.applied_role === "PM" ? ["PM", "SPM"] : ["SPM", "PM"];
  const p = c.personal_details ?? {};

  return (
    <div className="space-y-5">
      <Link href={`/?role=${c.applied_role}`} className="text-stone-500 hover:text-stone-900">← Back to {c.applied_role} shortlist</Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{p.name ?? c.file_name}</h1>
          <p className="text-stone-600">{c.headline}</p>
          <p className="mt-1 text-xs text-stone-500">
            {c.selected_role === "AUTO" ? <>Role not specified · ranked on the <b>{c.applied_role}</b> track</> : <>Applied for <b>{c.selected_role}</b>{c.selected_role !== c.applied_role && <> · ranked on the <b>{c.applied_role}</b> track</>}</>}
            {c.status === "scored" && !isScreenedIn(c) && <> · <b className="text-red-700">Screened out</b></>}
            {me && <> · Rank <b>{me.rank}</b> of {ranked.length} · {me.aboveLine ? "above the interview line" : "below the interview line"}</>}
            {" "}· {c.file_name}
          </p>
          {flags.map((f) => (
            <span key={f} className="mr-2 mt-2 inline-block rounded bg-violet-100 px-1.5 py-0.5 text-xs text-violet-800">{f}</span>
          ))}
        </div>
        <div className="flex gap-2">
          <form action={rescoreAction}>
            <input type="hidden" name="id" value={id} />
            <SubmitButton pendingText="Re-scoring…" className="rounded border border-stone-300 bg-white px-3 py-1.5 hover:bg-stone-50">Re-score</SubmitButton>
          </form>
          <form action={deleteCandidateAction}>
            <input type="hidden" name="id" value={id} />
            <SubmitButton pendingText="Deleting…" confirmText="Delete this candidate and all their data?" className="rounded border border-red-200 bg-white px-3 py-1.5 text-red-700 hover:bg-red-50">
              Delete
            </SubmitButton>
          </form>
        </div>
      </div>

      <Stepper
        steps={[
          { label: "Uploaded", state: "done" },
          { label: "Screened", state: !c.screen ? (c.status === "error" ? "todo" : "current") : isScreenedIn(c) ? "done" : "skipped" },
          { label: "Scored", state: c.status === "scored" ? "done" : c.status === "scoring" ? "current" : "todo" },
          { label: draft ? (draft.type === "invite" ? "Invite drafted" : "Rejection drafted") : "Draft", state: draft ? "done" : c.status === "scored" ? "current" : "todo" },
          { label: draft?.status === "sent" ? "Sent" : "Arjun confirms", state: draft?.status === "sent" ? "done" : draft ? "current" : "todo" },
        ]}
      />

      {c.status === "error" && <Card className="border-red-200 bg-red-50 text-red-800">Scoring failed: {c.error}. Click Re-score to try again.</Card>}
      {c.status === "scoring" && <Card>Scoring in progress… refresh in a few seconds.</Card>}

      <div className="grid gap-5 lg:grid-cols-[1fr_420px]">
        <div className="space-y-5">
          {c.screen && <ScreenCard c={c} />}

          <Card title="Interview brief">
            {c.brief ? (
              <>
                <p className="leading-relaxed">{c.brief}</p>
                {c.probes?.length ? (
                  <>
                    <h3 className="mt-3 text-xs font-semibold uppercase tracking-wide text-stone-500">Probe in interview</h3>
                    <ul className="mt-1 list-disc space-y-1 pl-5">{c.probes.map((q) => <li key={q}>{q}</li>)}</ul>
                  </>
                ) : null}
              </>
            ) : (
              <p className="text-stone-500">Briefs are generated for the top 5 per role. Doubts to probe are listed per criterion below.</p>
            )}
          </Card>

          {c.status === "scored" &&
            roles.map((role) => {
              const score = Number(role === "PM" ? c.pm_score : c.spm_score);
              return (
                <Card
                  key={role}
                  title={
                    <span className="flex items-center gap-3">
                      {role} rubric{role === c.applied_role ? " (applied)" : ""}
                      <span className="font-mono text-lg">{score.toFixed(1)}</span>
                      <BandBadge score={score} />
                    </span>
                  }
                >
                  <table className="w-full">
                    <tbody>
                      {criteria
                        .filter((cr) => cr.role === role)
                        .map((cr) => {
                          const s = scores.find((x) => x.criterion_code === cr.code);
                          return (
                            <tr key={cr.code} className="border-t border-stone-100 align-top">
                              <td className="py-2 pr-3"><CriterionCell score={s?.score} /></td>
                              <td className="py-2">
                                <div className="font-medium">
                                  {cr.name} <span className="font-normal text-stone-400">· {cr.weight}%</span>
                                </div>
                                <div className="text-stone-700">{s?.reason}</div>
                                {s?.evidence && s.score > 0 && (
                                  <blockquote className="mt-1 border-l-2 border-stone-300 pl-2 text-xs italic text-stone-500">“{s.evidence}”</blockquote>
                                )}
                                {s?.doubt && <div className="mt-1 text-xs text-amber-800">Probe: {s.doubt}</div>}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </Card>
              );
            })}

          <details className="rounded-lg border border-stone-200 bg-white p-4">
            <summary className="cursor-pointer font-semibold">CV content as the AI saw it (personal details removed)</summary>
            <pre className="mt-3 whitespace-pre-wrap font-sans text-xs text-stone-700">{c.cv_content}</pre>
          </details>
        </div>

        <div className="space-y-5">
          <EmailPanel
            id={id}
            draft={draft}
            greeting={firstName(p.name)}
            recipient={recipientFor(c)}
            aboveLine={me?.aboveLine ?? false}
            decisionNote={c.decision_note}
          />
          {c.status === "scored" && <PastHireCard profile={[1, 2, 3, 4, 5].map((i) => scores.find((x) => x.criterion_code === `${c.applied_role}-${i}`)?.score ?? 0)} />}
          <PersonalForm id={id} name={p.name ?? ""} email={p.email ?? ""} phone={p.phone ?? ""} />
        </div>
      </div>
    </div>
  );
}

function ScreenCard({ c }: { c: CandidateRow }) {
  const s = c.screen!;
  const f = s.facts;
  const inNow = isScreenedIn(c);
  return (
    <Card
      title={
        <span className="flex flex-wrap items-center gap-2">
          Stage 1 · Hard screen
          <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${inNow ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
            {inNow ? "Passed" : "Screened out"}
            {c.screen_override != null && " (your override)"}
          </span>
        </span>
      }
    >
      {s.role_note && <p className="mb-2 text-xs text-stone-600">{s.role_note}</p>}
      <ul className="space-y-1">
        {s.gates.map((g) => (
          <li key={g.key} title={GATES.find((x) => x.key === g.key)?.rule(c.applied_role)}>
            <span className={g.pass ? "text-emerald-700" : "font-medium text-red-700"}>{g.pass ? "✓" : "✗"} {g.label}</span>
            <span className="text-stone-500"> - {g.detail}</span>
          </li>
        ))}
      </ul>
      <details className="mt-2 text-xs text-stone-600">
        <summary className="cursor-pointer">Extracted facts</summary>
        <div className="mt-1 space-y-1">
          <div>Ownership: “{f.ownership_evidence || "-"}”</div>
          <div>Ops ({f.ops_exposure.replace(/_/g, " ")}): “{f.ops_evidence || "-"}”</div>
          <div>Outcomes: {f.quantified_outcomes.map((q) => `“${q}”`).join(" · ") || "-"}</div>
        </div>
      </details>
      {!inNow && screenLooksWrong(c) && (
        <p className="mt-2 rounded bg-violet-50 p-2 text-xs text-violet-800">The rubric rates this CV 55+ even though it missed a must-have. Worth a manual look.</p>
      )}
      <form action={overrideScreenAction} className="mt-3 flex flex-wrap gap-2 text-xs">
        <input type="hidden" name="id" value={c.id} />
        {inNow ? (
          <SubmitButton name="override" value="fail" pendingText="Updating…" className="rounded border border-stone-300 px-2 py-1 hover:bg-stone-50">Screen out</SubmitButton>
        ) : (
          <SubmitButton name="override" value="pass" pendingText="Updating…" className="rounded border border-stone-300 px-2 py-1 hover:bg-stone-50">Override: pass the screen</SubmitButton>
        )}
        {c.screen_override != null && (
          <SubmitButton name="override" value="reset" pendingText="Updating…" className="rounded px-2 py-1 text-stone-500 underline">Undo override</SubmitButton>
        )}
      </form>
    </Card>
  );
}

function PastHireCard({ profile }: { profile: number[] }) {
  const { hire } = closestPastHire(profile);
  return (
    <Card title="Most like this past hire">
      <p>
        <b>{hire.name}</b> <span className="text-stone-500">· {hire.role} · rated </span>
        <b className={hire.rating === "Exceeds" ? "text-emerald-700" : "text-stone-700"}>{hire.rating}</b>
      </p>
      <div className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <span className="text-stone-500">This candidate</span>
        <span className="flex gap-1">{profile.map((p, i) => <CriterionCell key={i} score={p} />)}</span>
        <span className="text-stone-500">{hire.name.split(" ")[0]}</span>
        <span className="flex gap-1">{hire.profile.map((p, i) => <CriterionCell key={i} score={p} />)}</span>
      </div>
      <p className="mt-2 text-xs text-stone-500">Nearest match on the five rubric criteria (C1–C5), using the past-hire scores in rubric.txt.</p>
    </Card>
  );
}
