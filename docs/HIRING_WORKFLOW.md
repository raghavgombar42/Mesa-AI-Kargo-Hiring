# Kargo Hiring Workflow — PM & SPM

*MESA · AI and its Applications · Case 02 (Arjun / Kargo) · last updated 30 Sep 2026*

**In one line:** 60 CVs arrive and a founder has made 0 offers in 11 weeks. We screen every CV against five hard must-haves, rank the survivors on a rubric built from Arjun's own best hires (not the job description), write a brief and a personal email for each one, and let Arjun make the only decision that matters: who gets the email.

**Result on the 60 applications:** 1 duplicate caught · **39 screened out** · 21 ranked (10 PM, 11 SPM) · **8 interview-invite drafts** (5 PM, 3 SPM) · 52 warm rejection drafts · 0 emails sent without Arjun's click.

---

## 1. Reference files

| File | What it is | What we took from it |
|---|---|---|
| `MESA_Case02_Problem_Statement (1).pdf` | Case pre-read (the version with the outcomes table) | The pain, the user, the goal ("make an offer"), the 8 past hires and their ratings |
| `MESA_Case02_Problem_Statement.pdf` | Same pre-read without the table | Near-duplicate, not used |
| `MESA_Kargo_JD_Product Manager.docx` | PM job description | What the role *is*: first PM, core ops platform, 2–4 yrs, reports to Arjun |
| `MESA_Kargo_JD_Senior Product Manager (1).docx` | SPM job description | Integration & data layer, 5–8 yrs, no committee, path to Head of Product |
| `drive-download-20260928T044000Z-1-001/` (8 `.docx`) | CVs of Kargo's 8 past hires | The source of the rubric: what the Exceeds hires had in common |
| `rubric.txt` (copy in `docs/rubric.txt`) | Checkpoint L4-1 output | 5 criteria × 2 roles, weights, anchors, calibration table |
| `MESA_Lecture 4_Case 02-Arjun_Deck.pdf` | Class execution plan | Nine Checks, the Cut, stack, checkpoints L4-1 → B-3 |
| `MESA_Case 02_Answer Key.pdf` | Step-by-step build guide | Prompts, "done when" criteria, data-privacy questions |
| `MESA_Case 02_Components Map.png` | Trigger → Input → Context → Processing → AI → Output map | The system boundary: founder uploads, system scores, AI drafts, Resend sends on click |
| `drive-download-20260929T093936Z-1-001/` (60 `.pdf`) | The applications | What we screened and ranked (section 8) |

---

## 2. The problem (Automation Brief)

- **Pain.** 60 applications in 11 weeks, 19 opened, 0 offers. Two strong people who reached out in August got "let's chat" and never heard back. Every review starts from scratch, late at night, on instinct, with no record of why anyone was picked or passed. Sprint priorities drift while the PM seats are empty, and the investor targets slip.
- **User.** Arjun Mehta, founder, and the hiring manager for every role (Kargo has no HR function). He has 45-minute windows.
- **Outcome.** An offer to the right person before year end. First he needs a shortlist he can trust, with enough per candidate to decide in under 10 minutes (who they are, why they rank there, what to probe). After his decision everything else happens without him, and people he doesn't move forward hear back too.
- **Journey today.** CV lands in a folder → sometimes opened → judged against the JD by gut → "let's chat" or silence → no notes → the next batch starts from zero.

## 3. Nine Checks and the Cut

