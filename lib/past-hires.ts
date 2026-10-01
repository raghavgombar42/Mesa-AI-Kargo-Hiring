// Kargo's 8 past hires as rubric profiles (rubric.txt section 6: criterion scores
// C1..C5). A candidate is matched to the hire with the most similar SHAPE of
// strengths (which criteria are high or low), with overall level as a tie-breaker.
// Pure code - no AI call.

export type PastHire = { name: string; role: string; rating: "Exceeds" | "Meets" | "Below"; profile: number[] };

export const PAST_HIRES: PastHire[] = [
  { name: "Rohan Desai", role: "Head of Engineering", rating: "Exceeds", profile: [4, 4, 4, 4, 3] },
  { name: "Sunita Krishnamurthy", role: "Operations Lead", rating: "Exceeds", profile: [4, 4, 4, 3, 4] },
  { name: "Lavanya Iyer", role: "Product Manager", rating: "Exceeds", profile: [4, 4, 3, 4, 4] },
  { name: "Meghna Tiwari", role: "Customer Success Manager", rating: "Exceeds", profile: [4, 3, 4, 3, 3] },
  { name: "Aditya Shetty", role: "Sales Lead", rating: "Exceeds", profile: [3, 3, 3, 2, 3] },
  { name: "Preetham Rao", role: "Backend Engineer", rating: "Below", profile: [1, 1, 1, 1, 0] },
  { name: "Rahul Bose", role: "Growth & Marketing Lead", rating: "Meets", profile: [0, 2, 0, 0, 2] },
  { name: "Vikram Nair", role: "Product Manager", rating: "Meets", profile: [0, 1, 0, 1, 1] },
];

/** Short labels for the five criteria, in C1..C5 order (same for PM and SPM). */
export const CRITERION_SHORT = ["Ops", "Build", "Break", "Spec", "Owner"] as const;
export const CRITERION_LONG = ["Operator's Chair", "Unasked Build", "Absorbs the Break", "Ops-to-Spec / System", "Sole Owner"] as const;

// How much overall level counts next to the shape of the profile. Tuned so every
// past hire matches itself and candidates spread across several hires (not all
// onto the one with the most average scores).
const LEVEL_WEIGHT = 0.5;

const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;

export function closestPastHire(profile: number[]) {
  const mp = mean(profile);
  let best: { hire: PastHire; distance: number } | null = null;
  for (const hire of PAST_HIRES) {
    const mh = mean(hire.profile);
    const shape = Math.sqrt(hire.profile.reduce((s, v, i) => s + ((profile[i] ?? 0) - mp - (v - mh)) ** 2, 0));
    const distance = shape + LEVEL_WEIGHT * Math.abs(mp - mh);
    if (!best || distance < best.distance) best = { hire, distance };
  }
  const { hire } = best!;
  const mh = mean(hire.profile);
  // Criteria where both are at or above their own average = the strengths they share.
  const shared = profile
    .map((p, i) => (p >= mp && p > 0 && hire.profile[i] >= mh ? CRITERION_SHORT[i] : null))
    .filter((x): x is (typeof CRITERION_SHORT)[number] => !!x);
  return { hire, distance: best!.distance, shared };
}
