import type { Job } from "bullmq";
import prisma from "@/lib/db";
import {
  excelValueToDate,
  mapExcelRowToServiceRecordData,
  normalizeEmail,
} from "@/lib/excel-service-record-utils";
import type {
  UploadJobData,
  UploadJobProgress,
  UploadJobResult,
  UploadValidationError,
} from "@/lib/queues/upload-queue";

const generateObjectId = () =>
  [...Array(24)]
    .map(() => Math.floor(Math.random() * 16).toString(16))
    .join("");

const getCellValue = (row: Record<string, any>, keys: string[]) => {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      return row[key];
    }
  }
  return null;
};

const toTrimmedStringOrNull = (value: any): string | null => {
  if (value === null || value === undefined) return null;
  const asString = String(value).trim();
  return asString ? asString : null;
};

const extractCoreFields = (row: Record<string, any>) => {
  const serialNo = toTrimmedStringOrNull(
    getCellValue(row, ["Serial No.", "Serial No", "Serial Number", "Serial #"]),
  );
  const engineerEmailNorm = normalizeEmail(
    getCellValue(row, ["Engineer Visited", "Engineer Email", "Engineer"]),
  );
  const serviceNumber = toTrimmedStringOrNull(
    getCellValue(row, [
      "Service Visit",
      "Service Number",
      "Service #",
      "Service No",
      "Service No.",
    ]),
  );
  const dateRaw = getCellValue(row, ["Date"]);
  const date = excelValueToDate(dateRaw);

  const isEmptyRow = !serialNo && !engineerEmailNorm && !serviceNumber && !date;

  return {
    serialNo,
    engineerEmailNorm,
    serviceNumber,
    date,
    dateRaw,
    isEmptyRow,
  };
};

export async function processUploadJob(
  data: UploadJobData,
  job: Job<UploadJobData, UploadJobResult>,
): Promise<UploadJobResult> {
  return processUploadRows(data, async (progress) => {
    await job.updateProgress(progress as any);
  }, async (lastCompletedChunk) => {
    await job.updateData({
      ...job.data,
      checkpoint: { lastCompletedChunk },
    });
  });
}


