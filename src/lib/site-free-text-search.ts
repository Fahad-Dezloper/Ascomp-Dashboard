/**
 * Shared “site / address / contact” free-text search used by:
 * - Admin & engineer site directory (client)
 * - AMC lookup site box (server, after scanning projector + site rows)
 *
 * Handles NBSP, line breaks, and punctuation so typed spaces match messy DB text.
 */

export function normalizeForSearch(s: string): string {
  return s
    .normalize("NFKC")
    .replace(/\u00a0/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\r?\n|\r|\t/g, " ")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Match user query against one combined haystack built from site + projector strings.
 * - Phrase: normalized query appears as substring in the combined blob (words can span
 *   adjacent fields, e.g. name ends with “Eva” and address continues “Mall …”).
 * - Multi-word: or every significant token (≥2 chars) appears somewhere in the combined blob.
 */
export function haystackMatchesFreeTextQuery(
  haystackParts: Array<string | null | undefined>,
  rawQuery: string,
): boolean {
  const qNorm = normalizeForSearch(rawQuery);
  if (!qNorm) return true;

  const parts = haystackParts
    .filter((x) => x != null && String(x).trim() !== "")
    .map((x) => normalizeForSearch(String(x)));

  if (parts.length === 0) return false;

  const combined = parts.join(" ");

  const phraseMatch = combined.includes(qNorm);

  const tokens = qNorm
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
    .slice(0, 12);

  if (tokens.length === 0) {
    return phraseMatch;
  }

  if (tokens.length === 1) {
    return phraseMatch;
  }

  const allWordsMatch = tokens.every((tok) => combined.includes(tok));
  return phraseMatch || allWordsMatch;
}
