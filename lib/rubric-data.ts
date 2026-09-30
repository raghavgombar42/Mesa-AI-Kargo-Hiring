// Transcribed from rubric.txt (Checkpoint L4-1). This file seeds the
// rubric_criteria table; at runtime the scorer reads criteria from the DB.

export type Role = "PM" | "SPM";

export type Criterion = {
  role: Role;
  code: string;
  name: string;
  weight: number;
  source: string;
  description: string;
  anchors: { score: number; text: string }[];
  probe: string;
  red_flag: string | null;
  sort_order: number;
};

export const SCORING_RULES = `SCORING RULES (apply to every criterion, both roles)
- Score each criterion 0-4 using the anchors given.
- EVIDENCE OR ZERO: every score above 0 must quote a specific line from the CV (a document type, a volume, a counterparty, a named artefact, an adoption number). Adjectives in a summary ("hands-on", "ownership mindset", "passionate about logistics") earn nothing on their own.
- Count what the person did, not what their team or company did.
- Where evidence is ambiguous, score the lower anchor and put the doubt into the "doubt" note - the interview is where ambiguity gets resolved, not the CV.

WHAT THIS RUBRIC DELIBERATELY IGNORES (zero weight, do not let it leak in)
- Years of experience, job titles, seniority labels.
- PM certifications and communities: Product School, Reforge, CPO certificates.
- College / MBA brand.
- Company brand or size. Large, structured employers were, if anything, a negative context.
- Tool lists and frameworks (JIRA, Figma, JTBD, OKRs).
- Conference talks, "thought leadership".
- Revenue / ARR / pipeline numbers on their own. They count only when they come from an unasked build or a contained break.
- Name, gender, age, photo, location of origin, or any personal detail.`;

