import { NextRequest, NextResponse } from "next/server";
import * as xlsx from "xlsx";
import { randomBytes } from "crypto";
import prisma from "@/lib/db";
import { auth } from "@/lib/auth";
import { parseAmcExcelRow, type ParsedAmcRow } from "@/lib/excel-amc-utils";

/** Vercel / Next.js route max wall time — large AMC imports exceed the default (~10–60s) otherwise. */
export const maxDuration = 300;

function newCertificateNumber(): string {
  const y = new Date().getFullYear();
  const suffix = randomBytes(3).toString("hex").toUpperCase();
  return `AMC-${y}-${suffix}`;
}

async function requireAdminUpload(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (
    !session?.user?.id ||
    !session?.user?.email ||
    session.user.role !== "ADMIN"
  ) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { accessLevel: true },
  });
  if (user?.accessLevel === "READ_ONLY") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session, user };
}

type ProjectorForAmc = {
  id: string;
  serialNo: string;
  modelNo: string;
  site: { siteName: string; address: string };
};

/** Resolve many serials in a few queries instead of two per row (which hangs large imports). */
async function resolveProjectorsBatch(
  serials: string[],
): Promise<Map<string, ProjectorForAmc>> {
  const unique = [...new Set(serials.map((s) => s.trim()).filter(Boolean))];
  const map = new Map<string, ProjectorForAmc>();
  if (unique.length === 0) return map;

  const exact = await prisma.projector.findMany({
    where: { serialNo: { in: unique } },
    select: {
      id: true,
      serialNo: true,
      modelNo: true,
      site: { select: { siteName: true, address: true } },
    },
  });
  const seenLower = new Set<string>();
  for (const p of exact) {
    map.set(p.serialNo.toLowerCase(), p);
    seenLower.add(p.serialNo.toLowerCase());
  }

  const needInsensitive = unique.filter((s) => !seenLower.has(s.toLowerCase()));
  if (!needInsensitive.length) return map;

  const OR_CHUNK = 40;
  for (let i = 0; i < needInsensitive.length; i += OR_CHUNK) {
    const chunk = needInsensitive.slice(i, i + OR_CHUNK);
    const batch = await prisma.projector.findMany({
      where: {
        OR: chunk.map((s) => ({
          serialNo: { equals: s, mode: "insensitive" },
        })),
      },
      select: {
        id: true,
        serialNo: true,
        modelNo: true,
        site: { select: { siteName: true, address: true } },
      },
    });
    for (const p of batch) {
      map.set(p.serialNo.toLowerCase(), p);
    }
  }
  return map;
}

function projectorForSerial(serial: string, byLower: Map<string, ProjectorForAmc>): ProjectorForAmc | null {
  const t = serial.trim();
  if (!t) return null;
  return byLower.get(t.toLowerCase()) ?? null;
}