| # | Check | Verdict |
|---|---|---|
| 1 | Problem real? | Yes: 60 received / 19 opened / 0 offers; the cost compounds weekly |
| 2 | Workflow repeated? | Yes: applications keep arriving; the review-and-stall cycle repeats each batch |
| 3 | Input available? | Yes: 60 CVs, 8 hire profiles with outcomes, 2 JDs |
| 4 | Output valuable? | Yes: a ranked shortlist with reasons replaces 60 unread PDFs |
| 5 | Impact measurable? | Yes: baseline 0 offers in 11 weeks; target first offer within 2 weeks |
| 6 | Failure risk OK? | Yes for ranking and drafting. **No for auto-rejection**: a wrongly rejected candidate never comes back and nobody ever finds out |
| 7 | Judgment protected? | Yes: Arjun reviews every shortlist and confirms every send |
| 8 | ROI worth it? | Yes: a PM hire is 6–12 months of product velocity |
| 9 | Owner clear? | Yes for the shortlist. **No for auto-rejection**: no person is accountable for a system rejection |

**The Cut (Checks 6 + 9).** Arjun wants emails to go out without him chasing them. We automate everything up to the email (extraction, screening, scoring, ranking, brief, draft) but **nothing is sent until Arjun clicks Confirm on that specific candidate**. Screening out a CV only means it isn't ranked. The candidate still gets a drafted, human-reviewed rejection, and Arjun can override the screen.

---

## 4. What the past hires taught us

Kargo has hired 8 people. The 5 rated **Exceeds** (Rohan, Sunita, Aditya, Meghna, Lavanya) share three things the JDs never ask for. The 3 rated **Meets/Below** (Vikram, Rahul, Preetham) have none of them.

| Pattern | What it looks like on a CV | Exceeds | Others |
|---|---|---|---|
| **A. Sat in the operator's chair** | Personally handled live freight or logistics work: named documents (BoL, shipping bills, DOs, customs holds) and volumes ("180+ shipments/month") | 5 / 5 | 0 / 3 |
| **B. Built the fix nobody asked for, and others adopted it** | Self-initiated, outside their own remit, voluntarily adopted, still in use ("Excel tracker → adopted by the 12-person ops team in 2 weeks") | 5 / 5 | 0 / 3 |
| **C. Absorbed the break themselves** | Something broke or load spiked and they contained it with no headcount and no escalation ("resolved before the client became aware") | 5 / 5 | 0 / 3 |

**The natural experiment.** Kargo hired two PMs. **Vikram** matched the PM JD better (3 yrs PM, 40+ interviews, 12 features, Product School, Reforge, conference speaker) and was rated *Meets*. **Lavanya** had only 2 yrs PM but had spent 3 years running carrier operations at a 3PL, and was rated *Exceeds*. Same role, same founder, opposite outcome. The JD picked the wrong one. Our rubric scores Lavanya 95 and Vikram 12.5.

**What we deliberately ignore:** years (in the rubric), titles, certifications (both PMs had Product School), college/MBA brand, company brand, tool lists, conference talks, revenue numbers on their own, and every personal detail.

---

## 5. What a Kargo PM and a Kargo SPM look like

| | **Product Manager** | **Senior Product Manager** |
|---|---|---|
| The job (JD) | First PM on the core operations platform (tracking, documentation, status visibility). Reports to Arjun | Owns the integration & data layer (carriers, port portals, ERPs, FMS). Most senior PM; makes the "we'll feel it in two years" calls with no committee |
| Floor (Stage 1) | 2+ yrs full-time work of any kind · 1+ yr owning what gets built · has done ops work or built for ops users · at least 1 measured result | 5+ yrs full-time · 3+ yrs owning what gets built · has done ops work or built for ops users · at least 1 measured result |
| What predicts success (Stage 2) | Has **been** the operator (a 3PL/forwarder/CHA seat is the model), has built unasked tools others adopted, has contained breaks alone, can name the ops→spec mismatch they found, and has been the sole owner | Same patterns at a higher bar: ops seat **plus** hands-on with the systems (CargoWise, ICEGATE/EDI, TMS, port portals); has contained **system-level** breaks (vendor format change, migration under pressure); has led an integration or migration end to end with a build-vs-configure call; has been the final decision-maker for years |
| Model past hire | Lavanya Iyer | Rohan Desai / Sunita Krishnamurthy |
| Anti-pattern | Vikram: polished PM CV, discovery-by-interview, one of four PMs, all wins | 1 of 12 engineers who integrated 3PL APIs from a desk (Preetham) |

