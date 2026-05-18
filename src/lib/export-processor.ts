import prisma from "./db";
import {
  type ExportJobData,
  type ExportJobResult,
} from "./queues/export-queue";
import { put } from "@vercel/blob";
import ExcelJS from "exceljs";
import {
  generateMaintenanceReport,
  type MaintenanceReportData,
  convertServiceVisitToText,
} from "@/components/PDFGenerator";
import { sendEmail } from "./email";
import { getLaserProjectorModels } from "./get-laser-models";
import { isLaserProjectorModel } from "./laser-projector-models";
import { readLaserField } from "./laser-service-record";

const CHUNK_SIZE = 50;

function mapStatus(value?: string | null, note?: string | null) {
  const valStr = value ? String(value) : "";
  const separatorIdx = valStr.indexOf(" - ");
  // If value contains " - " (sub-option format) and no separate note, parse from value
  if (separatorIdx !== -1 && !note) {
    return {
      yesNo: valStr.substring(0, separatorIdx).trim(),
      status: valStr.substring(separatorIdx + 3).trim(),
    };
  }
  return {
    status: note ? String(note) : "",
    yesNo: (valStr.split("(")[0] || "").trim(),
  };
}

function safe(val: any) {
  return val ? String(val) : "";
}

function buildPdfDataFromService(fullService: any, laserModels: string[] = []): MaintenanceReportData {
  const wd = fullService.workDetails || fullService; // workDetails or flat record
  const isLaser = isLaserProjectorModel(fullService.projector?.modelNo || fullService.projector?.model, laserModels);
  const laserRec = fullService.laserServiceRecord ?? null;

  const lf = (laserKey: string): string =>
    isLaser ? readLaserField(laserRec, laserKey, wd) : "";

  return {
    reportType: isLaser ? "laser" : "standard",
    cinemaName: fullService.cinemaName || fullService.site?.siteName || "",
    date: fullService.date
      ? new Date(fullService.date).toLocaleDateString()
      : "",
    address: fullService.address || fullService.site?.address || "",
    contactDetails:
      fullService.contactDetails || fullService.site?.contactDetails || "",
    location: fullService.location || "",
    screenNo: fullService.screenNumber || fullService.site?.screenNo || "",
    serviceVisit: fullService.assignedTo?.name
      ? `${fullService.assignedTo.name} - ${convertServiceVisitToText(fullService.serviceNumber)}`
      : fullService.serviceNumber?.toString() || "",
    projectorModel: fullService.projector?.modelNo || "",
    serialNo: fullService.projector?.serialNo || "",
    runningHours: fullService.projectorRunningHours?.toString() || "",
    projectorEnvironment:
      wd.projectorPlacementEnvironment || "",
    startTime: wd.startTime || fullService.startTime,
    endTime: wd.endTime || fullService.endTime,
    opticals: isLaser ? {
      reflector: mapStatus(lf("diffuser"), lf("diffuserNote")),
      uvFilter: mapStatus(lf("couplingFoldMirror"), lf("couplingFoldMirrorNote")),
      integratorRod: mapStatus(lf("rotatingIntegrator"), lf("rotatingIntegratorNote")),
      coldMirror: mapStatus(lf("shortIntegrator"), lf("shortIntegratorNote")),
      foldMirror: mapStatus(lf("couplingElbow"), lf("couplingElbowNote")),
    } : {
      reflector: mapStatus(wd.reflector, wd.reflectorNote),
      uvFilter: mapStatus(wd.uvFilter, wd.uvFilterNote),
      integratorRod: mapStatus(wd.integratorRod, wd.integratorRodNote),
      coldMirror: mapStatus(wd.coldMirror, wd.coldMirrorNote),
      foldMirror: mapStatus(wd.foldMirror, wd.foldMirrorNote),
    },
    electronics: isLaser ? {
      touchPanel: mapStatus(lf("fMainBoard"), lf("fMainBoardNote")),
      evbBoard: mapStatus(lf("hubNxBoard"), lf("hubNxBoardNote")),
      ImcbBoard: mapStatus(lf("hkbbBoard"), lf("hkbbBoardNote")),
      pibBoard: mapStatus(lf("dtsmBoard"), lf("dtsmBoardNote")),
      IcpBoard: mapStatus("", ""),
      imbSBoard: mapStatus("", ""),
    } : {
      touchPanel: mapStatus(wd.touchPanel, wd.touchPanelNote),
      evbBoard: mapStatus(wd.evbBoard, wd.evbBoardNote),
      ImcbBoard: mapStatus(wd.ImcbBoard, wd.ImcbBoardNote),
      pibBoard: mapStatus(wd.pibBoard, wd.pibBoardNote),
      IcpBoard: mapStatus(wd.IcpBoard, wd.IcpBoardNote),
      imbSBoard: mapStatus(wd.imbSBoard, wd.imbSBoardNote),
    },
    serialVerified: mapStatus(wd.serialNumberVerified, wd.serialNumberVerifiedNote),
    AirIntakeLadRad: isLaser
      ? mapStatus(lf("filterRadFilter"), lf("filterRadFilterNote"))
      : mapStatus(wd.AirIntakeLadRad, wd.AirIntakeLadRadNote),
    coolant: mapStatus(wd.coolantLevelColor, wd.coolantLevelColorNote),
    lightEngineTest: {
      white: mapStatus(wd.lightEngineWhite, wd.lightEngineWhiteNote),
      red: mapStatus(wd.lightEngineRed, wd.lightEngineRedNote),
      green: mapStatus(wd.lightEngineGreen, wd.lightEngineGreenNote),
      blue: mapStatus(wd.lightEngineBlue, wd.lightEngineBlueNote),
      black: mapStatus(wd.lightEngineBlack, wd.lightEngineBlackNote),
    },
    mechanical: isLaser ? {
      acBlower: mapStatus(lf("lePump"), lf("lePumpNote")),
      extractor: mapStatus(lf("losPump"), lf("losPumpNote")),
      exhaustCFM: mapStatus(lf("radiatorFan"), lf("radiatorFanNote")),
      lightEngine4Fans: mapStatus(lf("exhaustFan"), lf("exhaustFanNote")),
      cardCageFans: mapStatus(lf("leIntakeFan"), lf("leIntakeFanNote")),
      radiatorFan: mapStatus(lf("leBlower"), lf("leBlowerNote")),
      connectorHose: mapStatus(lf("shutter"), lf("shutterNote")),
      securityLock: mapStatus("", ""),
    } : {
      acBlower: mapStatus(wd.acBlowerVane, wd.acBlowerVaneNote),
      extractor: mapStatus(wd.extractorVane, wd.extractorVaneNote),
      exhaustCFM: mapStatus(wd.exhaustCfm, wd.exhaustCfmNote),
      lightEngine4Fans: mapStatus(wd.lightEngineFans, wd.lightEngineFansNote),
      cardCageFans: mapStatus(wd.cardCageFans, wd.cardCageFansNote),
      radiatorFan: mapStatus(wd.radiatorFanPump, wd.radiatorFanPumpNote),
      connectorHose: mapStatus(wd.pumpConnectorHose, wd.pumpConnectorHoseNote),
      securityLock: mapStatus(wd.securityLampHouseLock, wd.securityLampHouseLockNote),
    },
    lampLOC: isLaser ? mapStatus("", "") : mapStatus(wd.lampLocMechanism, wd.lampLocMechanismNote),
    lampMake: wd.lampMakeModel || "",
    lampHours: isLaser
      ? (lf("laserHours") || wd.lampTotalRunningHours?.toString() || "")
      : (wd.lampTotalRunningHours?.toString() || ""),
    currentLampHours: wd.lampCurrentRunningHours?.toString() || "",
    voltageParams: {
      pvn: wd.pvVsN || "",
      pve: wd.pvVsE || "",
      nve: wd.nvVsE || "",
    },
    flBefore: wd.flLeft?.toString() || "",
    flAfter: wd.flRight?.toString() || "",
    contentPlayer: wd.contentPlayerModel || "",
    acStatus: wd.acStatus || "",
    leStatus: {
      status: safe(wd.leStatus),
      remarks: safe(wd.leStatusNote),
    },
    remarks: fullService.remarks || "",
    leSerialNo: wd.lightEngineSerialNumber || "",
    mcgdData: {
      white2K: {
        fl: wd.white2Kfl?.toString() || "",
        x: wd.white2Kx?.toString() || "",
        y: wd.white2Ky?.toString() || "",
      },
      white4K: {
        fl: wd.white4Kfl?.toString() || "",
        x: wd.white4Kx?.toString() || "",
        y: wd.white4Ky?.toString() || "",
      },
      red2K: {
        fl: wd.red2Kfl?.toString() || "",
        x: wd.red2Kx?.toString() || "",
        y: wd.red2Ky?.toString() || "",
      },
      red4K: {
        fl: wd.red4Kfl?.toString() || "",
        x: wd.red4Kx?.toString() || "",
        y: wd.red4Ky?.toString() || "",
      },
      green2K: {
        fl: wd.green2Kfl?.toString() || "",
        x: wd.green2Kx?.toString() || "",
        y: wd.green2Ky?.toString() || "",
      },
      green4K: {
        fl: wd.green4Kfl?.toString() || "",
        x: wd.green4Kx?.toString() || "",
        y: wd.green4Ky?.toString() || "",
      },
      blue2K: {
        fl: wd.blue2Kfl?.toString() || "",
        x: wd.blue2Kx?.toString() || "",
        y: wd.blue2Ky?.toString() || "",
      },
      blue4K: {
        fl: wd.blue4Kfl?.toString() || "",
        x: wd.blue4Kx?.toString() || "",
        y: wd.blue4Ky?.toString() || "",
      },
    },
    cieXyz2K: {
      x: wd.BW_Step_10_2Kx?.toString() || "",
      y: wd.BW_Step_10_2Ky?.toString() || "",
      fl: wd.BW_Step_10_2Kfl?.toString() || "",
    },
    cieXyz4K: {
      x: wd.BW_Step_10_4Kx?.toString() || "",
      y: wd.BW_Step_10_4Ky?.toString() || "",
      fl: wd.BW_Step_10_4Kfl?.toString() || "",
    },
    softwareVersion: wd.softwareVersion || "",
    screenInfo: {
      scope: {
        height: wd.screenHeight?.toString() || "",
        width: wd.screenWidth?.toString() || "",
        gain: wd.screenGain?.toString() || "",
      },
      flat: {
        height: wd.flatHeight?.toString() || "",
        width: wd.flatWidth?.toString() || "",
        gain: wd.screenGain?.toString() || "",
      },
      make: wd.screenMake || "",
    },
    throwDistance: wd.throwDistance?.toString() || "",
    imageEvaluation: {
      focusBoresite: mapStatus(wd.focusBoresight, wd.focusBoresightNote),
      integratorPosition: mapStatus(wd.integratorPosition, wd.integratorPositionNote),
      spotOnScreen: mapStatus(wd.spotsOnScreen, wd.spotsOnScreenNote),
      screenCropping: mapStatus(wd.screenCroppingOk ?? wd.screenCropping, wd.screenCroppingNote),
      convergence: mapStatus(wd.convergenceOk ?? wd.convergence, wd.convergenceNote),
      channelsChecked: mapStatus(wd.channelsCheckedOk ?? wd.channelsChecked, wd.channelsCheckedNote),
      pixelDefects: mapStatus(wd.pixelDefects, wd.pixelDefectsNote),
      imageVibration: mapStatus(wd.imageVibration, wd.imageVibrationNote),
      liteLOC: mapStatus(wd.liteloc, wd.litelocNote),
    },
    airPollution: {
      airPollutionLevel: wd.airPollutionLevel || "",
      hcho: wd.hcho?.toString() || "",
      tvoc: wd.tvoc?.toString() || "",
      pm10: wd.pm10?.toString() || "",
      pm25: wd.pm2_5?.toString() || "",
      pm100: wd.pm1?.toString() || "",
      temperature: wd.temperature?.toString() || "",
      humidity: wd.humidity?.toString() || "",
    },
    recommendedParts: Array.isArray(wd.recommendedParts)
      ? wd.recommendedParts.map((part: any) => ({
          name: String(part.name ?? part.description ?? ""),
          partNumber: String(part.partNumber ?? part.part_number ?? ""),
        }))
      : [],
    issueNotes: [],
    detectedIssues: [],
    reportGenerated: true,
    reportUrl: "",
    engineerSignatureUrl:
      fullService.signatures?.engineer ||
      (fullService.signatures as any)?.engineerSignatureUrl ||
      "",
    siteSignatureUrl:
      fullService.signatures?.site ||
      (fullService.signatures as any)?.siteSignatureUrl ||
      "",
    imagesLink: (() => {
      if (wd.photosDriveLink || fullService.photosDriveLink) {
        return wd.photosDriveLink || fullService.photosDriveLink;
      }
      const hasImages =
        (Array.isArray(fullService.images) && fullService.images.length > 0) ||
        (Array.isArray(fullService.afterImages) &&
          fullService.afterImages.length > 0) ||
        (Array.isArray(fullService.brokenImages) &&
          fullService.brokenImages.length > 0);
      if (hasImages) {
        const baseUrl = process.env.CORS_ORIGIN || "";
        const imagesPath = `/share/service-images/${fullService.id}`;
        return baseUrl ? `${baseUrl}${imagesPath}` : imagesPath;
      }
      return undefined;
    })(),
  };
}

