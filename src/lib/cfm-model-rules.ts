export type CfmModelRule = {
  /** Substring matched against normalized projector model (e.g. CP2220). */
  projectorModelPattern: string;
  min: number;
  max: number;
};

export function normalizeModelToken(s: string): string {
  return String(s || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

/** Inclusive range: min ≤ value ≤ max → OK. */
export function evaluateCfmBand(
  value: number,
  min: number,
  max: number,
): "OK" | "LOW" | "HIGH" {
  if (value < min) return "LOW";
  if (value > max) return "HIGH";
  return "OK";
}

export function findMatchingCfmRule(
  projectorModel: string,
  rules: CfmModelRule[],
): CfmModelRule | null {
  const model = normalizeModelToken(projectorModel);
  if (!model || !rules.length) return null;
  for (const rule of rules) {
    const p = normalizeModelToken(rule.projectorModelPattern);
    if (p && model.includes(p)) return rule;
  }
  return null;
}

/**
 * Stored `exhaustCfm` for DB/PDF: YES when no reading, else band OK/LOW/HIGH when a rule matches, else legacy OK.
 */
export function exhaustCfmStatusForStorage(
  projectorModel: string,
  exhaustCfmRaw: string,
  rules: CfmModelRule[],
): string {
  const raw = String(exhaustCfmRaw ?? "").trim();
  if (raw === "") return "YES";
  const n = Number(raw);
  if (Number.isNaN(n)) return "OK";
  const rule = findMatchingCfmRule(projectorModel, rules);
  if (!rule) return "OK";
  return evaluateCfmBand(n, rule.min, rule.max);
}

export const RECOMMENDED_CFM_MODEL_RULES: CfmModelRule[] = [
  { projectorModelPattern: "CP2220", min: 7, max: 8.5 },
  { projectorModelPattern: "CP4220", min: 7, max: 8.5 },
  { projectorModelPattern: "CP2230", min: 8.8, max: 9.5 },
  { projectorModelPattern: "CP4230", min: 8.8, max: 9.5 },
];

export function sanitizeCfmModelRules(input: unknown): CfmModelRule[] {
  if (!Array.isArray(input)) return [];
  const out: CfmModelRule[] = [];
  for (const row of input) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const pattern = String(r.projectorModelPattern ?? "").trim();
    const min = Number(r.min);
    const max = Number(r.max);
    if (!pattern || Number.isNaN(min) || Number.isNaN(max)) continue;
    if (min > max) continue;
    out.push({ projectorModelPattern: pattern, min, max });
  }
  return out;
}