---

## 6. The workflow

```
Arjun uploads CV(s) + picks role (PM / SPM / Not specified)
        │
Stage 0  INTAKE (code, no AI)
        │  parse PDF/DOCX → split personal details off (name, email, phone, links, location;
        │  gendered pronouns neutralised) → duplicate check against every CV already received
        │
Stage 1  HARD SCREEN — 5 must-haves (AI extracts facts with quotes; code decides)
        │  fail any → "Screened out": not ranked, rejection draft, Arjun can override
        │  SPM applicant below SPM floors but clear for PM → rerouted to the PM track
        │
Stage 2  RUBRIC — both PM and SPM scored for everyone (5 criteria × 0–4, quote-or-zero)
        │  weighted 0–100 → band → rank within track
        │
Stage 3  LINE + WRITING (AI, redacted content only)
        │  top 5 per track with score ≥ 55 → interview invite draft
        │  top 5 per track → 3-sentence brief + probe questions
        │  everyone else (incl. screened out) → warm, specific rejection draft
        │
Stage 4  ARJUN (the only human step)
           reads brief + draft → edits / switches invite↔rejection / overrides screen
           → Confirm & send (Resend) → decision + note recorded
```

Every candidate still gets a Stage 2 score even when screened out. It costs one extra AI call and gives us a safety net: if the rubric rates a screened-out CV 55+, the dashboard flags it as "check the screen".

---

## 7. Stage 1 — the five must-haves

The screen is a **floor**, not a ranking. It answers "could this person plausibly do *this* job?" The rubric then answers "will they thrive at Kargo?" The model only extracts facts, each backed by a verbatim quote. Plain code applies the thresholds and checks that every quote actually appears in the CV. So every screening decision can be read, audited and overridden.

| # | Must-have | PM | SPM | Why it's a gate |
|---|---|---|---|---|
| 1 | **Genuine, unique application** | Readable CV of one person with a dated work history; not a duplicate (≥ 85% text overlap with a CV already received) | same | You can't assess what you can't read. Duplicates distort the ranking (the data had one: `21_aryan_kulkarni` = `14_sneha_kulkarni`) |
| 2 | **Full-time experience floor** | ≥ 2 years | ≥ 5 years | The JD floor. It counts **any** full-time work, not PM years, so an ops veteran who moved into product (the Lavanya model) passes. Internships and education don't count |
| 3 | **Has owned what gets built** | ≥ 12 months | ≥ 36 months | Accountable for a product, product area, or a self-built system others used (PM, product owner, product-building founder, engineer who owned a product). Project delivery, consulting, brand management, analytics and "supporting senior PMs" don't count. The first PM has nobody to learn ownership from |
| 4 | **Operations proximity** | Has *done* operations-heavy work (logistics, freight, customs, ports, supply chain, warehousing, fulfilment, manufacturing, field ops) **or** built product whose primary users are ops teams | same | Pattern A was present in 5/5 Exceeds and 0/3 others, the strongest signal in the data. The gate is deliberately looser than the rubric: building *for* ops users is enough to pass. The rubric then rewards having *done* the work |
| 5 | **Evidence, not adjectives** | ≥ 1 result they personally drove, with a number, quoted from the CV | same | The rubric's "evidence or zero" rule applied at the door. We first tried ≥ 2 and dropped it to 1: demanding many numbers rewards polished CVs, which is exactly Vikram's profile |

**Deliberately not gates:** location / in-office (a personal detail; ask in the interview), college, certifications, company brand, title, "years of PM".

**Routing.** "Not specified" CVs go to the SPM track if they clear the SPM floors, otherwise PM. SPM applicants who miss only the SPM seniority floors but clear PM are rerouted to PM instead of being screened out.

### How many get rejected at screening, and on what basis

