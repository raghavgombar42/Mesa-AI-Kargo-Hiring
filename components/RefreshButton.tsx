"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Calls /api/refresh in batches until every brief and draft is up to date. */
export async function runRefreshLoop(onProgress?: (msg: string) => void) {
  const errors: string[] = [];
  for (let i = 0; i < 40; i++) {
    const res = await fetch("/api/refresh", { method: "POST" });
    const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
    errors.push(...(data.errors ?? []));
    onProgress?.(`Drafting briefs & emails… ${data.remaining} left`);
    if (!data.remaining) break;
  }
  return errors;
}

export function RefreshButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function go() {
    setBusy(true);
    setMsg("Checking…");
    try {
      const errors = await runRefreshLoop(setMsg);
      setMsg(errors.length ? `Done with ${errors.length} error(s): ${errors[0]}` : "Everything is up to date");
    } catch (e) {
      setMsg(String((e as Error).message));
    }
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      <button onClick={go} disabled={busy} className="rounded border border-stone-300 bg-white px-3 py-1.5 hover:bg-stone-50 disabled:opacity-50">
        {busy ? "Working…" : "Update briefs & drafts"}
      </button>
      {msg && <span className="text-xs text-stone-500">{msg}</span>}
    </div>
  );
}
