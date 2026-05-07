/** Normalize for case-insensitive exact match (trim + lowercase). */
export function normalizeProjectorModelKey(model: string): string {
  return model.trim().toLowerCase()
}

/** Deduplicate by normalized key; keep first spelling; drop empty / non-strings. */
export function sanitizeLaserProjectorModels(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of raw) {
    if (typeof item !== "string") continue
    const trimmed = item.trim()
    if (!trimmed) continue
    const key = normalizeProjectorModelKey(trimmed)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(trimmed)
  }
  return out
}

/** True if `projectorModel` equals any list entry (trim + case-insensitive). */
export function isLaserProjectorModel(
  projectorModel: string | null | undefined,
  laserModels: string[],
): boolean {
  const t = projectorModel?.trim()
  if (!t) return false
  const needle = normalizeProjectorModelKey(t)
  return laserModels.some((m) => normalizeProjectorModelKey(m) === needle)
}