We didn't pick a target number. The number falls out of the five rules. On this batch **39 of 60 (65%)** were screened out:

| Must-have missed | CVs failing it | …as the *only* reason |
|---|---|---|
| 4 · Operations proximity | 31 | 20 |
| 3 · Owned what gets built | 13 | 3 |
| 2 · Experience floor | 7 | 0 |
| 5 · Evidence | 7 | 1 |
| 1 · Genuine / unique | 1 (the duplicate) | 1 |

By source: 26 of the 30 numbered, untagged CVs were screened out (marketing, strategy/consulting, students, consumer apps, fintech). So were 7 of 15 `pm_` and 6 of 15 `spm_` CVs: mostly JD-perfect profiles from HR-tech, banking, FMCG brand, consumer growth or IT delivery with no operations exposure. These are the Vikram pattern.

**Is the screen too harsh?** We checked with the rubric itself. Of the 39 screened-out CVs, the highest rubric score is **51.3** (`11_tarun_joseph`, SPM), below the 55 shortlist bar. So on this batch the screen removed **nobody** the rubric would have shortlisted. It only removed reading time.

---

## 8. Stage 2 — the rubric (from `rubric.txt`)

| Criterion | PM weight | SPM weight | Source |
|---|---|---|---|
| 1 · Operator's Chair | 30 | 25 | Pattern A (Lavanya vs Vikram) |
| 2 · Unasked Build, Organic Adoption | 25 | 15 | Pattern B |
| 3 · Absorbs the Break | 20 | 20 | Pattern C |
| 4 · Ops-to-Spec / Ops-to-System Translation | 15 | 20 | Supporting signal |
| 5 · Sole Owner | 10 | 20 | Supporting signal |

Each criterion is scored 0–4 on written anchors. Weighted score = Σ(score/4 × weight), giving 0–100. Every score above 0 needs a verbatim quote, and **if the quote isn't found in the CV, the code sets that criterion to 0**. Bands: 75+ strong shortlist · 55–74 shortlist · 35–54 hold · <35 do not advance.

**Calibration.** Plugging rubric.txt's criterion scores for the 8 past hires into our scoring code reproduces its table exactly: Rohan 97.5, Sunita 96.3, Lavanya 95.0, Meghna 87.5, Aditya 71.3 vs Preetham 22.5, Rahul 17.5, Vikram 12.5. That's a clean ~45-point gap between Exceeds and the rest.

**The line.** An invite draft goes to the top 5 per track **and** only if they score ≥ 55. Arjun can move anyone across the line.

## 9. Results on the 60 applications

*A dry run of the real pipeline on 30 Sep 2026 (Gemini 3.6 Flash, temperature 0). Scores can move a few points between runs; the dashboard is the live source of truth.*

Reading the tables: "Came in as" is the role on the file (`pm_`/`spm_`) or "not specified" for the numbered CVs. C1–C5 are the five criterion scores for that track.

#### PM track (10 ranked)

| # | Candidate (file) | Came in as | PM score | C1–C5 | Other role | Draft |
|---|---|---|---|---|---|---|
| 1 | Priya Krishnan (`pm_01_priya_krishnan.pdf`) | PM | **77.5** | 3 3 3 3 4 | 66.3 | **Invite** |
| 2 | Ananya Rajan (`pm_05_ananya_rajan.pdf`) | PM | **71.3** | 4 2 3 1 4 | 61.3 | **Invite** |
| 3 | Kabir Mehta (`pm_02_kabir_mehta.pdf`) | PM | **70.0** | 2 3 3 3 4 | 72.5 | **Invite** |
| 4 | Virat Patel (`pm_04_virat_patel.pdf`) | PM | **65.0** | 4 1 3 1 4 | 58.8 | **Invite** |
| 5 | Deepika Nair (`pm_03_deepika_nair.pdf`) | PM | **61.3** | 4 2 0 3 3 | 57.5 | **Invite** |
| | *— interview line —* | | | | | |
| 6 | Shrey Marathe (`24_shrey_marathe.pdf`) | not specified | **56.3** | 2 2 2 3 3 | 60.0 | Rejection |
| 7 | Megha Gupta (`pm_09_megha_gupta.pdf`) | PM | **53.8** | 2 2 2 3 2 | 45.0 | Rejection |
| 8 | Aditi Sharma (`pm_07_aditi_sharma.pdf`) | PM | **36.3** | 2 0 2 1 3 | 32.5 | Rejection |
| 9 | Rohan Sane (`pm_10_rohan_sane.pdf`) | PM | **27.5** | 1 1 1 1 2 | 25.0 | Rejection |
| 10 | Sneha Kulkarni (`14_sneha_kulkarni.pdf`) | not specified | **22.5** | 2 0 0 0 3 | 10.0 | Rejection |

