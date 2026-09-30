// Creates the tables and loads the rubric (from rubric.txt, via lib/rubric-data.ts)
// into rubric_criteria. Safe to re-run: criteria are upserted by code.

import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { RUBRIC } from "../lib/rubric-data";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Set DATABASE_URL in .env.local first");
  const sql = neon(url);

  const schema = readFileSync("db/schema.sql", "utf8")
    .split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");
  for (const stmt of schema.split(";").map((s) => s.trim()).filter(Boolean)) {
    await sql.query(stmt);
  }
  console.log("Tables ready: rubric_criteria, candidates, scores, email_drafts");

  for (const role of ["PM", "SPM"] as const) {
    const total = RUBRIC.filter((c) => c.role === role).reduce((s, c) => s + c.weight, 0);
    if (total !== 100) throw new Error(`${role} weights add to ${total}, not 100`);
  }

  for (const c of RUBRIC) {
    await sql`
      INSERT INTO rubric_criteria (role, code, name, weight, source, description, anchors, probe, red_flag, sort_order)
      VALUES (${c.role}, ${c.code}, ${c.name}, ${c.weight}, ${c.source}, ${c.description}, ${JSON.stringify(c.anchors)}::jsonb,
              ${c.probe}, ${c.red_flag}, ${c.sort_order})
      ON CONFLICT (code) DO UPDATE SET role = EXCLUDED.role, name = EXCLUDED.name, weight = EXCLUDED.weight,
        source = EXCLUDED.source, description = EXCLUDED.description, anchors = EXCLUDED.anchors,
        probe = EXCLUDED.probe, red_flag = EXCLUDED.red_flag, sort_order = EXCLUDED.sort_order`;
  }
  const rows = await sql`SELECT role, code, name, weight FROM rubric_criteria ORDER BY role, sort_order`;
  console.table(rows);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
