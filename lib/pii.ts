// Separates personal details from CV content WITHOUT any AI call, so the raw CV
// (with name, email, phone) never leaves our server. Only `content` is ever sent
// to Gemini.

import type { PersonalDetails } from "./db";

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_CANDIDATE_RE = /\+?\(?\d[\d\s\-().]{8,}\d/g;
const URL_RE = /\bhttps?:\/\/[^\s|·•,;)]+|\b(?:www\.)?(?:linkedin\.com|github\.com|gitlab\.com|leetcode\.com|behance\.net|dribbble\.com|medium\.com|twitter\.com|x\.com|[a-z0-9-]+\.(?:vercel\.app|netlify\.app|github\.io|me|io|dev|site|page))\/?[^\s|·•,;)]*/gi;
const PERSONAL_LINE_RE = /^\s*(date of birth|dob|d\.o\.b|age|gender|sex|marital status|nationality|religion|father'?s name|mother'?s name|passport|aadhaa?r|pan)\b.*$/gim;
const SEPARATOR_RE = /\s*(?:\||·|•|–\s|—\s|\t|\s{2,})\s*/;

const HEADING_WORDS = new Set([
  "summary", "profile", "experience", "education", "skills", "resume", "curriculum", "vitae", "cv",
  "professional", "work", "history", "objective", "contact", "certifications", "projects", "synopsis",
  "core", "competencies", "product", "manager", "senior", "associate", "lead", "leader", "head", "engineer",
  "analyst", "consultant", "director", "officer", "founder", "operations", "strategy", "marketing", "growth",
  "executive", "sales", "specialist", "designer", "developer", "intern", "ai", "data", "program", "project",
  "business", "technical", "software", "brand", "vp", "principal", "owner",
]);

function isPhone(s: string) {
  const digits = s.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 13;
}

function findPhones(text: string) {
  return (text.match(PHONE_CANDIDATE_RE) ?? []).map((m) => m.trim()).filter(isPhone);
}