async function generateAndUploadPdf(
  service: any,
  laserModels: string[] = [],
): Promise<{ url: string; buffer: Buffer }> {
  const pdfData = buildPdfDataFromService(service, laserModels);
  const pdfBytes = await generateMaintenanceReport(pdfData);
  const pdfBuffer = Buffer.from(pdfBytes);

  const fileName = `exports/pdfs/${service.id}-${Date.now()}.pdf`;
  const blob = await put(fileName, pdfBuffer, {
    access: "public",
    contentType: "application/pdf",
  });

  return { url: blob.url, buffer: pdfBuffer };
}

async function fetchFilteredRecords(jobData: ExportJobData): Promise<any[]> {
  let where: any = {};

  // Apply report type filter (laser only / standard only)
  const reportType = jobData.filters.reportType ?? "all";
  if (reportType === "laser") {
    where.laserServiceRecord = { isNot: null };
  } else if (reportType === "standard") {
    where.laserServiceRecord = { is: null };
  }

  if (jobData.filters.type === "none") {
    const records = await prisma.serviceRecord.findMany({
      where: Object.keys(where).length ? where : undefined,
      include: {
        projector: true,
        site: true,
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        laserServiceRecord: true,
      },
    });

    return records;
  }

  // Process basic filters from currentFilters (only for "current" type, "custom" type handles them separately)
  if (jobData.filters.type === "current" && jobData.filters.currentFilters) {
    const { workerFilter, startDate } = jobData.filters.currentFilters;

    if (workerFilter && workerFilter !== "all") {
      where.assignedTo = {
        name: {
          contains: workerFilter,
          mode: "insensitive",
        },
      };
    }

    if (startDate) {
      where.date = {
        gte: new Date(startDate),
      };
    }

    // Note: search filter is handled client-side in overview view, so we don't apply it here
  }

  if (
    jobData.filters.type === "custom" &&
    jobData.filters.conditions.length > 0
  ) {
    const conditions = jobData.filters.conditions.map((condition) => {
      let fieldWhere: any = {};

      if (condition.table === "projector") {
        fieldWhere.projector = {};
        if (condition.operator === "equals") {
          fieldWhere.projector[condition.field] = {
            equals: condition.value,
            mode: "insensitive",
          };
        } else if (condition.operator === "contains") {
          fieldWhere.projector[condition.field] = {
            contains: condition.value,
            mode: "insensitive",
          };
        } else if (condition.operator === "startsWith") {
          fieldWhere.projector[condition.field] = {
            startsWith: condition.value,
            mode: "insensitive",
          };
        } else if (condition.operator === "endsWith") {
          fieldWhere.projector[condition.field] = {
            endsWith: condition.value,
            mode: "insensitive",
          };
        } else if (condition.operator === "notEquals") {
          fieldWhere.projector[condition.field] = {
            not: {
              equals: condition.value,
              mode: "insensitive",
            },
          };
        } else if (condition.operator === "greaterThan") {
          fieldWhere.projector[condition.field] = {
            gt: Number(condition.value),
          };
        } else if (condition.operator === "lessThan") {
          fieldWhere.projector[condition.field] = {
            lt: Number(condition.value),
          };
        } else if (condition.operator === "between" && condition.value2) {
          fieldWhere.projector[condition.field] = {
            gte: Number(condition.value),
            lte: Number(condition.value2),
          };
        }
      } else if (condition.table === "site") {
        fieldWhere.site = {};
        if (condition.operator === "equals") {
          fieldWhere.site[condition.field] = {
            equals: condition.value,
            mode: "insensitive",
          };
        } else if (condition.operator === "contains") {
          fieldWhere.site[condition.field] = {
            contains: condition.value,
            mode: "insensitive",
          };
        } else if (condition.operator === "startsWith") {
          fieldWhere.site[condition.field] = {
            startsWith: condition.value,
            mode: "insensitive",
          };
        } else if (condition.operator === "endsWith") {
          fieldWhere.site[condition.field] = {
            endsWith: condition.value,
            mode: "insensitive",
          };
        } else if (condition.operator === "notEquals") {
          fieldWhere.site[condition.field] = {
            not: {
              equals: condition.value,
              mode: "insensitive",
            },
          };
        }
      } else if (condition.table === "serviceRecord") {
        if (condition.operator === "equals") {
          if (condition.field === "reportGenerated") {
            fieldWhere[condition.field] = condition.value === "true";
          } else {
            fieldWhere[condition.field] = condition.value;
          }
        } else if (condition.operator === "contains") {
          fieldWhere[condition.field] = {
            contains: condition.value,
            mode: "insensitive",
          };
        } else if (condition.operator === "startsWith") {
          fieldWhere[condition.field] = {
            startsWith: condition.value,
            mode: "insensitive",
          };
        } else if (condition.operator === "endsWith") {
          fieldWhere[condition.field] = {
            endsWith: condition.value,
            mode: "insensitive",
          };
        } else if (condition.operator === "between" && condition.value2) {
          if (condition.field === "date") {
            fieldWhere[condition.field] = {
              gte: new Date(condition.value),
              lte: new Date(condition.value2),
            };
          } else {
            fieldWhere[condition.field] = {
              gte: Number(condition.value),
              lte: Number(condition.value2),
            };
          }
        } else if (condition.operator === "greaterThan") {
          if (condition.field === "date") {
            fieldWhere[condition.field] = {
              gt: new Date(condition.value),
            };
          } else {
            fieldWhere[condition.field] = {
              gt: Number(condition.value),
            };
          }
        } else if (condition.operator === "lessThan") {
          if (condition.field === "date") {
            fieldWhere[condition.field] = {
              lt: new Date(condition.value),
            };
          } else {
            fieldWhere[condition.field] = {
              lt: Number(condition.value),
            };
          }
        } else if (condition.operator === "after") {
          fieldWhere[condition.field] = {
            gt: new Date(condition.value),
          };
        } else if (condition.operator === "before") {
          fieldWhere[condition.field] = {
            lt: new Date(condition.value),
          };
        } else if (condition.operator === "notEquals") {
          if (condition.field === "reportGenerated") {
            fieldWhere[condition.field] = condition.value !== "true";
          } else {
            fieldWhere[condition.field] = {
              not: condition.value,
            };
          }
        }
      }

      return fieldWhere;
    });

    // Also apply basic filters from currentFilters if they exist (for useCurrentFilter with advanced filters)
    // These should be combined with AND logic (both advanced filters AND basic filters must match)
    const basicFilterConditions: any[] = [];

    if (jobData.filters.currentFilters) {
      const { workerFilter, startDate } = jobData.filters.currentFilters;

      if (workerFilter && workerFilter !== "all") {
        basicFilterConditions.push({
          assignedTo: {
            name: {
              contains: workerFilter,
              mode: "insensitive",
            },
          },
        });
      }

      if (startDate) {
        basicFilterConditions.push({
          date: {
            gte: new Date(startDate),
          },
        });
      }
    }

    // Combine advanced filter conditions with basic filter conditions
    if (basicFilterConditions.length > 0) {
      // If we have both advanced and basic filters, combine them with AND
      // Advanced filters use their own logic (AND/OR), then AND with basic filters
      if (jobData.filters.logic === "AND") {
        where.AND = [...conditions, ...basicFilterConditions];
      } else {
        // For OR logic: (advanced1 OR advanced2) AND (basic1 AND basic2)
        where.AND = [{ OR: conditions }, ...basicFilterConditions];
      }
    } else {
      // No basic filters, just use advanced filter logic
      if (jobData.filters.logic === "AND") {
        where.AND = conditions;
      } else {
        where.OR = conditions;
      }
    }
  }

  const records = await prisma.serviceRecord.findMany({
    where,
    include: {
      projector: true,
      site: true,
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      laserServiceRecord: true,
    },
  });

  let filtered = records;

  if (jobData.filters.latestRecordsOnly) {
    const projectorMap = new Map<string, any>();
    filtered.forEach((rec) => {
      const projectorSerial = rec.projector?.serialNo || "";
      if (!projectorSerial) return;

      const existing = projectorMap.get(projectorSerial);
      if (!existing) {
        projectorMap.set(projectorSerial, rec);
      } else {
        const existingDate = existing.date || existing.createdAt;
        const currentDate = rec.date || rec.createdAt;
        if (currentDate && existingDate) {
          const existingTime = new Date(existingDate).getTime();
          const currentTime = new Date(currentDate).getTime();
          if (currentTime > existingTime) {
            projectorMap.set(projectorSerial, rec);
          }
        }
      }
    });
    filtered = Array.from(projectorMap.values());
  }

  return filtered;
}