async function fetchExistingAmcKeys(
  pairs: Array<{ projectorId: string; startDate: Date }>,
): Promise<Set<string>> {
  const keys = new Set<string>();
  const OR_CHUNK = 50;
  for (let i = 0; i < pairs.length; i += OR_CHUNK) {
    const slice = pairs.slice(i, i + OR_CHUNK);
    const found = await prisma.projectorAmc.findMany({
      where: {
        OR: slice.map(({ projectorId, startDate }) => ({
          projectorId,
          startDate,
        })),
      },
      select: { projectorId: true, startDate: true },
    });
    for (const row of found) {
      keys.add(`${row.projectorId}|${row.startDate.toISOString().slice(0, 10)}`);
    }
  }
  return keys;
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdminUpload(request);
    if ("error" in admin) return admin.error;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const modeInput = String(formData.get("mode") || "upload").toLowerCase();
    const mode: "upload" | "preflight" =
      modeInput === "preflight" ? "preflight" : "upload";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    if (
      !allowedTypes.includes(file.type) &&
      !file.name.endsWith(".xlsx") &&
      !file.name.endsWith(".xls")
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid file type. Please upload an Excel file (.xlsx or .xls)",
        },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = xlsx.read(arrayBuffer, { type: "array" });
    const sheet = workbook.Sheets["Data"];

    if (!sheet) {
      return NextResponse.json(
        {
          error:
            'Sheet "Data" not found. Add a sheet named exactly "Data" (same as service records upload).',
        },
        { status: 400 },
      );
    }

    const rows: Record<string, unknown>[] = xlsx.utils.sheet_to_json(sheet, {
      defval: null,
      raw: true,
    });

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Excel file is empty or has no data rows under the header" },
        { status: 400 },
      );
    }

    type ValidationErr = {
      row: number;
      serialNo?: string;
      errors: string[];
    };

    const validationErrors: ValidationErr[] = [];

    type PendingRow = {
      excelRow: number;
      projectorId: string;
      siteNameSnapshot: string;
      siteAddressSnapshot: string | null;
      modelNoSnapshot: string;
      serialNoSnapshot: string;
      startDate: Date;
      endDate: Date;
      clientPoNumber: string;
      invoiceNumber: string;
      certificateNumber: string | null;
    };
    const pending: PendingRow[] = [];

    const parsedOkRows: Array<{ excelRow: number; data: ParsedAmcRow }> = [];

    for (let i = 0; i < rows.length; i++) {
      const excelRow = i + 2;
      const row = rows[i]!;
      const parsed = parseAmcExcelRow(row);
      if (!parsed.ok) {
        validationErrors.push({ row: excelRow, errors: parsed.errors });
        continue;
      }
      parsedOkRows.push({ excelRow, data: parsed.data });
    }

    const bySerial = await resolveProjectorsBatch(
      parsedOkRows.map((r) => r.data.serialNo),
    );

    const seenKeys = new Set<string>();

    /** Rows that passed projector + file-level dedupe; DB duplicate check batched below. */
    const candidates: PendingRow[] = [];

    for (const { excelRow, data } of parsedOkRows) {
      const projector = projectorForSerial(data.serialNo, bySerial);
      if (!projector) {
        validationErrors.push({
          row: excelRow,
          serialNo: data.serialNo,
          errors: [`No projector found with serial "${data.serialNo}"`],
        });
        continue;
      }

      const dedupeKey = `${projector.id}|${data.startDate.toISOString().slice(0, 10)}`;
      if (seenKeys.has(dedupeKey)) {
        validationErrors.push({
          row: excelRow,
          serialNo: data.serialNo,
          errors: ["Duplicate serial + start date in this file"],
        });
        continue;
      }
      seenKeys.add(dedupeKey);

      candidates.push({
        excelRow,
        projectorId: projector.id,
        siteNameSnapshot: projector.site.siteName,
        siteAddressSnapshot: projector.site.address?.trim()
          ? projector.site.address.trim()
          : null,
        modelNoSnapshot: projector.modelNo,
        serialNoSnapshot: projector.serialNo,
        startDate: data.startDate,
        endDate: data.endDate,
        clientPoNumber: data.clientPoNumber,
        invoiceNumber: data.invoiceNumber,
        certificateNumber: data.certificateNumber,
      });
    }

    const existingDbKeys =
      candidates.length === 0
        ? new Set<string>()
        : await fetchExistingAmcKeys(
            candidates.map((c) => ({
              projectorId: c.projectorId,
              startDate: c.startDate,
            })),
          );

    for (const row of candidates) {
      const k = `${row.projectorId}|${row.startDate.toISOString().slice(0, 10)}`;
      if (existingDbKeys.has(k)) {
        validationErrors.push({
          row: row.excelRow,
          serialNo: row.serialNoSnapshot,
          errors: ["AMC with this start date already exists for this projector"],
        });
        continue;
      }
      pending.push(row);
    }

    if (mode === "preflight") {
      return NextResponse.json({
        success: true,
        mode: "preflight",
        totalRows: rows.length,
        validRows: pending.length,
        validationErrors,
      });
    }

    let created = 0;
    const rowErrors: Array<{ row: number; message: string }> = [];

    const insertOne = async (item: PendingRow) => {
      let certificateNumber =
        item.certificateNumber?.trim() || newCertificateNumber();
      let saved = false;
      for (let attempt = 0; attempt < 12 && !saved; attempt++) {
        try {
          await prisma.projectorAmc.create({
            data: {
              projectorId: item.projectorId,
              siteNameSnapshot: item.siteNameSnapshot,
              siteAddressSnapshot: item.siteAddressSnapshot,
              modelNoSnapshot: item.modelNoSnapshot,
              serialNoSnapshot: item.serialNoSnapshot,
              startDate: item.startDate,
              endDate: item.endDate,
              clientPoNumber: item.clientPoNumber,
              invoiceNumber: item.invoiceNumber,
              certificateNumber,
            },
          });
          saved = true;
          return { ok: 1 as const, errs: [] as typeof rowErrors };
        } catch (err: unknown) {
          const code =
            err && typeof err === "object" && "code" in err
              ? String((err as { code?: string }).code)
              : "";
          if (code === "P2002") {
            if (item.certificateNumber?.trim()) {
              return {
                ok: 0 as const,
                errs: [
                  {
                    row: item.excelRow,
                    message:
                      "Certificate number already used in the database; remove or change the value in the sheet.",
                  },
                ],
              };
            }
            certificateNumber = newCertificateNumber();
          } else {
            return {
              ok: 0 as const,
              errs: [
                {
                  row: item.excelRow,
                  message:
                    err instanceof Error ? err.message : "Failed to create AMC row",
                },
              ],
            };
          }
        }
      }
      return {
        ok: 0 as const,
        errs: [
          {
            row: item.excelRow,
            message: "Could not allocate a unique certificate number",
          },
        ],
      };
    };

    const CONCURRENCY = 25;
    for (let i = 0; i < pending.length; i += CONCURRENCY) {
      const slice = pending.slice(i, i + CONCURRENCY);
      const outcomes = await Promise.all(slice.map((item) => insertOne(item)));
      for (const o of outcomes) {
        created += o.ok;
        rowErrors.push(...o.errs);
      }
    }

    return NextResponse.json({
      success: true,
      mode: "upload",
      totalRows: rows.length,
      created,
      skippedOrInvalid: rows.length - pending.length,
      validationErrors,
      rowErrors,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "AMC Excel upload failed" },
      { status: 500 },
    );
  }
}
