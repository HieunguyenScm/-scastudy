const MINUS_GLYPHS = /[−‒–—]/g;

/**
 * Parse a learner-entered number while tolerating natural unit suffixes.
 * The numeric value must appear first so prose answers do not become numbers by
 * accident. Both Vietnamese decimal commas and common Unicode minus glyphs are
 * accepted.
 *
 * @param {unknown} value
 * @returns {number | null}
 */
export function parseNumericAnswer(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;

  const normalized = value.trim().replace(MINUS_GLYPHS, "-");
  if (!normalized) return null;

  const match = normalized.match(/^[+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)/);
  if (!match) return null;

  const remainder = normalized.slice(match[0].length).trim();
  if (/^\d/.test(remainder)) return null;

  const parsed = Number(match[0].replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}