function flattenRecord(record: any): Record<string, any> {
  const flattened: Record<string, any> = {
    id: record.id,
    serviceNumber: record.serviceNumber,
    date: record.date ? new Date(record.date) : null,
    createdAt: record.createdAt ? new Date(record.createdAt) : null,
    cinemaName: record.cinemaName || record.site?.siteName || "",
    screenNumber: record.screenNumber || "",
    location: record.location || "",
    projectorSerial: record.projector?.serialNo || "",
    projectorModel: record.projector?.modelNo || "",
    projectorState: record.projector?.state || "",
    projectorRegion: record.projector?.region || "",
    projectorPvr: record.projector?.pvr || "",
    engineerName: record.assignedTo?.name || "",
    engineerEmail: record.assignedTo?.email || "",
    address: record.address || record.site?.address || "",
    contactDetails: record.contactDetails || record.site?.contactDetails || "",
    projectorRunningHours: record.projectorRunningHours?.toString() || "",
    remarks: record.remarks || "",
    startTime: record.startTime ? new Date(record.startTime) : null,
    endTime: record.endTime ? new Date(record.endTime) : null,
    reportGenerated: record.reportGenerated?.toString() || "",
    reportUrl: record.reportUrl || "",
  };

  const workDetailFields = [
    "reflector",
    "reflectorNote",
    "uvFilter",
    "uvFilterNote",
    "integratorRod",
    "integratorRodNote",
    "coldMirror",
    "coldMirrorNote",
    "foldMirror",
    "foldMirrorNote",
    "touchPanel",
    "touchPanelNote",
    "evbBoard",
    "evbBoardNote",
    "ImcbBoard",
    "ImcbBoardNote",
    "pibBoard",
    "pibBoardNote",
    "IcpBoard",
    "IcpBoardNote",
    "imbSBoard",
    "imbSBoardNote",
    "serialNumberVerified",
    "serialNumberVerifiedNote",
    "AirIntakeLadRad",
    "AirIntakeLadRadNote",
    "coolantLevelColor",
    "coolantLevelColorNote",
    "lightEngineWhite",
    "lightEngineWhiteNote",
    "lightEngineRed",
    "lightEngineRedNote",
    "lightEngineGreen",
    "lightEngineGreenNote",
    "lightEngineBlue",
    "lightEngineBlueNote",
    "lightEngineBlack",
    "lightEngineBlackNote",
    "acBlowerVane",
    "acBlowerVaneNote",
    "extractorVane",
    "extractorVaneNote",
    "exhaustCfm",
    "exhaustCfmNote",
    "lightEngineFans",
    "lightEngineFansNote",
    "cardCageFans",
    "cardCageFansNote",
    "radiatorFanPump",
    "radiatorFanPumpNote",
    "pumpConnectorHose",
    "pumpConnectorHoseNote",
    "securityLampHouseLock",
    "securityLampHouseLockNote",
    "lampLocMechanism",
    "lampLocMechanismNote",
    "projectorPlacementEnvironment",
    "softwareVersion",
    "screenHeight",
    "screenWidth",
    "flatHeight",
    "flatWidth",
    "screenGain",
    "screenMake",
    "throwDistance",
    "lampMakeModel",
    "lampTotalRunningHours",
    "lampCurrentRunningHours",
    "pvVsN",
    "pvVsE",
    "nvVsE",
    "flLeft",
    "flRight",
    "contentPlayerModel",
    "acStatus",
    "leStatus",
    "leStatusNote",
    "white2Kx",
    "white2Ky",
    "white2Kfl",
    "white4Kx",
    "white4Ky",
    "white4Kfl",
    "red2Kx",
    "red2Ky",
    "red2Kfl",
    "red4Kx",
    "red4Ky",
    "red4Kfl",
    "green2Kx",
    "green2Ky",
    "green2Kfl",
    "green4Kx",
    "green4Ky",
    "green4Kfl",
    "blue2Kx",
    "blue2Ky",
    "blue2Kfl",
    "blue4Kx",
    "blue4Ky",
    "blue4Kfl",
    "focusBoresight",
    "focusBoresightNote",
    "integratorPosition",
    "integratorPositionNote",
    "spotsOnScreen",
    "spotsOnScreenNote",
    "screenCropping",
    "screenCroppingNote",
    "convergence",
    "convergenceNote",
    "channelsChecked",
    "channelsCheckedNote",
    "pixelDefects",
    "pixelDefectsNote",
    "imageVibration",
    "imageVibrationNote",
    "liteloc",
    "litelocNote",
    "hcho",
    "tvoc",
    "pm1",
    "pm2_5",
    "pm10",
    "temperature",
    "humidity",
    "airPollutionLevel",
    "lightEngineSerialNumber",
    "BW_Step_10_2Kx",
    "BW_Step_10_2Ky",
    "BW_Step_10_2Kfl",
    "BW_Step_10_4Kx",
    "BW_Step_10_4Ky",
    "BW_Step_10_4Kfl",
    "logs",
  ];

  workDetailFields.forEach((field) => {
    const value = record[field];
    if (value !== null && value !== undefined) {
      if (typeof value === "number" || typeof value === "boolean") {
        flattened[field] = String(value);
      } else if (value instanceof Date) {
        flattened[field] = value;
      } else {
        flattened[field] = String(value);
      }
    }
  });

  if (record.recommendedParts && Array.isArray(record.recommendedParts)) {
    for (let i = 0; i < 6; i++) {
      const p = record.recommendedParts[i];
      if (p && (p.name || p.description || p.partNumber || p.part_number)) {
        flattened[`Recommended Part ${i + 1}`] = String(p.name ?? p.description ?? "");
        flattened[`Recommended Part Number ${i + 1}`] = String(p.partNumber ?? p.part_number ?? "");
      } else {
        flattened[`Recommended Part ${i + 1}`] = "";
        flattened[`Recommended Part Number ${i + 1}`] = "";
      }
    }
  }

  if (record.images && Array.isArray(record.images)) {
    flattened.images = record.images.join(", ");
  }

  if (record.afterImages && Array.isArray(record.afterImages)) {
    flattened.afterImages = record.afterImages.join(", ");
  }

  if (record.brokenImages && Array.isArray(record.brokenImages)) {
    flattened.brokenImages = record.brokenImages.join(", ");
  }

  return flattened;
}

