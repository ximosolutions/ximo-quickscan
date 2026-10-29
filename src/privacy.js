// Browser-only heuristic checks. This is not a complete privacy or DLP scan.
const checks = [
  ['email', /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi],
  ['iban', /\bNL\d{2}[A-Z]{4}\d{10}\b/gi],
  ['confidential', /\b(?:vertrouwelijk|geheim|salarisgegevens|personeelsdossier)\b/gi]
];
export function privacyWarnings(value) {
  const input = typeof value === 'string' ? value : JSON.stringify(value);
  if (typeof input !== 'string') return [];
  return checks.flatMap(([kind, pattern]) => {
    pattern.lastIndex = 0;
    const count = [...input.matchAll(pattern)].length;
    return count ? [{ kind, count }] : [];
  });
}
