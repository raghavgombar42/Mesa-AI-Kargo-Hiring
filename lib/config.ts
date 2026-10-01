// Where "the line" sits. A candidate gets an interview-invite draft only if they
// are in the top N for the role they applied to AND score at least the minimum.
export const INVITE_TOP_N = Number(process.env.INVITE_TOP_N ?? 5);
export const INVITE_MIN_SCORE = Number(process.env.INVITE_MIN_SCORE ?? 55);

// Top N per role get a 3-sentence interview brief.
export const BRIEF_TOP_N = Number(process.env.BRIEF_TOP_N ?? 5);

export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

// Rubric scoring: one call per role in parallel at MEDIUM thinking (measured: ~10s
// per CV, as consistent as the model default at ~30s). SCORING_READS > 1 adds
// parallel reads per role where the lowest score wins per criterion.
export const SCORING_READS = Number(process.env.SCORING_READS ?? 1);
export const SCORING_THINKING = (process.env.SCORING_THINKING || "MEDIUM") as "MINIMAL" | "LOW" | "MEDIUM" | "HIGH";
// Fact extraction for the screen, briefs and emails need little reasoning.
export const FAST_THINKING = (process.env.FAST_THINKING || "LOW") as "MINIMAL" | "LOW" | "MEDIUM" | "HIGH";

export const EMAIL_FROM = process.env.EMAIL_FROM || "Kargo Hiring <onboarding@resend.dev>";
// Safety net for class use: when set, every email goes here instead of the candidate's address.
export const EMAIL_OVERRIDE_TO = process.env.EMAIL_OVERRIDE_TO || "";

export const SENDER_NAME = process.env.SENDER_NAME || "Arjun Mehta";
export const COMPANY_NAME = "Kargo";