// Column priority order matching overview-view.tsx table order
const COLUMN_PRIORITY = [
  "projectorState",
  "projectorRegion",
  "projectorPvr",
  "date",
  "serviceNumber",
  "siteName",
  "siteCode",
  "engineerVisited",
  "siteAddress",
  "siteContactDetails",
  "projectorModel",
  "projectorSerial",
  "projectorRunningHours",
  "cinemaName",
  "address",
  "location",
  "screenNumber",
  "contactDetails",
  "remarks",
  "acBlowerVane",
  "acStatus",
  "afterImages",
  "AirIntakeLadRad",
  "airPollutionLevel",
  "blue2Kfl",
  "blue2Kx",
  "blue2Ky",
  "blue4Kfl",
  "blue4Kx",
  "blue4Ky",
  "brokenImages",
  "BW_Step_10_2Kfl",
  "BW_Step_10_2Kx",
  "BW_Step_10_2Ky",
  "BW_Step_10_4Kfl",
  "BW_Step_10_4Kx",
  "BW_Step_10_4Ky",
  "cardCageFans",
  "channelsChecked",
  "channelsCheckedNote",
  "coldMirror",
  "contentPlayerModel",
  "convergence",
  "convergenceNote",
  "coolantLevelColor",
  "endTime",
  "evbBoard",
  "exhaustCfm",
  "extractorVane",
  "flatHeight",
  "flatWidth",
  "flLeft",
  "flRight",
  "focusBoresight",
  "foldMirror",
  "green2Kfl",
  "green2Kx",
  "green2Ky",
  "green4Kfl",
  "green4Kx",
  "green4Ky",
  "hcho",
  "humidity",
  "IcpBoard",
  "images",
  "imageVibration",
  "imbSBoard",
  "ImcbBoard",
  "integratorPosition",
  "integratorRod",
  "lampCurrentRunningHours",
  "lampLocMechanism",
  "lampMakeModel",
  "lampTotalRunningHours",
  "leStatus",
  "leStatusNote",
  "lightEngineBlack",
  "lightEngineBlue",
  "lightEngineFans",
  "lightEngineGreen",
  "lightEngineRed",
  "lightEngineSerialNumber",
  "lightEngineWhite",
  "liteloc",
  "nvVsE",
  "photosDriveLink",
  "pibBoard",
  "pixelDefects",
  "pm1",
  "pm10",
  "pm2_5",
  "projectorPlacementEnvironment",
  "projectorPvr",
  "projectorRegion",
  "projectorServices",
  "projectorState",
  "projectorStatus",
  "pumpConnectorHose",
  "pvVsE",
  "pvVsN",
  "radiatorFanPump",
  "Recommended Part 1",
  "Recommended Part Number 1",
  "Recommended Part 2",
  "Recommended Part Number 2",
  "Recommended Part 3",
  "Recommended Part Number 3",
  "Recommended Part 4",
  "Recommended Part Number 4",
  "Recommended Part 5",
  "Recommended Part Number 5",
  "Recommended Part 6",
  "Recommended Part Number 6",
  "red2Kfl",
  "red2Kx",
  "red2Ky",
  "red4Kfl",
  "red4Kx",
  "red4Ky",
  "reflector",
  "screenCropping",
  "screenCroppingNote",
  "screenGain",
  "screenHeight",
  "screenMake",
  "screenWidth",
  "securityLampHouseLock",
  "serialNumberVerified",
  "signatures",
  "softwareVersion",
  "spotsOnScreen",
  "startTime",
  "temperature",
  "throwDistance",
  "touchPanel",
  "tvoc",
  "uvFilter",
  "white2Kfl",
  "white2Kx",
  "white2Ky",
  "white4Kfl",
  "white4Kx",
  "white4Ky",
  "logs",
];

