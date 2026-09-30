import { connection } from "next/server";
import { Card } from "@/components/ui";
import { getCriteria } from "@/lib/db";
import { BANDS, type Role } from "@/lib/rubric-data";

export default async function RubricPage() {
  await connection();
  const criteria = await getCriteria();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Rubric</h1>
        <p className="text-stone-500">
          Loaded from the <code>rubric_criteria</code> table. Built from Arjun&apos;s 8 past hires, not the job descriptions. Weighted score = Σ (score / 4 × weight).
          Bands: {BANDS.map((b) => `${b.min}+ ${b.label}`).join(" · ")}.
        </p>
      </div>
      {(["PM", "SPM"] as Role[]).map((role) => {
        const rows = criteria.filter((c) => c.role === role);
        return (
          <Card key={role} title={`${role === "PM" ? "Product Manager" : "Senior Product Manager"} - weights total ${rows.reduce((s, c) => s + c.weight, 0)}%`}>
            <div className="space-y-4">
              {rows.map((c) => (
                <div key={c.code} className="border-t border-stone-100 pt-3">
                  <div className="font-medium">
                    {c.code} · {c.name} <span className="font-normal text-stone-500">· {c.weight}%</span>
                  </div>
                  <div className="text-xs text-stone-400">{c.source}</div>
                  <p className="mt-1 text-stone-700">{c.description}</p>
                  <ul className="mt-2 space-y-0.5 text-xs text-stone-600">
                    {c.anchors.map((a) => (
                      <li key={a.score}>
                        <b className="font-mono">{a.score}</b> - {a.text}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-amber-800">Probe: {c.probe}</p>
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