export const RUBRIC: Criterion[] = [
  // ---------------------------------------------------------------- PM
  {
    role: "PM",
    code: "PM-1",
    name: "Operator's Chair",
    weight: 30,
    source: "Pattern A | Anchored on: Lavanya (Exceeds) vs Vikram (Meets) - same role",
    description:
      "Has personally held a role where they were accountable for live freight, logistics, supply-chain or port operations - not a role that sold to, analysed, or built software for those operations. The CV names the operational objects they handled (Bills of Lading, shipping bills, DOs, customs holds, carrier allocation, detention, exceptions, slot bookings) and gives a volume or cadence (shipments per month, accounts per day). For a PM this can be a pre-product career (3 years at a 3PL is the model) or an ops-heavy role inside a logistics tech company.",
    anchors: [
      { score: 4, text: "2+ years in a frontline ops seat at a forwarder / CHA / 3PL / port / carrier, with named documents or processes AND volumes." },
      { score: 3, text: "1-2 years in such a seat, OR a customer-facing commercial/CS role that sat inside daily operations (e.g. sales at a port terminal working alongside terminal ops)." },
      { score: 2, text: "Frontline ops in an adjacent operations-heavy domain (field service, manufacturing floor, last-mile, e-commerce fulfilment ops) with volumes and consequences." },
      { score: 1, text: "Built or managed software FOR logistics users from the office; discovery via calls/interviews only (e.g. integrating 3PL APIs)." },
      { score: 0, text: "No operational exposure." },
    ],
    probe: "Walk me through a morning when a shipment you were responsible for got stuck. Who called you, what document was wrong, what did you do in the first hour?",
    red_flag: "Talks about \"the user\" in the abstract; cannot name a document or counterparty.",
    sort_order: 1,
  },
  {
    role: "PM",
    code: "PM-2",
    name: "Unasked Build, Organic Adoption",
    weight: 25,
    source: "Pattern B | Anchored on: Rohan, Sunita, Lavanya, Meghna",
    description:
      "Can show at least one tool, process or feature they started without being assigned, that fixed a problem they saw in someone's workflow, and that OTHER people adopted voluntarily and kept using. The CV states who adopted it and how fast or how widely (e.g. \"adopted by the 12-member ops team within two weeks\", \"used by 2 other regional teams\", \"now the team standard\"). Scrappy is fine - Excel first, software later is the pattern.",
    anchors: [
      { score: 4, text: "2+ unasked builds with named adoption by people outside their own reporting line, still in use or productised." },
      { score: 3, text: "1 clear unasked build with measured adoption beyond themselves." },
      { score: 2, text: "Self-initiated improvement adopted within their own immediate team, or an artefact outside their remit with thin adoption evidence." },
      { score: 1, text: "Artefacts that are standard outputs of their own job (a PM writing a PRD template, a marketer running case studies, an engineer building a monitor for own service)." },
      { score: 0, text: "Only assigned roadmap/deliverables listed." },
    ],
    probe: "What is something you built that nobody asked for? Who uses it today, and how did they find out about it?",
    red_flag: "\"Shipped 12 features\" with no line about who chose to use them.",
    sort_order: 2,
  },
  {
    role: "PM",
    code: "PM-3",
    name: "Absorbs the Break",
    weight: 20,
    source: "Pattern C | Anchored on: Meghna, Rohan, Sunita",
    description:
      "The CV contains at least one moment where something broke or load spiked - a hold, an outage, a vendor change, a departing colleague, a volume surge, a lost deal - and the candidate contained it themselves through process redesign or direct action, WITHOUT adding headcount or escalating, and the customer/team was protected. They describe the failure honestly, not just the win.",
    anchors: [
      { score: 4, text: "2+ concrete break-and-contain episodes with the outcome stated (\"before the client became aware\", \"no additional headcount\", \"no disruption\", \"no churn\")." },
      { score: 3, text: "1 clear episode, or a candid loss/kill with a documented lesson that changed practice (e.g. an outage post-mortem, killed features, a lost-deal post-mortem)." },
      { score: 2, text: "Handles incidents inside an assigned process (on-call rota, escalation path), with results." },
      { score: 1, text: "Mentions pressure or \"fast-paced environments\" with no specific episode." },
      { score: 0, text: "CV is 100% wins and % of target; problems are solved by hiring or presenting upward." },
    ],
    probe: "Tell me about the worst week in your last job. What broke, what did you change, and who never found out it broke?",
    red_flag: "Every answer ends with \"so I escalated\" or \"so we hired\".",
    sort_order: 3,
  },
  {
    role: "PM",
    code: "PM-4",
    name: "Ops-to-Spec Translation",
    weight: 15,
    source: "Supporting signal | Anchored on: Rohan, Lavanya, Meghna",
    description:
      "Has converted something observed on the operations floor into a concrete change engineers could build, and can name the specific workflow mismatch they found (e.g. discovering how carriers actually confirmed slot bookings, leading to a pivot that cut tickets 60%; translating field requirements into spec without a product layer; turning an undocumented limitation hurting 4 accounts into a bug report and running the fix). Volume of interviews does not count; the specific mismatch found does.",
    anchors: [
      { score: 4, text: "Names a specific ground-level workflow mismatch they found AND the shipped change AND an operational result (tickets, delays, exceptions, adoption)." },
      { score: 3, text: "Clear example of ops -> spec translation with a result, less specific on the mismatch." },
      { score: 2, text: "Worked alongside engineering on ops-facing features, but insight came from others." },
      { score: 1, text: "Discovery described as method/volume (\"40+ user interviews\", \"JTBD framework\") with no specific operational insight." },
      { score: 0, text: "No evidence of bridging ops and product/engineering." },
    ],
    probe: "What is one thing users told you that turned out to be wrong once you watched them work?",
    red_flag: null,
    sort_order: 4,
  },
  {
    role: "PM",
    code: "PM-5",
    name: "Sole Owner",
    weight: 10,
    source: "Supporting signal | Anchored on: Lavanya (sole PM) vs Vikram (1 of 4 PMs)",
    description:
      "Has owned a product area, account book or process end to end where they were the only person accountable - no senior PM, manager layer or committee making the call. The CV says so explicitly (\"sole PM\", \"no account manager layer\", \"independent\", \"most senior in the room\") and shows a decision they made and stood behind.",
    anchors: [
      { score: 4, text: "Sole owner of an area with a named consequential call they made (e.g. killing a feature customers asked for, based on usage data)." },
      { score: 3, text: "Sole owner, decisions implied but not named." },
      { score: 2, text: "Owned a sub-area with a senior above who set direction." },
      { score: 1, text: "One of several peers in a structured function; presents upward for decisions." },
      { score: 0, text: "Execution role only." },
    ],
    probe: "What is a call you made that your manager would not have made? What happened?",
    red_flag: null,
    sort_order: 5,
  },
  // ---------------------------------------------------------------- SPM
  {
    role: "SPM",
    code: "SPM-1",
    name: "Operator's Chair",
    weight: 25,
    source: "Pattern A | Anchored on: Rohan, Sunita",
    description:
      "Has held accountability for live logistics operations AND understands the systems those operations run on: they have used or migrated the forwarder/customs stack themselves (CargoWise, ICEGATE/customs EDI, TMS, port portals, carrier systems). The models are a CHA ops executive who became a freight-tracking engineer, and a documentation executive who ran an FMS migration: they know what the integration has to survive because they lived the manual version.",
    anchors: [
      { score: 4, text: "2+ years in a frontline ops seat AND hands-on with the operational systems or data flows (FMS, customs EDI, TMS, carrier/port portals), with volumes." },
      { score: 3, text: "2+ years frontline ops, lighter systems exposure; OR long ops-embedded role at a logistics tech company working inside customer operations." },
      { score: 2, text: "Ops-heavy adjacent domain (supply chain, field ops, fulfilment) with systems exposure." },
      { score: 1, text: "Built integrations for logistics from the office only." },
      { score: 0, text: "No operational exposure." },
    ],
    probe: "Draw me the path a Bill of Lading takes from your customer's system to the carrier and back. Where does it break?",
    red_flag: null,
    sort_order: 1,
  },
  {
    role: "SPM",
    code: "SPM-2",
    name: "Unasked Build, Organic Adoption",
    weight: 15,
    source: "Pattern B | Anchored on: Rohan (weekend prototype -> core platform feature)",
    description:
      "At SPM level the bar is not a spreadsheet the team used - it is an unasked build that became part of the platform or the organisation's standard way of working. The model is a verification module built as a weekend prototype -> 30 users in month 1 -> now a core platform feature.",
    anchors: [
      { score: 4, text: "Self-initiated build that became a core product capability or a cross-team standard, with adoption numbers." },
      { score: 3, text: "2+ unasked builds adopted beyond own team, not yet productised." },
      { score: 2, text: "1 unasked build with adoption inside own team." },
      { score: 1, text: "Only standard artefacts of own role." },
      { score: 0, text: "Only assigned deliverables." },
    ],
    probe: "Which thing you built without permission is now something the company depends on?",
    red_flag: null,
    sort_order: 2,
  },
  {
    role: "SPM",
    code: "SPM-3",
    name: "Absorbs the Break",
    weight: 20,
    source: "Pattern C | Anchored on: Rohan (vendor migration), Sunita (vendor format change)",
    description:
      "Has contained a SYSTEM-level break - a data vendor failing, an upstream format changing without notice, an outage, a migration under time pressure - and protected customers while fixing the root cause (e.g. legacy data-vendor migration with no data loss and 60% less lag; FMS vendor changed its export format overnight, weekend redesign retained permanently). Writes the post-mortem and changes the standard afterwards.",
    anchors: [
      { score: 4, text: "2+ system-level break-and-contain episodes with customer impact stated and a lasting fix/standard left behind." },
      { score: 3, text: "1 system-level episode, or several operational ones with a durable fix." },
      { score: 2, text: "Operational firefighting only, no root-cause or standard change." },
      { score: 1, text: "Generic pressure claims, no episode." },
      { score: 0, text: "Wins-only CV; problems handed upward or solved by hiring." },
    ],
    probe: "An upstream carrier API changes its schema on a Friday night. Tell me about the last time something like that actually happened to you.",
    red_flag: null,
    sort_order: 3,
  },
  {
    role: "SPM",
    code: "SPM-4",
    name: "Ops-to-System Translation",
    weight: 20,
    source: "Supporting signal | Anchored on: Rohan, Sunita, Lavanya",
    description:
      "Has stood on the seam between operations and technical systems and made architectural calls there: scoping migrations, choosing what to build vs configure vs leave alone, documenting integrations so customers onboard faster. Evidence: translating field requirements into engineering spec with no product layer and leading a vendor migration; scoping a paper-to-cloud FMS migration, managing the vendor, training staff and monitoring go-live; writing the first API documentation (-2 weeks on integration timelines).",
    anchors: [
      { score: 4, text: "Led at least one integration/migration end to end (scope, vendor or partner, rollout, post-go-live) AND names a build-vs-configure-vs-avoid decision with its outcome." },
      { score: 3, text: "Led an integration/migration end to end, decision logic less explicit." },
      { score: 2, text: "Contributed to integrations as one of several owners." },
      { score: 1, text: "Integration work only from the engineering side, no ops context." },
      { score: 0, text: "No integration or ops-system work." },
    ],
    probe: "Tell me about an integration you decided NOT to build. How did you explain that to sales?",
    red_flag: null,
    sort_order: 4,
  },
  {
    role: "SPM",
    code: "SPM-5",
    name: "Sole Owner",
    weight: 20,
    source: "Supporting signal | Anchored on: Sunita (independent), Rohan (\"most senior in the room\"), Lavanya (\"She doesn't hedge.\")",
    description:
      "Has been the final decision-maker - not a contributor - for a product area, platform or client operation for a sustained period, with no senior layer to escalate to, and can name calls they made that had long-term consequences and that they lived with. For SPM this is the most important difference from PM: the role has no committee that approves product decisions and a path to Head of Product.",
    anchors: [
      { score: 4, text: "2+ years as the most senior owner of an area (sole/lead PM, head of function, independent operator) with named long-horizon calls and their consequences, including at least one that went wrong." },
      { score: 3, text: "Sole owner for 1-2 years, calls named." },
      { score: 2, text: "Senior contributor with a strong manager above setting direction." },
      { score: 1, text: "One of several peers; decisions made in reviews/committees." },
      { score: 0, text: "Execution role only." },
    ],
    probe: "What decision are you still living with from two years ago? Would you make it again?",
    red_flag: null,
    sort_order: 5,
  },
];

export const BANDS = [
  { min: 75, label: "Strong shortlist", tone: "green" },
  { min: 55, label: "Shortlist", tone: "blue" },
  { min: 35, label: "Hold", tone: "amber" },
  { min: 0, label: "Do not advance", tone: "gray" },
] as const;

export function bandFor(score: number | null | undefined) {
  if (score == null) return null;
  return BANDS.find((b) => score >= b.min) ?? BANDS[BANDS.length - 1];
}