function getColumnHeaders(columns: string[] | "all", records: any[]): string[] {
  if (columns === "all") {
    const allKeys = new Set<string>();
    records.forEach((record) => {
      const flattened = flattenRecord(record);
      Object.keys(flattened).forEach((key) => {
        // Exclude action field as it's replaced by PDF column
        if (key !== "action") {
          allKeys.add(key);
        }
      });
    });

    // Sort by priority: priority fields first in order, then alphabetically for others
    const sortedKeys = Array.from(allKeys).sort((a, b) => {
      const aPriority = COLUMN_PRIORITY.indexOf(a);
      const bPriority = COLUMN_PRIORITY.indexOf(b);
      if (aPriority !== -1 && bPriority !== -1) return aPriority - bPriority;
      if (aPriority !== -1) return -1;
      if (bPriority !== -1) return 1;
      return a.localeCompare(b);
    });

    return sortedKeys;
  }

  // For specific columns, also sort by priority and exclude action
  return columns
    .filter((key) => key !== "action")
    .sort((a, b) => {
      const aPriority = COLUMN_PRIORITY.indexOf(a);
      const bPriority = COLUMN_PRIORITY.indexOf(b);
      if (aPriority !== -1 && bPriority !== -1) return aPriority - bPriority;
      if (aPriority !== -1) return -1;
      if (bPriority !== -1) return 1;
      return a.localeCompare(b);
    });
}