#### SPM track (11 ranked)

| # | Candidate (file) | Came in as | SPM score | C1–C5 | Other role | Draft |
|---|---|---|---|---|---|---|
| 1 | Poornima Nair (`spm_19_poornima_nair.pdf`) | SPM | **77.5** | 4 2 2 3 4 | 71.3 | **Invite** |
| 2 | Siddharth Rao (`spm_16_siddharth_rao.pdf`) | SPM | **71.3** | 3 2 2 3 4 | 81.3 | **Invite** |
| 3 | Aryan Verma (`spm_18_aryan_verma.pdf`) | SPM | **71.3** | 3 2 2 3 4 | 71.3 | **Invite** |
| | *— interview line —* | | | | | |
| 4 | Nalini Iyer (`spm_17_nalini_iyer.pdf`) | SPM | **48.8** | 3 0 0 2 4 | 66.3 | Rejection |
| 5 | Varun Khanna (`spm_20_varun_khanna.pdf`) | SPM | **45.0** | 1 1 2 1 4 | 42.5 | Rejection |
| 6 | Manish Agarwal (`spm_22_manish_agarwal.pdf`) | SPM | **42.5** | 2 0 2 2 2 | 41.3 | Rejection |
| 7 | Preethi Suresh (`spm_23_preethi_suresh.pdf`) | SPM | **35.0** | 2 2 0 0 3 | 63.8 | Rejection |
| 8 | Meera Krishnan (`26_meera_krishnan.pdf`) | not specified | **27.5** | 2 0 2 0 1 | 33.8 | Rejection |
| 9 | Vikram Shetty (`08_vikram_shetty.pdf`) | not specified | **26.3** | 2 1 0 0 2 | 32.5 | Rejection |
| 10 | Kritika Sharma (`spm_21_kritika_sharma.pdf`) | SPM | **26.3** | 1 0 0 3 1 | 17.5 | Rejection |
| 11 | Sourav Das (`spm_25_sourav_das.pdf`) | SPM | **11.3** | 1 0 0 0 1 | 21.3 | Rejection |

#### Screened out (39)