async function processUploadRows(
  data: UploadJobData,
  onProgress?: (progress: UploadJobProgress) => Promise<void>,
  onCheckpoint?: (lastCompletedChunk: number) => Promise<void>,
): Promise<UploadJobResult> {
  const startedAt = Date.now();
  const rows = data.rows || [];
  const mode = data.mode || "upload";
  const chunkSize = Math.max(50, data.chunkSize || 500);

  const validationErrors: UploadValidationError[] = [];
  let emptyRowsSkipped = 0;
  if (onProgress) {
    await onProgress({
      percentage: 3,
      stage: "loading-references",
      message: "Loading users and projectors",
    });
  }

  const allUsers = await prisma.user.findMany({
    select: { id: true, email: true },
  });
  const allProjectors = await prisma.projector.findMany({
    select: { id: true, serialNo: true, siteId: true },
  });

  const userMap = new Map<string, { id: string; email: string | null }>();
  for (const user of allUsers) {
    if (user.email) {
      userMap.set(user.email.toLowerCase(), {
        id: user.id,
        email: user.email,
      });
    }
  }

  const projectorMap = new Map<string, { id: string; siteId: string }>();
  for (const projector of allProjectors) {
    if (projector.serialNo) {
      projectorMap.set(projector.serialNo.trim().toLowerCase(), {
        id: projector.id,
        siteId: projector.siteId,
      });
    }
  }

  type ValidRow = {
    rowNo: number;
    row: Record<string, any>;
    serialNo: string;
    serviceNumber: string;
    date: Date;
    userId: string;
    projectorId: string;
    siteId: string;
  };
  const validRows: ValidRow[] = [];
  console.log(`🔍 Total rows in Excel: ${rows.length}`);

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index]!;
    const rowNo = index + 2;
    const errors: string[] = [];

    const { serialNo, engineerEmailNorm, serviceNumber, dateRaw, date, isEmptyRow } =
      extractCoreFields(row);

    if (isEmptyRow) {
      emptyRowsSkipped++;
      continue;
    }

    if (!serialNo) {
      errors.push("Missing Serial No.");
    }
    if (!engineerEmailNorm) {
      errors.push("Missing Engineer Visited (email)");
    }
    if (!serviceNumber) {
      errors.push("Missing Service Visit / Service Number");
    }
    if (!date) {
      errors.push(`Invalid or missing Date (raw: ${JSON.stringify(dateRaw)})`);
    }

    const projectorInfo = serialNo ? projectorMap.get(serialNo.toLowerCase()) : null;
    if (serialNo && !projectorInfo) {
      errors.push(`Projector with Serial No. "${serialNo}" not found in database`);
    }

    const userInfo = engineerEmailNorm
      ? userMap.get(engineerEmailNorm.toLowerCase())
      : null;
    if (engineerEmailNorm && !userInfo) {
      errors.push(`User with email "${engineerEmailNorm}" not found in database`);
    }

    if (errors.length > 0) {
      validationErrors.push({
        row: rowNo,
        serialNo: serialNo || undefined,
        email: engineerEmailNorm || undefined,
        serviceNumber: serviceNumber || undefined,
        errors,
      });
      continue;
    }

    validRows.push({
      rowNo,
      row,
      serialNo: serialNo!,
      serviceNumber: serviceNumber!,
      date: date!,
      userId: userInfo!.id,
      projectorId: projectorInfo!.id,
      siteId: projectorInfo!.siteId,
    });
  }

  console.log(`✅ Valid rows found: ${validRows.length}/${rows.length}`);

  if (onProgress) {
    await onProgress({
      percentage: 35,
      stage: "validating",
      message: "Validation complete",
    });
  }

  const seenPairs = new Set<string>();
  let duplicateRowsInFile = 0;
  let skippedExistingRecords = 0;
  let createdRecords = 0;
  let updatedRecords = 0;

  if (mode === "upload") {
    const totalChunks = Math.max(1, Math.ceil(validRows.length / chunkSize));
    const resumeChunk = data.checkpoint?.lastCompletedChunk ?? -1;
    const firstChunkToProcess = resumeChunk + 1;

    for (let chunkIndex = firstChunkToProcess; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * chunkSize;
      const end = Math.min(validRows.length, start + chunkSize);
      const chunk = validRows.slice(start, end);

      if (onProgress) {
        const percentage = 35 + Math.round(((chunkIndex + 1) / totalChunks) * 60);
        await onProgress({
          percentage,
          stage: "processing-chunk",
          message: `Processing chunk ${chunkIndex + 1}/${totalChunks}`,
          chunkIndex: chunkIndex + 1,
          totalChunks,
        });
      }

      for (const rowInfo of chunk) {
        const pairKey = `${rowInfo.projectorId}::${rowInfo.serviceNumber.toLowerCase()}`;

        if (seenPairs.has(pairKey)) {
          duplicateRowsInFile++;
          skippedExistingRecords++;
          continue;
        }
        seenPairs.add(pairKey);

        const existingRecord = await prisma.serviceRecord.findFirst({
          where: {
            projectorId: rowInfo.projectorId,
            serviceNumber: rowInfo.serviceNumber,
          },
        });

        const mappedData = mapExcelRowToServiceRecordData(rowInfo.row);
        const {
          reportGenerated: _ignoreReportGenerated,
          images: _ignoreImages,
          brokenImages: _ignoreBrokenImages,
          serviceNumber: _ignoreServiceNumber,
          date: _ignoreDate,
          ...safeMappedData
        } = mappedData as Record<string, any>;

        const fullData = {
          ...safeMappedData,
          serviceNumber: rowInfo.serviceNumber,
          date: rowInfo.date,
        };

        if (existingRecord) {
          const { changes, hasChanges } = compareRecords(existingRecord, fullData);

          if (!hasChanges) {
            skippedExistingRecords++;
            continue;
          }

          try {
            await prisma.serviceRecord.update({
              where: { id: existingRecord.id },
              data: changes,
            });
            updatedRecords++;
            console.log(`🔄 Updated ServiceRecord ${updatedRecords}: ${rowInfo.serviceNumber} for ${rowInfo.serialNo}`);
          } catch (error) {
            validationErrors.push({
              row: rowInfo.rowNo,
              serialNo: rowInfo.serialNo,
              serviceNumber: rowInfo.serviceNumber,
              errors: [
                `Failed to update record: ${error instanceof Error ? error.message : String(error)}`,
              ],
            });
          }
          continue;
        }

        try {
          await prisma.serviceRecord.create({
            data: {
              ...fullData,
              id: generateObjectId(),
              user: { connect: { id: rowInfo.userId } },
              assignedTo: { connect: { id: rowInfo.userId } },
              projector: { connect: { id: rowInfo.projectorId } },
              site: { connect: { id: rowInfo.siteId } },
            },
          });
          createdRecords++;
          console.log(`✨ Created ServiceRecord ${createdRecords}/${validRows.length}: ${rowInfo.serviceNumber} for ${rowInfo.serialNo}`);
        } catch (error) {
          validationErrors.push({
            row: rowInfo.rowNo,
            serialNo: rowInfo.serialNo,
            serviceNumber: rowInfo.serviceNumber,
            errors: [
              `Failed to create record: ${error instanceof Error ? error.message : String(error)}`,
            ],
          });
        }
      }

      if (onCheckpoint) {
        await onCheckpoint(chunkIndex);
      }
    }
  } else {
    const totalRows = validRows.length;
    for (let i = 0; i < totalRows; i++) {
      const rowInfo = validRows[i]!;
      
      // Progress for preflight (every 100 rows or last row)
      if (onProgress && (i % 100 === 0 || i === totalRows - 1)) {
        const percentage = 35 + Math.round(((i + 1) / totalRows) * 60);
        await onProgress({
          percentage,
          stage: "validating",
          message: `Analyzing row ${i + 1}/${totalRows}`,
        });
      }

      const pairKey = `${rowInfo.projectorId}::${rowInfo.serviceNumber.toLowerCase()}`;
      if (seenPairs.has(pairKey)) {
        duplicateRowsInFile++;
        skippedExistingRecords++;
        continue;
      }
      seenPairs.add(pairKey);

      const existingRecord = await prisma.serviceRecord.findFirst({
        where: {
          projectorId: rowInfo.projectorId,
          serviceNumber: rowInfo.serviceNumber,
        },
      });

      if (existingRecord) {
        const mappedData = mapExcelRowToServiceRecordData(rowInfo.row);
        const {
          reportGenerated: _ignoreReportGenerated,
          images: _ignoreImages,
          brokenImages: _ignoreBrokenImages,
          serviceNumber: _ignoreServiceNumber,
          date: _ignoreDate,
          ...safeMappedData
        } = mappedData as Record<string, any>;

        const fullData = {
          ...safeMappedData,
          serviceNumber: rowInfo.serviceNumber,
          date: rowInfo.date,
        };
        
        const { hasChanges } = compareRecords(existingRecord, fullData);
        if (hasChanges) {
          updatedRecords++;
        } else {
          skippedExistingRecords++;
        }
      } else {
        createdRecords++;
      }
    }
  }

  if (onProgress) {
    await onProgress({
      percentage: 100,
      stage: mode === "preflight" ? "preflight-complete" : "completed",
      message: mode === "preflight" ? "Preflight complete" : "Upload complete",
    });
  }

  const result: UploadJobResult = {
    fileName: data.fileName,
    fingerprint: data.fingerprint,
    mode,
    totalRowsInSheet: rows.length,
    processedRows: validRows.length,
    emptyRowsSkipped,
    createdRecords,
    updatedRecords,
    skippedExistingRecords,
    duplicateRowsInFile,
    invalidRows: validationErrors.length,
    validationErrors,
    durationMs: Date.now() - startedAt,
  };
  return result;
}

function compareRecords(existing: any, newData: any) {
  const changes: Record<string, any> = {};
  let hasChanges = false;

  for (const [key, newValue] of Object.entries(newData)) {
    const oldValue = existing[key];
    
    // Skip internal fields and non-database fields
    if (key === 'reportGenerated' || key === 'images' || key === 'brokenImages') continue;

    if (newValue instanceof Date && oldValue instanceof Date) {
      if (newValue.getTime() !== oldValue.getTime()) {
        changes[key] = newValue;
        hasChanges = true;
      }
    } else if (newValue !== oldValue) {
      const isOldEmpty = oldValue === null || oldValue === undefined || oldValue === "";
      const isNewEmpty = newValue === null || newValue === undefined || newValue === "";
      
      if (!(isOldEmpty && isNewEmpty)) {
        changes[key] = newValue;
        hasChanges = true;
      }
    }
  }

  return { changes, hasChanges };
}
