/**
 * Maps standard ServiceRecord field keys (used in the FSE form) to their
 * semantic laser equivalents stored in LaserServiceRecord.
 *
 * Standard columns are still written to ServiceRecord for form pre-fill /
 * backward compat.  LaserServiceRecord holds the authoritative laser data.
 */
export const STANDARD_TO_LASER_FIELD_MAP: Record<string, string> = {
  // Opticals
  reflector:              "diffuser",
  reflectorNote:          "diffuserNote",
  uvFilter:               "couplingFoldMirror",
  uvFilterNote:           "couplingFoldMirrorNote",
  integratorRod:          "rotatingIntegrator",
  integratorRodNote:      "rotatingIntegratorNote",
  coldMirror:             "shortIntegrator",
  coldMirrorNote:         "shortIntegratorNote",
  foldMirror:             "couplingElbow",
  foldMirrorNote:         "couplingElbowNote",

  // Electronics
  touchPanel:             "fMainBoard",
  touchPanelNote:         "fMainBoardNote",
  evbBoard:               "hubNxBoard",
  evbBoardNote:           "hubNxBoardNote",
  ImcbBoard:              "hkbbBoard",
  ImcbBoardNote:          "hkbbBoardNote",
  pibBoard:               "dtsmBoard",
  pibBoardNote:           "dtsmBoardNote",

  // Disposable Consumables
  AirIntakeLadRad:        "filterRadFilter",
  AirIntakeLadRadNote:    "filterRadFilterNote",

  // Mechanical
  acBlowerVane:           "lePump",
  acBlowerVaneNote:       "lePumpNote",
  extractorVane:          "losPump",
  extractorVaneNote:      "losPumpNote",
  exhaustCfm:             "radiatorFan",
  exhaustCfmNote:         "radiatorFanNote",
  lightEngineFans:        "exhaustFan",
  lightEngineFansNote:    "exhaustFanNote",
  cardCageFans:           "leIntakeFan",
  cardCageFansNote:       "leIntakeFanNote",
  radiatorFanPump:        "leBlower",
  radiatorFanPumpNote:    "leBlowerNote",
  pumpConnectorHose:      "shutter",
  pumpConnectorHoseNote:  "shutterNote",

  // Laser hours (replaces lamp hours)
  lampTotalRunningHours:  "laserHours",
}

/** Reverse map: laser field name → standard ServiceRecord column */
export const LASER_TO_STANDARD_FIELD_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(STANDARD_TO_LASER_FIELD_MAP).map(([k, v]) => [v, k])
)

/**
 * Build a LaserServiceRecord data object from a workDetails payload
 * (which uses standard field keys).
 */
export function buildLaserRecordData(workDetails: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {}
  for (const [stdKey, laserKey] of Object.entries(STANDARD_TO_LASER_FIELD_MAP)) {
    const val = workDetails[stdKey]
    if (val === undefined || val === null || val === "") continue
    if (laserKey === "laserHours") {
      const n = parseInt(String(val), 10)
      if (!isNaN(n)) result[laserKey] = n
    } else {
      result[laserKey] = String(val)
    }
  }
  return result
}

/**
 * Read a laser field value from LaserServiceRecord, falling back to
 * the standard column (for records submitted before this table existed).
 */
export function readLaserField(
  laserRecord: Record<string, any> | null | undefined,
  laserKey: string,
  workDetails: Record<string, any>,
): string {
  if (laserRecord && laserRecord[laserKey] != null) {
    return String(laserRecord[laserKey])
  }
  const stdKey = LASER_TO_STANDARD_FIELD_MAP[laserKey]
  if (stdKey && workDetails[stdKey] != null) {
    return String(workDetails[stdKey])
  }
  return ""
}