| Candidate (file) | Came in as | Missed must-have(s) | Rubric PM / SPM |
|---|---|---|---|
| Rohan Mehta (`01_rohan_mehta.pdf`) | not specified | **Owned what gets built** – 0.0 yrs owning what gets built (needs 1.0 yrs) | 20.0 / 22.5 |
| Priya Sharma (`02_priya_sharma.pdf`) | not specified | **Owned what gets built** – 0.0 yrs owning what gets built (needs 1.0 yrs); **Ops proximity** – No operations-heavy work or ops users | 0.0 / 0.0 |
| Arnav Sen (`03_arnav_sen.pdf`) | not specified | **Ops proximity** – No operations-heavy work or ops users; **Evidence** – 0 verified quantified outcome(s) (needs 1) | 21.3 / 26.3 |
| Arjun Verma (`04_arjun_verma.pdf`) | not specified | **Ops proximity** – No operations-heavy work or ops users | 38.8 / 42.5 |
| Ishaan Roy (`05_ishaan_roy.pdf`) | not specified | **Ops proximity** – No operations-heavy work or ops users | 7.5 / 10.0 |
| Kavya Patel (`06_kavya_patel.pdf`) | not specified | **Experience floor** – 0.0 yrs full-time (needs 2.0 yrs); **Ops proximity** – No operations-heavy work or ops users | 7.5 / 10.0 |
| Aditya Nair (`07_aditya_nair.pdf`) | not specified | **Evidence** – 0 verified quantified outcome(s) (needs 1) | 13.8 / 16.3 |
| Rahul Gupta (`09_rahul_gupta.pdf`) | not specified | **Ops proximity** – No operations-heavy work or ops users; **Evidence** – 0 verified quantified outcome(s) (needs 1) | 22.5 / 23.8 |
| Nikhil Sharma (`10_nikhil_sharma.pdf`) | not specified | **Ops proximity** – No operations-heavy work or ops users | 17.5 / 13.8 |
| Tarun Joseph (`11_tarun_joseph.pdf`) | not specified | **Ops proximity** – No operations-heavy work or ops users | 47.5 / 51.3 |
| Suresh Raj (`12_suresh_raj.pdf`) | not specified | **Experience floor** – 1.6 yrs full-time (needs 2.0 yrs); **Ops proximity** – No operations-heavy work or ops users | 18.8 / 13.8 |
| Mohit Singh (`13_mohit_singh.pdf`) | not specified | **Owned what gets built** – 0.0 yrs owning what gets built (needs 1.0 yrs) | 23.8 / 28.8 |
| Ravi Kumar (`15_ravi_kumar.pdf`) | not specified | **Experience floor** – 1.3 yrs full-time (needs 2.0 yrs); **Owned what gets built** – 0.0 yrs owning what gets built (needs 1.0 yrs); **Ops proximity** – No operations-heavy work or ops users; **Evidence** – 0 verified quantified outcome(s) (needs 1) | 17.5 / 18.8 |
| Shiva Kumar (`16_shiva_kumar.pdf`) | not specified | **Experience floor** – 1.5 yrs full-time (needs 2.0 yrs); **Owned what gets built** – 0.0 yrs owning what gets built (needs 1.0 yrs); **Ops proximity** – No operations-heavy work or ops users; **Evidence** – 0 verified quantified outcome(s) (needs 1) | 0.0 / 5.0 |
| Pranav Joshi (`17_pranav_joshi.pdf`) | not specified | **Ops proximity** – No operations-heavy work or ops users | 13.8 / 15.0 |
| Divya Iyer (`18_divya_iyer.pdf`) | not specified | **Ops proximity** – No operations-heavy work or ops users | 35.0 / 32.5 |
| Vivek Patil (`19_vivek_patil.pdf`) | not specified | **Experience floor** – 0.0 yrs full-time (needs 2.0 yrs); **Owned what gets built** – 0.0 yrs owning what gets built (needs 1.0 yrs); **Ops proximity** – No operations-heavy work or ops users | 0.0 / 0.0 |
| Deepak Yadav (`20_deepak_yadav.pdf`) | not specified | **Ops proximity** – No operations-heavy work or ops users | 26.3 / 35.0 |
| Aryan Kulkarni (`21_aryan_kulkarni.pdf`) | not specified | **Genuine/unique** – Duplicate of a CV already received | 40.0 / 36.3 |
| Harsh Reddy (`22_harsh_reddy.pdf`) | not specified | **Experience floor** – 0.0 yrs full-time (needs 2.0 yrs); **Owned what gets built** – 0.0 yrs owning what gets built (needs 1.0 yrs) | 26.3 / 20.0 |
| Karan Das (`23_karan_das.pdf`) | not specified | **Ops proximity** – No operations-heavy work or ops users | 15.0 / 18.8 |
| Avinash Mukherjee (`25_avinash_mukherjee.pdf`) | not specified | **Experience floor** – 1.3 yrs full-time (needs 2.0 yrs); **Owned what gets built** – 0.0 yrs owning what gets built (needs 1.0 yrs) | 43.8 / 35.0 |
| Abhishek Tiwari (`27_abhishek_tiwari.pdf`) | not specified | **Ops proximity** – No operations-heavy work or ops users | 11.3 / 8.8 |
| Manish Kapoor (`28_manish_kapoor.pdf`) | not specified | **Ops proximity** – No operations-heavy work or ops users | 13.8 / 18.8 |
| Rohan Basu (`29_rohan_basu.pdf`) | not specified | **Ops proximity** – No operations-heavy work or ops users | 11.3 / 15.0 |
| Aman Borkar (`30_aman_borkar.pdf`) | not specified | **Ops proximity** – No operations-heavy work or ops users | 2.5 / 0.0 |
| Prashant Kumar (`pm_06_prashant_kumar.pdf`) | PM | **Ops proximity** – No operations-heavy work or ops users | 22.5 / 20.0 |
| Nishant Joshi (`pm_08_nishant_joshi.pdf`) | PM | **Ops proximity** – No operations-heavy work or ops users | 22.5 / 30.0 |
| Sneha Patil (`pm_11_sneha_patil.pdf`) | PM | **Ops proximity** – No operations-heavy work or ops users | 6.3 / 5.0 |
| Akash Verma (`pm_12_akash_verma.pdf`) | PM | **Owned what gets built** – 0.0 yrs owning what gets built (needs 1.0 yrs); **Ops proximity** – No operations-heavy work or ops users | 3.8 / 0.0 |
| Divya Menon (`pm_13_divya_menon.pdf`) | PM | **Ops proximity** – No operations-heavy work or ops users | 5.0 / 5.0 |
| Ravi Shankar (`pm_14_ravi_shankar.pdf`) | PM | **Ops proximity** – No operations-heavy work or ops users | 8.8 / 13.8 |
| Tanvi Jain (`pm_15_tanvi_jain.pdf`) | PM | **Owned what gets built** – 0.0 yrs owning what gets built (needs 1.0 yrs); **Ops proximity** – No operations-heavy work or ops users | 6.3 / 3.8 |
| Nikhil Kapoor (`spm_24_nikhil_kapoor.pdf`) | SPM | **Ops proximity** – No operations-heavy work or ops users | 43.8 / 31.3 |
| Anupama Singh (`spm_26_anupama_singh.pdf`) | SPM | **Owned what gets built** – 0.0 yrs owning what gets built (needs 3.0 yrs) | 2.5 / 5.0 |
| Gaurav Yadav (`spm_27_gaurav_yadav.pdf`) | SPM | **Ops proximity** – No operations-heavy work or ops users | 15.0 / 12.5 |
| Meena Pillai (`spm_28_meena_pillai.pdf`) | SPM | **Owned what gets built** – 0.0 yrs owning what gets built (needs 3.0 yrs); **Ops proximity** – No operations-heavy work or ops users; **Evidence** – 0 verified quantified outcome(s) (needs 1) | 6.3 / 5.0 |
| Rajesh Kumar (`spm_29_rajesh_kumar.pdf`) | SPM | **Owned what gets built** – 0.0 yrs owning what gets built (needs 3.0 yrs); **Evidence** – 0 verified quantified outcome(s) (needs 1) | 15.0 / 16.3 |
| Priya Iyer (`spm_30_priya_iyer.pdf`) | SPM | **Ops proximity** – No operations-heavy work or ops users | 2.5 / 10.0 |