export async function processExportJob(
  jobData: ExportJobData,
  job?: { updateProgress: (progress: number) => Promise<void> },
): Promise<ExportJobResult> {
  console.log(`📦 Starting export job for user ${jobData.userId}...`);

  const updateProgress = async (percentage: number, message?: string) => {
    if (job) {
      await job.updateProgress(percentage);
    }
    if (message) {
      console.log(`📊 Progress: ${percentage}% - ${message}`);
    }
  };

  await updateProgress(5, "Fetching records...");
  const laserModels = await getLaserProjectorModels();
  const records = await fetchFilteredRecords(jobData);
  console.log(`📊 Found ${records.length} records to export`);

  if (records.length === 0) {
    throw new Error("No records found matching the filters");
  }

  const columnHeaders = getColumnHeaders(jobData.columns, records);
  console.log(`📋 Exporting ${columnHeaders.length} columns`);

  const pdfUrls: Map<string, string> = new Map();
  const totalChunks = Math.ceil(records.length / CHUNK_SIZE);
  const pdfProgressStart = 10;
  const pdfProgressEnd = 70;

  // Create Google Drive folder upfront so we can upload PDFs immediately
  const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9-_#]/g, "_");
  let driveFolderId: string | null = null;
  let driveFolderLink: string | null = null;

  try {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const folderName = `export_${dateStr}`;

    const { createDriveFolder, setFolderPublicPermissions } = await import("@/lib/google-drive");
    const { folderId, webViewLink } = await createDriveFolder(folderName);
    await setFolderPublicPermissions(folderId);
    driveFolderId = folderId;
    driveFolderLink = webViewLink;
    console.log(`📁 Created Drive folder: ${folderName}`);
  } catch (driveError) {
    console.error(`❌ Failed to create Drive folder:`, driveError);
    // Continue without Drive - PDFs will still be in Vercel Blob
  }

  console.log(`🔄 Generating PDFs in chunks of ${CHUNK_SIZE}...`);
  let driveUploaded = 0;

  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    const chunk = records.slice(i, i + CHUNK_SIZE);
    const chunkNumber = Math.floor(i / CHUNK_SIZE) + 1;
    console.log(`  Processing chunk ${chunkNumber}/${totalChunks}`);

    const progressInChunk =
      (chunkNumber / totalChunks) * (pdfProgressEnd - pdfProgressStart);
    await updateProgress(
      pdfProgressStart + progressInChunk,
      `Generating PDFs (${chunkNumber}/${totalChunks})...`,
    );

    // Process each record sequentially within a chunk to limit memory
    for (const record of chunk) {
      try {
        const { url, buffer } = await generateAndUploadPdf(record, laserModels);
        pdfUrls.set(record.id, url);

        // Upload to Google Drive immediately and discard buffer
        if (driveFolderId) {
          try {
            const { uploadPdfToDrive } = await import("@/lib/google-drive");
            const siteCode = sanitize(String(record?.site?.siteCode || record?.siteCode || "NA"));
            const address = sanitize(String(record?.address || record?.site?.address || "NA"));
            const screenNo = sanitize(String(record?.screenNumber || "NA"));
            const serialNo = sanitize(String(record?.projector?.serialNo || record?.projectorSerial || "NA"));
            const serviceVisit = sanitize(String(record?.serviceNumber || "NA"));
            const driveFileName = `${siteCode}_${address}_SC#${screenNo}_${serialNo}_${serviceVisit}.pdf`;

            await uploadPdfToDrive(buffer, driveFileName, driveFolderId);
            driveUploaded++;
            console.log(`  📤 Uploaded to Drive: ${driveFileName} (${driveUploaded}/${records.length})`);
          } catch (driveErr) {
            console.error(`  ❌ Drive upload failed for ${record.id}:`, driveErr);
          }
        }
        // Buffer is now out of scope and can be garbage collected
      } catch (error) {
        console.error(`Failed to generate PDF for record ${record.id}:`, error);
      }
    }
  }

  console.log(`✅ Generated ${pdfUrls.size} PDFs`);
  if (driveFolderId) {
    console.log(`✅ Uploaded ${driveUploaded}/${pdfUrls.size} PDFs to Google Drive`);
  }

  await updateProgress(75, "Creating Excel file...");
  console.log(`📝 Creating Excel file...`);
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Service Records");

  // Define columns with proper formatting
  const columns: Partial<ExcelJS.Column>[] = [
    { header: "PDF Report", key: "pdf", width: 15 },
    ...columnHeaders.map((colKey) => {
      // Determine if this is a date or time column
      let numFmt: string | undefined;
      const keyLower = colKey.toLowerCase();

      if (
        colKey === "date" ||
        colKey === "createdAt" ||
        keyLower.includes("date")
      ) {
        numFmt = "d mmmm yyyy";
      } else if (
        colKey === "startTime" ||
        colKey === "endTime" ||
        keyLower.includes("time")
      ) {
        numFmt = "mm/dd/yyyy hh:mm AM/PM";
      }

      // Convert camelCase to Title Case for better header readability
      const label = colKey
        .replace(/_/g, " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/\b\w/g, (c) => c.toUpperCase());

      return {
        header: label,
        key: colKey,
        width: 20,
        style: numFmt ? { numFmt } : undefined,
      };
    }),
  ];

  worksheet.columns = columns;

  // Style the header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E0E0" },
  };

  records.forEach((record) => {
    const flattened = flattenRecord(record);
    const pdfUrl = pdfUrls.get(record.id) || "";

    // Create row object mapping keys to values
    const rowData: Record<string, any> = { pdf: pdfUrl };
    columnHeaders.forEach((key) => {
      rowData[key] = flattened[key];
    });

    const row = worksheet.addRow(rowData);

    // Add hyperlink to PDF column
    if (pdfUrl) {
      const pdfCell = row.getCell("pdf");
      pdfCell.value = {
        text: "Download PDF",
        hyperlink: pdfUrl,
      };
      pdfCell.font = { color: { argb: "FF0000FF" }, underline: true };
    }
  });

  const excelBuffer = await workbook.xlsx.writeBuffer();
  const excelFileName = `exports/excel/export-${Date.now()}.xlsx`;
  const excelBlob = await put(excelFileName, Buffer.from(excelBuffer), {
    access: "public",
    contentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  console.log(`✅ Excel file uploaded: ${excelBlob.url}`);

  // Drive upload already done above — just log status
  if (driveFolderLink) {
    console.log(`✅ PDFs uploaded to Google Drive: ${driveFolderLink}`);
  }

  await updateProgress(90, "Sending email notification...");
  console.log(`📧 Sending email notification to ${jobData.email}...`);

  try {
    await sendEmail({
      to: jobData.email,
      subject: "Your Export is Ready",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Export Complete</h2>
          <p>Your export is ready!</p>
          <p><strong>Total Records:</strong> ${records.length}</p>
          <p><strong>PDFs Generated:</strong> ${pdfUrls.size}</p>
          
          <div style="margin-top: 30px;">
            <p style="margin-bottom: 15px;"><strong>Download Options:</strong></p>
            
            <!-- Excel Download Button -->
            <p style="margin-bottom: 15px;">
              <a href="${excelBlob.url}" 
                 style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                📊 Download Excel File
              </a>
            </p>
            
            ${
              driveFolderLink
                ? `
            <!-- Google Drive Link -->
            <p style="margin-bottom: 15px;">
              <a href="${driveFolderLink}" 
                 style="background-color: #4285f4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                📁 View All PDFs in Google Drive
              </a>
            </p>
            `
                : ""
            }
          </div>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 30px;">
            <p style="color: #666; font-size: 12px; margin: 0;">
              <strong>What's included:</strong><br>
              • Excel file contains all service record data with PDF links<br>
              ${driveFolderLink ? "• Google Drive folder contains all PDF reports for easy access and sharing<br>" : ""}
              • Individual PDFs are also linked in the Excel file
            </p>
          </div>
        </div>
      `,
    });
    console.log(`✅ Email sent successfully to ${jobData.email}`);
  } catch (emailError) {
    console.error(`❌ Failed to send email to ${jobData.email}:`, emailError);
    console.error(
      "Email error details:",
      emailError instanceof Error ? emailError.message : String(emailError),
    );
  }

  await updateProgress(100, "Export complete!");

  return {
    fileUrl: excelBlob.url,
    fileName: excelFileName,
    totalRecords: records.length,
    driveFolderLink: driveFolderLink || undefined,
  };
}
