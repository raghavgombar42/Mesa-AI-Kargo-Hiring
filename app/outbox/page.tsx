import Link from "next/link";
import { connection } from "next/server";
import { Card } from "@/components/ui";
import { sql } from "@/lib/db";
import { firstName } from "@/lib/pii";
import { fillName } from "@/lib/writing";

type Row = {
  id: string;
  name: string | null;
  file_name: string;
  applied_role: string;
  type: "invite" | "rejection";
  status: "draft" | "sent" | "failed";
  subject: string;
  body: string;
  sent_at: string | null;
  sent_to: string | null;
  error: string | null;
  locked: boolean;
};

export default async function OutboxPage() {
  await connection();
  const rows = (await sql()`
    SELECT c.id, c.personal_details->>'name' AS name, c.file_name, c.applied_role,
           d.type, d.status, d.subject, d.body, d.sent_at, d.sent_to, d.error, d.locked
    FROM email_drafts d JOIN candidates c ON c.id = d.candidate_id
    ORDER BY d.sent_at DESC NULLS LAST, c.pm_score DESC`) as Row[];

  const groups: { title: string; hint: string; rows: Row[] }[] = [
    { title: "Invites waiting for you", hint: "read, edit if needed, then Confirm & send on the candidate page", rows: rows.filter((r) => r.status !== "sent" && r.type === "invite") },
    { title: "Rejections waiting for you", hint: "warm, specific drafts - nobody hears back until you confirm", rows: rows.filter((r) => r.status !== "sent" && r.type === "rejection") },
    { title: "Sent", hint: "delivered via Resend", rows: rows.filter((r) => r.status === "sent") },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Outbox</h1>
        <p className="text-stone-500">Every drafted email in one place. Nothing here has gone out unless it&apos;s under Sent.</p>
      </div>
      {groups.map((g) => (
        <Card key={g.title} title={<span>{g.title} <span className="font-normal text-stone-400">({g.rows.length}) · {g.hint}</span></span>}>
          {g.rows.length === 0 ? (
            <p className="text-xs text-stone-400">Nothing here.</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {g.rows.map((r) => (
                <li key={r.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-2">
                  <Link href={`/candidates/${r.id}`} className="w-44 shrink-0 font-medium underline-offset-2 hover:underline">{r.name ?? r.file_name}</Link>
                  <span className="w-10 shrink-0 text-xs text-stone-500">{r.applied_role}</span>
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{fillName(r.subject, firstName(r.name))}</span>
                    <span className="text-stone-500"> - {fillName(r.body, firstName(r.name)).replace(/\s+/g, " ").slice(0, 110)}…</span>
                  </span>
                  <span className="shrink-0 text-xs text-stone-500">
                    {r.status === "sent" ? (
                      <>Sent {new Date(r.sent_at!).toLocaleString()} → {r.sent_to}</>
                    ) : r.status === "failed" ? (
                      <span className="text-red-700">Failed: {r.error}</span>
                    ) : (
                      <Link href={`/candidates/${r.id}`} className="text-sky-700 underline">Review &amp; send →</Link>
                    )}
                    {r.locked && r.status !== "sent" && <span className="ml-2 text-stone-400">edited by you</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ))}
    </div>
  );
}
