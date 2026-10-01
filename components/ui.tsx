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

export function CriterionCell({ score, wide, title }: { score: number | undefined; wide?: boolean; title?: string }) {
  const s = score ?? 0;
  const tone = s >= 4 ? "bg-emerald-600 text-white" : s === 3 ? "bg-emerald-200" : s === 2 ? "bg-amber-100" : s === 1 ? "bg-stone-200" : "bg-stone-100 text-stone-400";
  return <span title={title} className={`inline-flex h-6 ${wide ? "w-9" : "w-6"} items-center justify-center rounded font-mono text-xs ${tone}`}>{s}</span>;
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

export function ScoreBar({ score }: { score: number }) {
  const band = bandFor(score);
  const fill = { green: "bg-emerald-600", blue: "bg-sky-600", amber: "bg-amber-500", gray: "bg-stone-400" }[band?.tone ?? "gray"];
  return (
    <div className="flex items-center gap-2">
      <span className="w-10 text-right font-mono text-base font-semibold">{score.toFixed(1)}</span>
      <span className="h-1.5 w-20 overflow-hidden rounded-full bg-stone-100">
        <span className={`block h-full ${fill}`} style={{ width: `${Math.max(2, Math.min(100, score))}%` }} />
      </span>
    </div>
  );
}

export function PastHireTag({ name, rating, title }: { name: string; rating: string; title?: string }) {
  const tone = rating === "Exceeds" ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-stone-100 text-stone-600 ring-stone-200";
  return (
    <span title={title} className={`inline-block whitespace-nowrap rounded px-1.5 py-0.5 text-xs ring-1 ${tone}`}>
      {name.split(" ")[0]} · {rating}
    </span>
  );
}

export function Stepper({ steps }: { steps: { label: string; state: "done" | "current" | "todo" | "skipped" }[] }) {
  return (
    <ol className="flex overflow-hidden rounded-lg border border-stone-200 bg-white text-xs">
      {steps.map((s, i) => (
        <li
          key={s.label}
          className={`flex flex-1 items-center justify-center gap-1 px-2 py-2 text-center ${i ? "border-l border-stone-200" : ""} ${
            s.state === "done"
              ? "bg-emerald-50 text-emerald-800"
              : s.state === "current"
                ? "bg-stone-900 font-medium text-white"
                : s.state === "skipped"
                  ? "bg-red-50 text-red-700"
                  : "text-stone-400"
          }`}
        >
          {s.state === "done" ? "✓ " : s.state === "skipped" ? "✗ " : ""}
          {s.label}
        </li>
      ))}
    </ol>
  );
}
