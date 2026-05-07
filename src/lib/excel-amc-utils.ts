/**
 * AMC bulk import from Excel — same conventions as service-record upload ("Data" sheet).
 */

import {
  computeDefaultInclusiveEndDate,
  formatAmcDateForInput,
  parseDateOnlyInput,
} from "@/lib/amc-dates";
import { excelValueToDate, isEmpty, toStringOrNull } from "@/lib/excel-service-record-utils";

export const EXCEL_AMC_TEMPLATE_HEADERS = [
  "Serial No.",
  "Start Date",
  "End Date",
  "Client PO",
  "Invoice No.",
  "Certificate No. (optional)",
] as const;

function normKey(k: string): string {
  return String(k)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Find first key in row that matches any alias (normalized). */
export function pickCell(
  row: Record<string, unknown>,
  aliases: string[],
): unknown {
  const want = new Set(aliases.map((a) => normKey(a)));
  for (const key of Object.keys(row)) {
    if (want.has(normKey(key))) return row[key];
  }
  return undefined;
}

export type ParsedAmcRow = {
  serialNo: string;
  startDate: Date;
  endDate: Date;
  clientPoNumber: string;
  invoiceNumber: string;
  certificateNumber: string | null;
};

export function parseAmcExcelRow(
  row: Record<string, unknown>,
): { ok: true; data: ParsedAmcRow } | { ok: false; errors: string[] } {
  const errors: string[] = [];

  const serialRaw = pickCell(row, [
    "Serial No.",
    "Serial No",
    "Serial Number",
    "serial no",
    "serial no.",
  ]);
  const serialNo = toStringOrNull(serialRaw);
  if (!serialNo) errors.push("Serial No. is required");

  const startRaw = pickCell(row, ["Start Date", "start date", "Start"]);
  const startDate = excelValueToDate(startRaw);
  if (!startDate) errors.push("Start Date is missing or invalid");

  const endRaw = pickCell(row, ["End Date", "end date", "End"]);
  let endDate: Date | null = null;
  if (!isEmpty(endRaw)) {
    endDate = excelValueToDate(endRaw);
    if (!endDate) errors.push("End Date is invalid");
  }

  const clientPoRaw = pickCell(row, ["Client PO", "PO", "client po"]);
  let clientPoNumber = toStringOrNull(clientPoRaw) ?? "";
  if (!clientPoNumber) clientPoNumber = "-";

  const invRaw = pickCell(row, [
    "Invoice No.",
    "Invoice No",
    "Invoice",
    "invoice no.",
  ]);
  let invoiceNumber = toStringOrNull(invRaw) ?? "";
  if (!invoiceNumber) invoiceNumber = "-";

  const certRaw = pickCell(row, [
    "Certificate No. (optional)",
    "Certificate No",
    "Certificate",
    "certificate no",
  ]);
  const certTrim = toStringOrNull(certRaw);
  const certificateNumber =
    certTrim && certTrim.length > 0 ? certTrim : null;

  if (errors.length || !serialNo || !startDate) {
    return { ok: false, errors };
  }

  let finalEnd: Date;
  if (endDate) {
    finalEnd = endDate;
  } else {
    try {
      const startOnly = parseDateOnlyInput(formatAmcDateForInput(startDate));
      finalEnd = computeDefaultInclusiveEndDate(startOnly);
    } catch {
      return { ok: false, errors: [...errors, "Could not compute default end date"] };
    }
  }

  let startNorm: Date;
  try {
    startNorm = parseDateOnlyInput(formatAmcDateForInput(startDate));
  } catch {
    return { ok: false, errors: [...errors, "Start Date could not be normalized"] };
  }

  let endNorm: Date;
  try {
    endNorm = parseDateOnlyInput(formatAmcDateForInput(finalEnd));
  } catch {
    return { ok: false, errors: [...errors, "End Date could not be normalized"] };
  }

  if (endNorm.getTime() < startNorm.getTime()) {
    errors.push("End Date must be on or after Start Date");
  }

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    data: {
      serialNo,
      startDate: startNorm,
      endDate: endNorm,
      clientPoNumber,
      invoiceNumber,
      certificateNumber,
    },
  };
}