### What Arjun should notice

- **The five PM invites all sat in an operator's chair before product** (3PL, warehouse, freight forwarder at Mundra, a family CHA firm). That's Pattern A, as the past hires predicted.
- **Cross-role signals.** Siddharth Rao (applied SPM) scores **81.3 as a PM**, the highest PM score in the batch. Kabir Mehta (applied PM) scores 72.5 as an SPM. Nalini Iyer (applied SPM, 48.8) scores 66.3 as a PM. The dashboard flags these as "Scores higher for PM/SPM".
- **The SPM bench is thin above the line:** only 3 reach 55. Nalini Iyer and Varun Khanna are the next looks if Arjun wants a fourth interview.
- **Shrey Marathe** (untagged, #6 PM at 56.3) is the only numbered CV that came close to the line.

---

## 10. Data quality findings (and what we did)

| Finding | Impact | Handling |
|---|---|---|
| The numbered CVs have redacted names/phones **overlaid** on the originals; raw text reads like "ROohHaAnNMMehEtHa" | Name/phone extraction from the header fails | Take the name from the file name; treat any long digit run as a phone; strip stray uppercase glued to emails ("REDDYsquad_5@…") |
| The job-title line was mistaken for a name (07, 30) | "Product Manager" got redacted throughout the CV | Title words can never be a name; the file name is the preferred source |
| A portfolio URL contained the name (`pranavjoshi.vercel.app`) | Name would have leaked to the AI | Every URL is redacted |
| One CV submitted twice under two names (14 / 21) | Would appear twice in the ranking | Duplicate gate (5-word-shingle overlap ≥ 85%) |
| 30 CVs have no role label | Can't be ranked in a role | "Not specified" option; the screen routes them |
| All emails are MESA test addresses (`squad_N@pg27.mesaschool.co`) | Resend's sandbox only delivers to the account owner | `EMAIL_OVERRIDE_TO` routes every send to the test inbox |

After the fixes, a check across all 68 CVs (60 applications + 8 hires) found **no name, email or phone left in the text the AI sees**.

## 11. Privacy and human control

- **Personal details never reach the AI.** The split happens in code, before any model call. Each candidate page shows "CV content as the AI saw it".
- **A billed Gemini key for real data.** The free tier may use inputs to improve Google's models; the billed API does not.
- **No auto-rejection, no auto-send.** Screen-outs are recommendations with reasons. Every email needs Arjun's click; drafts he edits are locked from regeneration; every decision is stored with an optional note. That fixes "no record of why".
- **Optional dashboard password** (`DASHBOARD_PASSWORD`) before the URL is shared.

## 12. The system

| Layer | Choice |
|---|---|
| App | Next.js 16 (App Router) on Vercel |
| Database | Neon Postgres: `rubric_criteria` (10 rows), `candidates` (personal details, redacted CV, screen, scores, brief, decision), `scores` (per criterion + quote), `email_drafts` |
| AI | Gemini 3.6 Flash, used for three things: screen facts, rubric scoring, brief/email writing. Structured JSON output, temperature 0 for judging |
| Email | Resend, one call per Confirm click |
| Code map | `lib/pii.ts` Stage 0 · `lib/screening.ts` Stage 1 · `lib/scoring.ts` Stage 2 · `lib/pipeline.ts` ranking + line · `lib/writing.ts` brief/email · `lib/send.ts` Resend |
| Scripts | `npm run db:setup` (tables + rubric) · `npm run ingest -- <folder>` (bulk load, role from `pm_`/`spm_` prefix) · `npm run screen-report -- <folder>` (dry run, no DB) · `npm run calibrate -- <folder>` (past hires vs rubric.txt) |

## 13. Known limits and next steps

1. **Single run, small sample.** The rubric is calibrated on 8 hires, and model scores move a few points between runs. Re-check the weights after the first 2–3 new hires have a rating.
2. **The ops gate narrows the pool on purpose.** It's the strongest signal in Kargo's history, but it will reject a great PM from outside logistics. The safety-net flag and Arjun's override exist for exactly that case.
3. **Not yet live.** The database, deployment and Resend delivery still need the Neon connection string and a Vercel import.
4. **Resend sandbox.** Mail goes only to the account owner's inbox until a domain is verified.
