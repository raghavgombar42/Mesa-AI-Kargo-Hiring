import Link from "next/link";
import { connection } from "next/server";
import { Fragment } from "react";
import { RefreshButton } from "@/components/RefreshButton";
import { BandBadge, Card, CriterionCell, EmailStatus } from "@/components/ui";
import { INVITE_MIN_SCORE, INVITE_TOP_N } from "@/lib/config";
import { sql, type CandidateRow, type EmailDraftRow, type ScoreRow } from "@/lib/db";
import { candidateFlags, rankRole, roleScore, screenedOut, screenLooksWrong } from "@/lib/pipeline";
import type { Role } from "@/lib/rubric-data";
import { failedGates } from "@/lib/screening";

type Tab = Role | "OUT";

export default async function Dashboard(props: PageProps<"/">) {
  await connection();
  const sp = await props.searchParams;
  const tab: Tab = sp.role === "SPM" ? "SPM" : sp.role === "OUT" ? "OUT" : "PM";

  const [pm, spm, out, scores, pending, drafts] = await Promise.all([
    rankRole("PM"),
    rankRole("SPM"),
    screenedOut(),
    sql()`SELECT candidate_id, criterion_code, score FROM scores` as unknown as Promise<ScoreRow[]>,
    sql()`SELECT id, file_name, status, error FROM candidates WHERE status <> 'scored' ORDER BY created_at DESC` as unknown as Promise<CandidateRow[]>,
    sql()`SELECT type, status FROM email_drafts` as unknown as Promise<Pick<EmailDraftRow, "type" | "status">[]>,
  ]);

  const byCandidate = new Map<string, ScoreRow[]>();
  for (const s of scores) byCandidate.set(s.candidate_id, [...(byCandidate.get(s.candidate_id) ?? []), s]);

  const received = pm.length + spm.length + out.length + pending.length;
  const invites = [...pm, ...spm].filter((c) => c.aboveLine).length;
  const waiting = drafts.filter((d) => d.status !== "sent").length;
  const sent = drafts.filter((d) => d.status === "sent").length;

  const tabs: { key: Tab; label: string; n: number }[] = [
    { key: "PM", label: "Product Manager", n: pm.length },
    { key: "SPM", label: "Senior Product Manager", n: spm.length },
    { key: "OUT", label: "Screened out", n: out.length },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Shortlist</h1>
          <p className="text-stone-500">
            Stage 1 removes CVs that miss a must-have; Stage 2 ranks the rest on the rubric built from Kargo&apos;s past hires. The system
            recommends; you decide. Nothing is sent until you confirm.
          </p>
        </div>
        <RefreshButton />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[
          ["Received", received],
          ["Screened out", out.length],
          ["Ranked", pm.length + spm.length],
          ["Invite drafts", invites],
          [`Awaiting you · ${sent} sent`, waiting],
        ].map(([label, n]) => (
          <div key={label} className="rounded-lg border border-stone-200 bg-white px-3 py-2">
            <div className="font-mono text-xl font-semibold">{n}</div>
            <div className="text-xs text-stone-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-1 border-b border-stone-200">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/?role=${t.key}`}
            className={`-mb-px border-b-2 px-4 py-2 ${t.key === tab ? "border-stone-900 font-semibold" : "border-transparent text-stone-500 hover:text-stone-800"}`}
          >
            {t.label} <span className="text-stone-400">({t.n})</span>
          </Link>
        ))}
      </div>

      {pending.length > 0 && (
        <Card title={`Not processed yet (${pending.length})`}>
          <ul className="space-y-1">
            {pending.map((p) => (
              <li key={p.id} className="flex gap-2">
                <Link href={`/candidates/${p.id}`} className="underline">{p.file_name}</Link>
                <span className={p.status === "error" ? "text-red-700" : "text-stone-500"}>{p.status === "error" ? `Error: ${p.error}` : "Processing…"}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {tab === "OUT" ? (
        <ScreenedOutTable rows={out} />
      ) : (
        <RankedTable role={tab} ranked={tab === "PM" ? pm : spm} byCandidate={byCandidate} />
      )}
    </div>
  );
}

function RankedTable({ role, ranked, byCandidate }: { role: Role; ranked: Awaited<ReturnType<typeof rankRole>>; byCandidate: Map<string, ScoreRow[]> }) {
  const other: Role = role === "PM" ? "SPM" : "PM";
  const codes = [1, 2, 3, 4, 5].map((i) => `${role}-${i}`);
  const lastAbove = ranked.filter((c) => c.aboveLine).at(-1)?.id;

  if (ranked.length === 0) {
    return (
      <Card>
        <p className="text-stone-500">
          No {role} candidates have passed the screen yet. <Link href="/upload" className="underline">Upload CVs</Link> to get started.
        </p>
      </Card>
    );
  }

  return (
    <>
      <p className="text-xs text-stone-500">
        Interview line: top {INVITE_TOP_N} with a score of {INVITE_MIN_SCORE}+ get an invite draft; everyone else gets a warm rejection draft.
      </p>
      <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-left">
          <thead className="border-b border-stone-200 bg-stone-50 text-xs text-stone-500">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Candidate</th>
              <th className="px-3 py-2 text-right">{role} score</th>
              <th className="px-3 py-2">Band</th>
              <th className="px-3 py-2" title="C1 Operator's Chair · C2 Unasked Build · C3 Absorbs the Break · C4 Translation · C5 Sole Owner">C1 C2 C3 C4 C5</th>
              <th className="px-3 py-2 text-right">{other}</th>
              <th className="px-3 py-2">Email</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((c) => {
              const cs = byCandidate.get(c.id) ?? [];
              const flags = candidateFlags(c, cs);
              if (c.screen?.role_note && c.selected_role !== "AUTO") flags.push("Rerouted from SPM");
              if (c.screen_override === true) flags.push("Passed screen by your override");
              return (
                <Fragment key={c.id}>
                  <tr className={`border-b border-stone-100 align-top hover:bg-stone-50 ${c.aboveLine ? "" : "text-stone-600"}`}>
                    <td className="px-3 py-2 font-mono text-stone-400">{c.rank}</td>
                    <td className="px-3 py-2">
                      <Link href={`/candidates/${c.id}`} className="font-medium text-stone-900 underline-offset-2 hover:underline">
                        {c.personal_details?.name ?? c.file_name}
                      </Link>
                      <div className="max-w-md text-xs text-stone-500">{c.headline}</div>
                      {c.brief && <div className="mt-1 max-w-md text-xs text-stone-700">{c.brief}</div>}
                      {flags.map((f) => (
                        <div key={f} className="mr-1 mt-1 inline-block rounded bg-violet-100 px-1.5 py-0.5 text-xs text-violet-800">{f}</div>
                      ))}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-base font-semibold">{c.score.toFixed(1)}</td>
                    <td className="px-3 py-2"><BandBadge score={c.score} /></td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        {codes.map((code) => <CriterionCell key={code} score={cs.find((s) => s.criterion_code === code)?.score} />)}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-stone-500">{c.otherScore?.toFixed(1)}</td>
                    <td className="whitespace-nowrap px-3 py-2"><EmailStatus type={c.draft?.type} status={c.draft?.status} /></td>
                  </tr>
                  {c.id === lastAbove && (
                    <tr>
                      <td colSpan={7} className="border-y-2 border-dashed border-sky-300 bg-sky-50 px-3 py-1 text-center text-xs text-sky-800">
                        Interview line: above = invite draft · below = rejection draft
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ScreenedOutTable({ rows }: { rows: Awaited<ReturnType<typeof screenedOut>> }) {
  if (rows.length === 0) return <Card><p className="text-stone-500">Nobody has been screened out.</p></Card>;
  return (
    <>
      <p className="text-xs text-stone-500">
        These CVs missed at least one must-have, so they are not ranked. Each still has a rubric score and a rejection draft. A purple flag means the
        rubric rates them {INVITE_MIN_SCORE}+ anyway: open the candidate and consider overriding the screen.
      </p>
      <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-left">
          <thead className="border-b border-stone-200 bg-stone-50 text-xs text-stone-500">
            <tr>
              <th className="px-3 py-2">Candidate</th>
              <th className="px-3 py-2">Track</th>
              <th className="px-3 py-2">Missed must-have(s)</th>
              <th className="px-3 py-2 text-right">PM / SPM</th>
              <th className="px-3 py-2">Email</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-b border-stone-100 align-top hover:bg-stone-50">
                <td className="px-3 py-2">
                  <Link href={`/candidates/${c.id}`} className="font-medium underline-offset-2 hover:underline">{c.personal_details?.name ?? c.file_name}</Link>
                  <div className="max-w-sm text-xs text-stone-500">{c.headline}</div>
                  {screenLooksWrong(c) && <div className="mt-1 inline-block rounded bg-violet-100 px-1.5 py-0.5 text-xs text-violet-800">Rubric rates them {INVITE_MIN_SCORE}+ - check the screen</div>}
                  {c.screen_override === false && <div className="mt-1 text-xs text-stone-500">Screened out by your override</div>}
                </td>
                <td className="px-3 py-2 text-stone-600">{c.applied_role}</td>
                <td className="px-3 py-2">
                  <ul className="space-y-0.5 text-xs">
                    {failedGates(c.screen).map((g) => (
                      <li key={g.key}>
                        <span className="font-medium text-red-700">✗ {g.label}</span> <span className="text-stone-500">- {g.detail}</span>
                      </li>
                    ))}
                  </ul>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right font-mono text-stone-500">
                  {roleScore(c, "PM").toFixed(1)} / {roleScore(c, "SPM").toFixed(1)}
                </td>
                <td className="whitespace-nowrap px-3 py-2"><EmailStatus type={c.draft?.type} status={c.draft?.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
