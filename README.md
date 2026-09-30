# Kargo Hiring Dashboard

Internal tool for Arjun (founder, Kargo). Upload a CV → personal details are split off and kept private → a **hard screen** checks five must-haves → the CV content is scored by Gemini against **both** the PM and SPM rubric (from `docs/rubric.txt`, built from Arjun's 8 past hires) → candidates are ranked → the top 5 per role get a 3-sentence interview brief → every candidate gets a personalised draft (invite above the line, warm rejection below) → Arjun reads, edits if he wants, and clicks **Confirm & send** (Resend). Nothing is sent without that click.

Stack: Next.js 16 · Neon Postgres · Gemini Flash · Resend · Vercel.

## How it works

| Step | Where | AI? |
|---|---|---|
| Parse PDF / DOCX / TXT | `lib/parse.ts` | no |
| Split personal details (name, email, phone, links, location; gendered pronouns neutralised) | `lib/pii.ts` | **no** – done in code so the raw CV never reaches Gemini |
| Stage 1 hard screen: Gemini extracts facts (months full-time, months owning a product, ops exposure, measured outcomes) with quotes; code applies 5 must-haves + duplicate check, routes "not specified" CVs, reroutes under-level SPM applicants to PM | `lib/screening.ts` | facts only; the decision is code |
| Score 10 criteria (5 PM + 5 SPM), 0–4 each, with a verbatim evidence quote + one-line reason + doubt to probe | `lib/scoring.ts` | Gemini, temperature 0, JSON schema |
| Evidence-or-zero: if the quote isn't actually in the CV, that criterion is set to 0 | `lib/scoring.ts` | no |
| Weighted score = Σ(score/4 × weight), band, rank per role | `lib/scoring.ts`, `lib/pipeline.ts` | no |
| Brief (top 5 per role) + email draft (everyone), `[NAME]` placeholder | `lib/writing.ts` | Gemini |
| Substitute real first name, send via Resend, record decision + note | `lib/send.ts` | no |

**The line:** invite draft = top `INVITE_TOP_N` (5) in the applied role **and** score ≥ `INVITE_MIN_SCORE` (55). Everyone else gets a rejection draft. Arjun can override either way ("Switch to invite/rejection") and edit any draft; edited drafts are locked so the pipeline never overwrites them.

**Flags** on a card: "Scores higher for SPM/PM" (cross-role fit) and "No ops background but strong builder/absorber" (the rubric's own honest-limits check).

**Full workflow, the five must-haves, and results on the 60 applications:** see [`docs/HIRING_WORKFLOW.md`](docs/HIRING_WORKFLOW.md).

## Tables (Neon)

- `rubric_criteria` – one row per criterion per role (10 rows), seeded from the rubric
- `candidates` – `personal_details` (jsonb, never sent to AI), `cv_content` (redacted), scores, headline, brief, probes, decision + note
- `scores` – per-criterion score, reason, evidence, doubt, evidence_verified
- `email_drafts` – type, subject, body, locked, status (draft / sent / failed), sent_to, resend_id

## Setup (local)

1. Create a Neon project → copy the **pooled** connection string.
2. Get a Gemini API key from Google AI Studio.
3. Fill in `.env.local` (see `.env.example` for all options). Leave `RESEND_API_KEY` blank for now.
4. ```bash
   npm install
   npm run db:setup      # creates tables + loads the 10 rubric criteria
   npm run dev           # http://localhost:3000
   ```
5. Load the 60 applications in one go (role from the `pm_`/`spm_` file prefix, others "not specified"), or use the Upload page:
   ```bash
   npm run ingest -- "../drive-download-20260929T093936Z-1-001"
   ```
6. Optional but recommended – check the scorer against the 8 past hires before trusting it on new CVs:
   ```bash
   npm run calibrate -- "../drive-download-20260928T044000Z-1-001"
   ```
   It prints model scores next to the expected scores in rubric.txt §6 and whether Exceeds hires separate from Meets/Below.

## Deploy (Vercel)

1. Confirm `.env.local` is git-ignored (`git check-ignore .env.local` prints the path).
2. Push to GitHub → Import into Vercel → add the same env vars (`DATABASE_URL`, `GEMINI_API_KEY`, `DASHBOARD_PASSWORD`, …) → Deploy.
3. Session B: create a Resend key, add `RESEND_API_KEY` in Vercel, redeploy. Without a verified domain Resend only delivers from `onboarding@resend.dev` to your own Resend account address – set `EMAIL_OVERRIDE_TO` to the MESA test address to route every email there.

## Privacy notes

- Gemini only ever receives `cv_content`. Check it yourself: each candidate page has "CV content as the AI saw it".
- The Gemini **free tier** may use inputs to improve Google's models; a **billing-enabled** key does not. Use a billed key for real candidate data.
- Set `DASHBOARD_PASSWORD` before sharing the URL – the dashboard shows personal details and can send email.
