"use client";

import Link from "next/link";
import { useState } from "react";
import { runRefreshLoop } from "@/components/RefreshButton";

type Item = { file: File; state: "queued" | "scoring" | "done" | "error"; id?: string; error?: string };

const CONCURRENCY = 3;

export function Uploader() {
  const [role, setRole] = useState<"" | "PM" | "SPM" | "AUTO">("");
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState("");

  const update = (i: number, patch: Partial<Item>) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  async function uploadOne(item: Item, i: number) {
    update(i, { state: "scoring" });
    const form = new FormData();
    form.append("file", item.file);
    form.append("role", role);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      update(i, { state: "done", id: data.id });
    } catch (e) {
      update(i, { state: "error", error: String((e as Error).message) });
    }
  }

  async function start() {
    if (!role || items.length === 0) return;
    setBusy(true);
    const started = Date.now();
    setPhase("Reading and scoring CVs…");
    let next = 0;
    const queue = items.map((it, i) => ({ it, i })).filter(({ it }) => it.state === "queued" || it.state === "error");
    await Promise.all(
      Array.from({ length: CONCURRENCY }, async () => {
        while (next < queue.length) {
          const { it, i } = queue[next++];
          await uploadOne(it, i);
        }
      }),
    );
    try {
      const errors = await runRefreshLoop(setPhase);
      const secs = Math.round((Date.now() - started) / 1000);
      setPhase(errors.length ? `Finished in ${secs}s with ${errors.length} drafting error(s): ${errors[0]}` : `All done in ${secs}s.`);
    } catch (e) {
      setPhase(`Scored, but drafting failed: ${(e as Error).message}`);
    }
    setBusy(false);
  }

  const done = items.filter((x) => x.state === "done").length;

  return (
    <div className="space-y-4 rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2">
          <span className="font-medium">Applied for</span>
          <select value={role} onChange={(e) => setRole(e.target.value as "PM" | "SPM" | "AUTO")} disabled={busy} className="rounded border border-stone-300 px-2 py-1.5">
            <option value="">Select role…</option>
            <option value="PM">Product Manager (PM)</option>
            <option value="SPM">Senior Product Manager (SPM)</option>
            <option value="AUTO">Not specified - let the screen route it</option>
          </select>
        </label>
        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (busy) return;
            const files = Array.from(e.dataTransfer.files).filter((f) => /\.(pdf|docx|txt)$/i.test(f.name));
            setItems(files.map((file) => ({ file, state: "queued" as const })));
          }}
          className={`flex min-w-64 flex-1 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 text-center ${
            busy ? "border-stone-200 text-stone-400" : "border-stone-300 hover:border-stone-500 hover:bg-stone-50"
          }`}
        >
          <span className="font-medium">{items.length ? `${items.length} file${items.length === 1 ? "" : "s"} selected` : "Drop CVs here or click to choose"}</span>
          <span className="text-xs text-stone-500">PDF, DOCX or TXT · one or many</span>
          <input
            type="file"
            multiple
            accept=".pdf,.docx,.txt"
            disabled={busy}
            onChange={(e) => setItems(Array.from(e.target.files ?? []).map((file) => ({ file, state: "queued" as const })))}
            className="sr-only"
          />
        </label>
        <button
          onClick={start}
          disabled={busy || !role || items.length === 0}
          className="rounded bg-stone-900 px-4 py-1.5 font-medium text-white disabled:opacity-40"
        >
          {busy ? "Processing…" : `Process ${items.length || ""} CV${items.length === 1 ? "" : "s"}`}
        </button>
      </div>
      {!role && items.length > 0 && <p className="text-amber-700">Select the role first - it decides which ranking the candidate joins.</p>}

      {phase && (
        <p className="text-stone-600">
          {phase} {!busy && done > 0 && <Link href={role === "AUTO" ? "/" : `/?role=${role}`} className="ml-2 underline">Open dashboard →</Link>}
        </p>
      )}

      {items.length > 0 && (
        <ul className="divide-y divide-stone-100 border-t border-stone-100">
          {items.map((it, i) => (
            <li key={i} className="flex items-center justify-between gap-3 py-1.5">
              <span className="truncate">{it.file.name}</span>
              <span className="shrink-0 text-xs">
                {it.state === "queued" && <span className="text-stone-400">queued</span>}
                {it.state === "scoring" && <span className="text-sky-700">scoring…</span>}
                {it.state === "done" && <Link href={`/candidates/${it.id}`} className="text-emerald-700 underline">scored ✓</Link>}
                {it.state === "error" && <span className="text-red-700" title={it.error}>error: {it.error?.slice(0, 90)}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
