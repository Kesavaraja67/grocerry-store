/**
 * Domain module for voice and text matching, phonetic normalization,
 * and alias search for Pandian Store.
 *
 * Designed specifically for colloquial Tamil transliterations,
 * shop nicknames, and bilingual grocery catalog searching.
 */

export interface MatchCandidate {
  id: string;
  name: string;
  nameTamil?: string | null;
  aliases?: string[];
  [key: string]: any;
}

/**
 * Phonetic normalization key for Tamil transliterations and colloquial grocery terms.
 * Normalizes double consonants, diphthongs (ai -> a), soft consonants (th -> t),
 * ensuring terms like "thenga ennai" and "thengai ennai" produce the identical key.
 */
export function phoneticKey(str: string): string {
  if (!str) return "";

  let s = str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0B80-\u0BFF\s]/g, " ")
    .replace(/\s+/g, " ");

  // 1. Double consonants collapse (e.g. nn -> n, pp -> p, tt -> t)
  s = s.replace(/([a-z])\1+/g, "$1");

  // 2. Diphthong normalizations
  // "ai" at word boundary or internal -> "a" (e.g. thengai -> thenga, ennai -> enna)
  s = s.replace(/ai\b/g, "a");
  s = s.replace(/ai/g, "a");

  // 3. Consonant transliteration normalizations
  // "th" -> "t" (e.g. thenga -> tenga, thoor -> toor)
  s = s.replace(/th/g, "t");

  // "dh" -> "d" (e.g. dhal -> dal)
  s = s.replace(/dh/g, "d");

  // "zh" -> "l" (e.g. kozhambu -> kolambu)
  s = s.replace(/zh/g, "l");

  // "ee" -> "i", "oo" -> "u"
  s = s.replace(/ee/g, "i");
  s = s.replace(/oo/g, "u");

  // soft c / sh -> s
  s = s.replace(/c([eiy])/g, "s$1");
  s = s.replace(/sh/g, "s");

  // Collapse double consonants again after substitutions
  s = s.replace(/([a-z])\1+/g, "$1");

  return s.trim();
}

/**
 * Ranks candidate products by matching score against user search query.
 * Considers exact match, substring match, alias match, Tamil script, and phonetic similarity.
 * Returns sorted list of matching items.
 */
export function rankMatches<T extends MatchCandidate>(
  query: string,
  candidates: T[]
): T[] {
  if (!query || !query.trim()) return candidates;

  const rawQ = query.trim().toLowerCase();
  const qPhonetic = phoneticKey(rawQ);
  const qWords = rawQ.split(/\s+/).filter(Boolean);

  const scored: Array<{ item: T; score: number }> = [];

  for (const item of candidates) {
    let score = 0;
    const nameLower = item.name.toLowerCase();
    const tamilLower = item.nameTamil?.toLowerCase() || "";
    const aliasesLower = (item.aliases || []).map((a) => a.toLowerCase());

    // 1. Exact match
    if (nameLower === rawQ || tamilLower === rawQ || aliasesLower.includes(rawQ)) {
      score += 100;
    }

    // 2. Substring match
    if (nameLower.includes(rawQ) || (tamilLower && tamilLower.includes(rawQ))) {
      score += 80;
    }
    for (const a of aliasesLower) {
      if (a === rawQ) {
        score += 85;
      } else if (a.includes(rawQ) || rawQ.includes(a)) {
        score += 70;
      }
    }

    // 3. Phonetic match
    const namePhonetic = phoneticKey(item.name);
    const aliasPhonetics = (item.aliases || []).map((a) => phoneticKey(a));

    if (namePhonetic === qPhonetic || aliasPhonetics.includes(qPhonetic)) {
      score += 65;
    } else if (
      namePhonetic.includes(qPhonetic) ||
      aliasPhonetics.some((ap) => ap.includes(qPhonetic) || qPhonetic.includes(ap))
    ) {
      score += 50;
    }

    // 4. Token overlap
    for (const w of qWords) {
      if (nameLower.includes(w) || tamilLower.includes(w) || aliasesLower.some((a) => a.includes(w))) {
        score += 20;
      }
      const wPhonetic = phoneticKey(w);
      if (wPhonetic.length > 2) {
        if (namePhonetic.includes(wPhonetic) || aliasPhonetics.some((ap) => ap.includes(wPhonetic))) {
          score += 15;
        }
      }
    }

    if (score > 0) {
      scored.push({ item, score });
    }
  }

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  return scored.map((s) => s.item);
}

