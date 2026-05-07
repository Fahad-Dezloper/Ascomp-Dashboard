import { addYears, subDays, format, isValid, parseISO } from "date-fns";

/** Parse YYYY-MM-DD to a stable UTC noon instant (avoids zone shift on DATE columns). */
export function parseDateOnlyInput(isoDate: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate.trim())) {
    throw new Error("Invalid date format; use YYYY-MM-DD");
  }
  return new Date(`${isoDate.trim()}T12:00:00.000Z`);
}

/** Inclusive one-year AMC: end = (start + 1 year) − 1 day */
export function computeDefaultInclusiveEndDate(start: Date): Date {
  return subDays(addYears(start, 1), 1);
}

export function formatAmcDateForDisplay(d: Date): string {
  if (!isValid(d)) return "";
  return format(d, "dd-MM-yyyy");
}

export function formatAmcDateForInput(d: Date): string {
  if (!isValid(d)) return "";
  return format(d, "yyyy-MM-dd");
}

export function safeParseDateOnlyInput(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  try {
    return parseDateOnlyInput(value);
  } catch {
    return null;
  }
}

export function parseIsoDateOrInput(value: string): Date | null {
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return parseDateOnlyInput(value);
    const d = parseISO(value);
    return isValid(d) ? d : null;
  } catch {
    return null;
  }
}