function looksLikeName(line: string) {
  const cleaned = line.replace(/[,.]$/, "").trim();
  if (!cleaned || /[\d@/:|]/.test(cleaned)) return false;
  const words = cleaned.split(/\s+/);
  if (words.length < 2 || words.length > 4) return false;
  if (words.some((w) => HEADING_WORDS.has(w.toLowerCase()))) return false;
  return words.every((w) => /^[A-Za-z][A-Za-z.'-]*$/.test(w) && /^[A-Z]/.test(w));
}

const titleCase = (s: string) =>
  s.toLowerCase().replace(/(^|[\s'-])([a-z])/g, (_, p, c) => p + c.toUpperCase());

function nameFromFileName(fileName?: string) {
  if (!fileName) return null;
  const base = fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[\d_\-.()]+/g, " ")
    .replace(/\b(cv|resume|curriculum|vitae|final|updated|pm|spm|apm)\b/gi, " ")
    .trim();
  const candidate = titleCase(base.replace(/\s+/g, " "));
  return looksLikeName(candidate) ? candidate : null;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Gendered words -> neutral, so the scorer can't pick up gender.
const PRONOUNS: [RegExp, string][] = [
  [/\bhimself\b|\bherself\b/gi, "themselves"],
  [/\bhe\b|\bshe\b/gi, "they"],
  [/\bhim\b/gi, "them"],
  [/\bhis\b|\bher\b/gi, "their"],
  [/\bhers\b/gi, "theirs"],
  [/\b(?:Mr|Mrs|Ms|Miss)\.?\s+/g, ""],
];

function matchCase(original: string, replacement: string) {
  return original[0] === original[0].toUpperCase() ? replacement[0].toUpperCase() + replacement.slice(1) : replacement;
}

export function splitPersonalDetails(raw: string, fileName?: string): { personal: PersonalDetails; content: string } {
  const lines = raw.split("\n");
  // Overlaid PDF text can glue a stray uppercase word onto the address ("REDDYsquad_5@...").
  const emails = [...new Set((raw.match(EMAIL_RE) ?? []).map((e) => e.replace(/^[A-Z]{2,}(?=[a-z0-9])/, "").toLowerCase()))];
  const phones = [...new Set(findPhones(raw))];
  const links = [...new Set((raw.replace(EMAIL_RE, " ").match(URL_RE) ?? []).map((l) => l.replace(/[.,]$/, "")))];

  // --- Name: the file name is the most reliable source (CVs arrive named after the
  // candidate, and some PDFs have garbled overlaid header text); the header is the fallback.
  let name: string | null = null;
  let nameLineIdx = -1;
  for (let i = 0; i < Math.min(lines.length, 6); i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (looksLikeName(line)) {
      name = titleCase(line);
      nameLineIdx = i;
      break;
    }
    // "Jane Doe  jane@x.com | +91 ..." on one line
    const lead = line.split(SEPARATOR_RE)[0];
    if (lead !== line && looksLikeName(lead) && (/@/.test(line) || findPhones(line).length > 0)) {
      name = titleCase(lead);
      nameLineIdx = i;
      break;
    }
  }
  name = nameFromFileName(fileName) ?? name;

  // --- Header contact lines: drop them from content; keep leftover bits (city etc.) as personal.
  const headerExtras: string[] = [];
  const kept: string[] = [];
  lines.forEach((line, i) => {
    if (i === nameLineIdx) return;
    const isContact = i < 10 && (/@/.test(line) || findPhones(line).length > 0 || new RegExp(URL_RE.source, "i").test(line));
    if (isContact) {
      for (const part of line.split(SEPARATOR_RE)) {
        const p = part.trim();
        if (!p || /@/.test(p) || isPhone(p) || new RegExp(URL_RE.source, "i").test(p)) continue;
        if (name && p.toLowerCase().includes(name.toLowerCase())) continue;
        headerExtras.push(p);
      }
      return;
    }
    kept.push(line);
  });

  let content = kept.join("\n");

  // --- Scrub anything left anywhere in the body.
  content = content.replace(EMAIL_RE, "[EMAIL]");
  for (const p of phones) content = content.split(p).join("[PHONE]");
  // Garbled / doubled numbers from overlaid PDF text: any long digit run is treated as a phone.
  content = content.replace(/\+?\d[\d\s-]{9,30}\d/g, (m) => (m.replace(/\D/g, "").length >= 10 ? "[PHONE]" : m));
  content = content.replace(URL_RE, "[LINK]");
  content = content.replace(PERSONAL_LINE_RE, "");

  if (name) {
    const parts = [name, ...name.split(/\s+/).filter((w) => w.replace(/\./g, "").length >= 3)];
    for (const part of parts.sort((a, b) => b.length - a.length)) {
      const p = escapeRe(part);
      // Title case also matches when glued to a neighbouring word ("MaratheShrey").
      content = content
        .replace(new RegExp(`${p}(?![a-z])`, "g"), "[CANDIDATE]")
        .replace(new RegExp(`(?<![A-Z])${p.toUpperCase()}(?![A-Z])`, "g"), "[CANDIDATE]")
        .replace(new RegExp(`\\b${p}\\b`, "gi"), "[CANDIDATE]");
    }
  }
  for (const [re, rep] of PRONOUNS) content = content.replace(re, (m) => (rep ? matchCase(m, rep) : rep));

  content = content.replace(/\n{3,}/g, "\n\n").trim();

  // Location = the short leftover header bits that look like a place.
  const location = headerExtras.find((e) => e.length <= 40 && /^[A-Za-z ,/.-]+$/.test(e)) ?? null;

  return {
    personal: {
      name,
      email: emails[0] ?? null,
      phone: phones[0] ?? null,
      links,
      location,
      header_extras: headerExtras.filter((e) => e !== location),
    },
    content,
  };
}

export function firstName(name?: string | null) {
  return name?.trim().split(/\s+/)[0] || "there";
}
