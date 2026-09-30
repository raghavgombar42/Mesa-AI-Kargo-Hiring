import { bandFor } from "@/lib/rubric-data";

const TONES = {
  green: "bg-emerald-100 text-emerald-800",
  blue: "bg-sky-100 text-sky-800",
  amber: "bg-amber-100 text-amber-800",
  gray: "bg-stone-200 text-stone-700",
} as const;

export function BandBadge({ score }: { score: number | null }) {
  const band = bandFor(score);
  if (!band) return null;
  return <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${TONES[band.tone]}`}>{band.label}</span>;
}

export function CriterionCell({ score }: { score: number | undefined }) {
  const s = score ?? 0;
  const tone = s >= 4 ? "bg-emerald-600 text-white" : s === 3 ? "bg-emerald-200" : s === 2 ? "bg-amber-100" : s === 1 ? "bg-stone-200" : "bg-stone-100 text-stone-400";
  return <span className={`inline-flex h-6 w-6 items-center justify-center rounded font-mono text-xs ${tone}`}>{s}</span>;
}

export function EmailStatus({ type, status }: { type?: string; status?: string }) {
  if (!type) return <span className="text-stone-400">not drafted</span>;
  if (status === "sent") return <span className="font-medium text-emerald-700">✓ {type === "invite" ? "Invite" : "Rejection"} sent</span>;
  if (status === "failed") return <span className="font-medium text-red-700">Send failed</span>;
  return <span className={type === "invite" ? "text-sky-700" : "text-stone-500"}>{type === "invite" ? "Invite draft" : "Rejection draft"}</span>;
}

export function Card({ title, children, className = "" }: { title?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-stone-200 bg-white p-4 ${className}`}>
      {title && <h2 className="mb-3 font-semibold">{title}</h2>}
      {children}
    </section>
  );
}
