// Kargo's 8 past hires as rubric profiles (rubric.txt section 6: criterion scores
// C1..C5). A candidate's own C1..C5 on their track is matched to the nearest one.
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

export function closestPastHire(profile: number[]) {
  let best: { hire: PastHire; distance: number } | null = null;
  for (const hire of PAST_HIRES) {
    const distance = Math.sqrt(hire.profile.reduce((s, v, i) => s + (v - (profile[i] ?? 0)) ** 2, 0));
    if (!best || distance < best.distance) best = { hire, distance };
  }
  return best!;
}
