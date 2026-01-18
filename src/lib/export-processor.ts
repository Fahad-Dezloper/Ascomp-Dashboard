import prisma from "./db";
import { type ExportJobData, type ExportJobResult } from "./queues/export-queue";
import { put } from "@vercel/blob";
import ExcelJS from "exceljs";
import { generateMaintenanceReport, type MaintenanceReportData, convertServiceVisitToText } from "@/components/PDFGenerator";
import { sendEmail } from "./email";

const CHUNK_SIZE = 50;

function mapStatus(value?: string | null, note?: string | null) {
  return {
    status: note ? String(note) : "",
    yesNo: value ? (String(value).split("(")[0] || "").trim() : "",
  };
}

function safe(val: any) {
  return val ? String(val) : "";
}

function buildPdfDataFromService(fullService: any): MaintenanceReportData {
  const workDetails = fullService.workDetails || {};
  
  return {
    cinemaName: fullService.cinemaName || fullService.site?.siteName || "",
    date: fullService.date ? new Date(fullService.date).toLocaleDateString() : "",
    address: fullService.address || fullService.site?.address || "",
    contactDetails: fullService.contactDetails || fullService.site?.contactDetails || "",
    location: fullService.location || "",
    screenNo: fullService.screenNumber || fullService.site?.screenNo || "",
    serviceVisit: fullService.assignedTo?.name
      ? `${fullService.assignedTo.name} - ${convertServiceVisitToText(fullService.serviceNumber)}`
      : fullService.serviceNumber?.toString() || "",
    projectorModel: fullService.projector?.modelNo || "",
    serialNo: fullService.projector?.serialNo || "",
    runningHours: fullService.projectorRunningHours?.toString() || "",
    projectorEnvironment: workDetails.projectorPlacementEnvironment || fullService.projectorPlacementEnvironment || "",
    startTime: workDetails.startTime || fullService.startTime,
    endTime: workDetails.endTime || fullService.endTime,
    opticals: {
      reflector: mapStatus(workDetails.reflector || fullService.reflector, workDetails.reflectorNote || fullService.reflectorNote),
      uvFilter: mapStatus(workDetails.uvFilter || fullService.uvFilter, workDetails.uvFilterNote || fullService.uvFilterNote),
      integratorRod: mapStatus(workDetails.integratorRod || fullService.integratorRod, workDetails.integratorRodNote || fullService.integratorRodNote),
      coldMirror: mapStatus(workDetails.coldMirror || fullService.coldMirror, workDetails.coldMirrorNote || fullService.coldMirrorNote),
      foldMirror: mapStatus(workDetails.foldMirror || fullService.foldMirror, workDetails.foldMirrorNote || fullService.foldMirrorNote),
    },
    electronics: {
      touchPanel: mapStatus(workDetails.touchPanel || fullService.touchPanel, workDetails.touchPanelNote || fullService.touchPanelNote),
      evbBoard: mapStatus(workDetails.evbBoard || fullService.evbBoard, workDetails.evbBoardNote || fullService.evbBoardNote),
      ImcbBoard: mapStatus(workDetails.ImcbBoard || fullService.ImcbBoard, workDetails.ImcbBoardNote || fullService.ImcbBoardNote),
      pibBoard: mapStatus(workDetails.pibBoard || fullService.pibBoard, workDetails.pibBoardNote || fullService.pibBoardNote),
      IcpBoard: mapStatus(workDetails.IcpBoard || fullService.IcpBoard, workDetails.IcpBoardNote || fullService.IcpBoardNote),
      imbSBoard: mapStatus(workDetails.imbSBoard || fullService.imbSBoard, workDetails.imbSBoardNote || fullService.imbSBoardNote),
    },
    serialVerified: mapStatus(workDetails.serialNumberVerified || fullService.serialNumberVerified, workDetails.serialNumberVerifiedNote || fullService.serialNumberVerifiedNote),
    AirIntakeLadRad: mapStatus(workDetails.AirIntakeLadRad || fullService.AirIntakeLadRad, workDetails.AirIntakeLadRadNote || fullService.AirIntakeLadRadNote),
    coolant: mapStatus(workDetails.coolantLevelColor || fullService.coolantLevelColor, workDetails.coolantLevelColorNote || fullService.coolantLevelColorNote),
    lightEngineTest: {
      white: mapStatus(workDetails.lightEngineWhite || fullService.lightEngineWhite, workDetails.lightEngineWhiteNote || fullService.lightEngineWhiteNote),
      red: mapStatus(workDetails.lightEngineRed || fullService.lightEngineRed, workDetails.lightEngineRedNote || fullService.lightEngineRedNote),
      green: mapStatus(workDetails.lightEngineGreen || fullService.lightEngineGreen, workDetails.lightEngineGreenNote || fullService.lightEngineGreenNote),
      blue: mapStatus(workDetails.lightEngineBlue || fullService.lightEngineBlue, workDetails.lightEngineBlueNote || fullService.lightEngineBlueNote),
      black: mapStatus(workDetails.lightEngineBlack || fullService.lightEngineBlack, workDetails.lightEngineBlackNote || fullService.lightEngineBlackNote),
    },
    mechanical: {
      acBlower: mapStatus(workDetails.acBlowerVane || fullService.acBlowerVane, workDetails.acBlowerVaneNote || fullService.acBlowerVaneNote),
      extractor: mapStatus(workDetails.extractorVane || fullService.extractorVane, workDetails.extractorVaneNote || fullService.extractorVaneNote),
      exhaustCFM: {
        status: safe(workDetails.exhaustCfm || fullService.exhaustCfm),
        yesNo: (workDetails.exhaustCfm || fullService.exhaustCfm) ? "OK" : "",
      },
      lightEngine4Fans: mapStatus(workDetails.lightEngineFans || fullService.lightEngineFans, workDetails.lightEngineFansNote || fullService.lightEngineFansNote),
      cardCageFans: mapStatus(workDetails.cardCageFans || fullService.cardCageFans, workDetails.cardCageFansNote || fullService.cardCageFansNote),
      radiatorFan: mapStatus(workDetails.radiatorFanPump || fullService.radiatorFanPump, workDetails.radiatorFanPumpNote || fullService.radiatorFanPumpNote),
      connectorHose: mapStatus(workDetails.pumpConnectorHose || fullService.pumpConnectorHose, workDetails.pumpConnectorHoseNote || fullService.pumpConnectorHoseNote),
      securityLock: mapStatus(workDetails.securityLampHouseLock || fullService.securityLampHouseLock, workDetails.securityLampHouseLockNote || fullService.securityLampHouseLockNote),
    },
    lampLOC: mapStatus(workDetails.lampLocMechanism || fullService.lampLocMechanism, workDetails.lampLocMechanismNote || fullService.lampLocMechanismNote),
    lampMake: workDetails.lampMakeModel || fullService.lampMakeModel || "",
    lampHours: (workDetails.lampTotalRunningHours || fullService.lampTotalRunningHours)?.toString() || "",
    currentLampHours: (workDetails.lampCurrentRunningHours || fullService.lampCurrentRunningHours)?.toString() || "",
    voltageParams: {
      pvn: workDetails.pvVsN || fullService.pvVsN || "",
      pve: workDetails.pvVsE || fullService.pvVsE || "",
      nve: workDetails.nvVsE || fullService.nvVsE || "",
    },
    flBefore: (workDetails.flLeft || fullService.flLeft)?.toString() || "",
    flAfter: (workDetails.flRight || fullService.flRight)?.toString() || "",
    contentPlayer: workDetails.contentPlayerModel || fullService.contentPlayerModel || "",
    acStatus: workDetails.acStatus || fullService.acStatus || "",
    leStatus: {
      status: safe(workDetails.leStatus || fullService.leStatus),
      remarks: safe(workDetails.leStatusNote || fullService.leStatusNote),
    },
    remarks: fullService.remarks || "",
    leSerialNo: workDetails.lightEngineSerialNumber || fullService.lightEngineSerialNumber || "",
    mcgdData: {
      white2K: {
        fl: (workDetails.white2Kfl || fullService.white2Kfl)?.toString() || "",
        x: (workDetails.white2Kx || fullService.white2Kx)?.toString() || "",
        y: (workDetails.white2Ky || fullService.white2Ky)?.toString() || "",
      },
      white4K: {
        fl: (workDetails.white4Kfl || fullService.white4Kfl)?.toString() || "",
        x: (workDetails.white4Kx || fullService.white4Kx)?.toString() || "",
        y: (workDetails.white4Ky || fullService.white4Ky)?.toString() || "",
      },
      red2K: {
        fl: (workDetails.red2Kfl || fullService.red2Kfl)?.toString() || "",
        x: (workDetails.red2Kx || fullService.red2Kx)?.toString() || "",
        y: (workDetails.red2Ky || fullService.red2Ky)?.toString() || "",
      },
      red4K: {
        fl: (workDetails.red4Kfl || fullService.red4Kfl)?.toString() || "",
        x: (workDetails.red4Kx || fullService.red4Kx)?.toString() || "",
        y: (workDetails.red4Ky || fullService.red4Ky)?.toString() || "",
      },
      green2K: {
        fl: (workDetails.green2Kfl || fullService.green2Kfl)?.toString() || "",
        x: (workDetails.green2Kx || fullService.green2Kx)?.toString() || "",
        y: (workDetails.green2Ky || fullService.green2Ky)?.toString() || "",
      },
      green4K: {
        fl: (workDetails.green4Kfl || fullService.green4Kfl)?.toString() || "",
        x: (workDetails.green4Kx || fullService.green4Kx)?.toString() || "",
        y: (workDetails.green4Ky || fullService.green4Ky)?.toString() || "",
      },
      blue2K: {
        fl: (workDetails.blue2Kfl || fullService.blue2Kfl)?.toString() || "",
        x: (workDetails.blue2Kx || fullService.blue2Kx)?.toString() || "",
        y: (workDetails.blue2Ky || fullService.blue2Ky)?.toString() || "",
      },
      blue4K: {
        fl: (workDetails.blue4Kfl || fullService.blue4Kfl)?.toString() || "",
        x: (workDetails.blue4Kx || fullService.blue4Kx)?.toString() || "",
        y: (workDetails.blue4Ky || fullService.blue4Ky)?.toString() || "",
      },
    },
    cieXyz2K: {
      x: (workDetails.BW_Step_10_2Kx || fullService.BW_Step_10_2Kx)?.toString() || "",
      y: (workDetails.BW_Step_10_2Ky || fullService.BW_Step_10_2Ky)?.toString() || "",
      fl: (workDetails.BW_Step_10_2Kfl || fullService.BW_Step_10_2Kfl)?.toString() || "",
    },
    cieXyz4K: {
      x: (workDetails.BW_Step_10_4Kx || fullService.BW_Step_10_4Kx)?.toString() || "",
      y: (workDetails.BW_Step_10_4Ky || fullService.BW_Step_10_4Ky)?.toString() || "",
      fl: (workDetails.BW_Step_10_4Kfl || fullService.BW_Step_10_4Kfl)?.toString() || "",
    },
    softwareVersion: workDetails.softwareVersion || fullService.softwareVersion || "",
    screenInfo: {
      scope: {
        height: (workDetails.screenHeight || fullService.screenHeight)?.toString() || "",
        width: (workDetails.screenWidth || fullService.screenWidth)?.toString() || "",
        gain: (workDetails.screenGain || fullService.screenGain)?.toString() || "",
      },
      flat: {
        height: (workDetails.flatHeight || fullService.flatHeight)?.toString() || "",
        width: (workDetails.flatWidth || fullService.flatWidth)?.toString() || "",
        gain: (workDetails.screenGain || fullService.screenGain)?.toString() || "",
      },
      make: workDetails.screenMake || fullService.screenMake || "",
    },
    throwDistance: (workDetails.throwDistance || fullService.throwDistance)?.toString() || "",
    imageEvaluation: {
      focusBoresite: mapStatus(workDetails.focusBoresight || fullService.focusBoresight, workDetails.focusBoresightNote || fullService.focusBoresightNote),
      integratorPosition: mapStatus(workDetails.integratorPosition || fullService.integratorPosition, workDetails.integratorPositionNote || fullService.integratorPositionNote),
      spotOnScreen: mapStatus(workDetails.spotsOnScreen || fullService.spotsOnScreen, workDetails.spotsOnScreenNote || fullService.spotsOnScreenNote),
      screenCropping: mapStatus(workDetails.screenCroppingOk || fullService.screenCropping, workDetails.screenCroppingNote || fullService.screenCroppingNote),
      convergence: mapStatus(workDetails.convergenceOk || fullService.convergence, workDetails.convergenceNote || fullService.convergenceNote),
      channelsChecked: mapStatus(workDetails.channelsCheckedOk || fullService.channelsChecked, workDetails.channelsCheckedNote || fullService.channelsCheckedNote),
      pixelDefects: mapStatus(workDetails.pixelDefects || fullService.pixelDefects, workDetails.pixelDefectsNote || fullService.pixelDefectsNote),
      imageVibration: mapStatus(workDetails.imageVibration || fullService.imageVibration, workDetails.imageVibrationNote || fullService.imageVibrationNote),
      liteLOC: mapStatus(workDetails.liteloc || fullService.liteloc, workDetails.litelocNote || fullService.litelocNote),
    },
    airPollution: {
      airPollutionLevel: workDetails.airPollutionLevel || fullService.airPollutionLevel || "",
      hcho: (workDetails.hcho || fullService.hcho)?.toString() || "",
      tvoc: (workDetails.tvoc || fullService.tvoc)?.toString() || "",
      pm10: (workDetails.pm10 || fullService.pm10)?.toString() || "",
      pm25: (workDetails.pm2_5 || fullService.pm2_5)?.toString() || "",
      pm100: (workDetails.pm1 || fullService.pm1)?.toString() || "",
      temperature: (workDetails.temperature || fullService.temperature)?.toString() || "",
      humidity: (workDetails.humidity || fullService.humidity)?.toString() || "",
    },
    recommendedParts: Array.isArray(workDetails.recommendedParts || fullService.recommendedParts)
      ? (workDetails.recommendedParts || fullService.recommendedParts).map((part: any) => ({
          name: String(part.name ?? part.description ?? ""),
          partNumber: String(part.partNumber ?? part.part_number ?? ""),
        }))
      : [],
    issueNotes: [],
    detectedIssues: [],
    reportGenerated: true,
    reportUrl: "",
    engineerSignatureUrl: fullService.signatures?.engineer || (fullService.signatures as any)?.engineerSignatureUrl || "",
    siteSignatureUrl: fullService.signatures?.site || (fullService.signatures as any)?.siteSignatureUrl || "",
    imagesLink: (() => {
      if (workDetails.photosDriveLink || fullService.photosDriveLink) {
        return workDetails.photosDriveLink || fullService.photosDriveLink;
      }
      const hasImages =
        (Array.isArray(fullService.images) && fullService.images.length > 0) ||
        (Array.isArray(fullService.afterImages) && fullService.afterImages.length > 0) ||
        (Array.isArray(fullService.brokenImages) && fullService.brokenImages.length > 0);
      if (hasImages) {
        const baseUrl = process.env.CORS_ORIGIN || "";
        const imagesPath = `/share/service-images/${fullService.id}`;
        return baseUrl ? `${baseUrl}${imagesPath}` : imagesPath;
      }
      return undefined;
    })(),
  };
}

async function generateAndUploadPdf(service: any): Promise<string> {
  const pdfData = buildPdfDataFromService(service);
  const pdfBytes = await generateMaintenanceReport(pdfData);
  const pdfBuffer = Buffer.from(pdfBytes);

  const fileName = `exports/pdfs/${service.id}-${Date.now()}.pdf`;
  const blob = await put(fileName, pdfBuffer, {
    access: "public",
    contentType: "application/pdf",
  });

  return blob.url;
}

async function fetchFilteredRecords(jobData: ExportJobData): Promise<any[]> {
  let where: any = {};

  if (jobData.filters.type === "none") {
    const records = await prisma.serviceRecord.findMany({
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
      },
    });

    return records;
  }

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

  if (jobData.filters.type === "custom" && jobData.filters.conditions.length > 0) {
    const conditions = jobData.filters.conditions.map((condition) => {
      let fieldWhere: any = {};

      if (condition.table === "projector") {
        fieldWhere.projector = {};
        if (condition.operator === "equals") {
          fieldWhere.projector[condition.field] = condition.value;
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
            not: condition.value,
          };
        }
      } else if (condition.table === "site") {
        fieldWhere.site = {};
        if (condition.operator === "equals") {
          fieldWhere.site[condition.field] = condition.value;
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
            not: condition.value,
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
        where.AND = [
          { OR: conditions },
          ...basicFilterConditions,
        ];
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
    date: record.date ? new Date(record.date).toLocaleDateString() : "",
    createdAt: record.createdAt ? new Date(record.createdAt).toLocaleDateString() : "",
    cinemaName: record.cinemaName || record.site?.siteName || "",
    screenNumber: record.screenNumber || "",
    location: record.location || "",
    projectorSerial: record.projector?.serialNo || "",
    projectorModel: record.projector?.modelNo || "",
    engineerName: record.assignedTo?.name || "",
    engineerEmail: record.assignedTo?.email || "",
    address: record.address || record.site?.address || "",
    contactDetails: record.contactDetails || record.site?.contactDetails || "",
    projectorRunningHours: record.projectorRunningHours?.toString() || "",
    remarks: record.remarks || "",
    startTime: record.startTime ? new Date(record.startTime).toISOString() : "",
    endTime: record.endTime ? new Date(record.endTime).toISOString() : "",
    reportGenerated: record.reportGenerated?.toString() || "",
    reportUrl: record.reportUrl || "",
  };

  const workDetailFields = [
    "reflector", "reflectorNote", "uvFilter", "uvFilterNote", "integratorRod", "integratorRodNote",
    "coldMirror", "coldMirrorNote", "foldMirror", "foldMirrorNote", "touchPanel", "touchPanelNote",
    "evbBoard", "evbBoardNote", "ImcbBoard", "ImcbBoardNote", "pibBoard", "pibBoardNote",
    "IcpBoard", "IcpBoardNote", "imbSBoard", "imbSBoardNote", "serialNumberVerified", "serialNumberVerifiedNote",
    "AirIntakeLadRad", "AirIntakeLadRadNote", "coolantLevelColor", "coolantLevelColorNote",
    "lightEngineWhite", "lightEngineWhiteNote", "lightEngineRed", "lightEngineRedNote",
    "lightEngineGreen", "lightEngineGreenNote", "lightEngineBlue", "lightEngineBlueNote",
    "lightEngineBlack", "lightEngineBlackNote", "acBlowerVane", "acBlowerVaneNote",
    "extractorVane", "extractorVaneNote", "exhaustCfm", "exhaustCfmNote",
    "lightEngineFans", "lightEngineFansNote", "cardCageFans", "cardCageFansNote",
    "radiatorFanPump", "radiatorFanPumpNote", "pumpConnectorHose", "pumpConnectorHoseNote",
    "securityLampHouseLock", "securityLampHouseLockNote", "lampLocMechanism", "lampLocMechanismNote",
    "projectorPlacementEnvironment", "softwareVersion", "screenHeight", "screenWidth",
    "flatHeight", "flatWidth", "screenGain", "screenMake", "throwDistance",
    "lampMakeModel", "lampTotalRunningHours", "lampCurrentRunningHours",
    "pvVsN", "pvVsE", "nvVsE", "flLeft", "flRight", "contentPlayerModel",
    "acStatus", "leStatus", "leStatusNote", "white2Kx", "white2Ky", "white2Kfl",
    "white4Kx", "white4Ky", "white4Kfl", "red2Kx", "red2Ky", "red2Kfl",
    "red4Kx", "red4Ky", "red4Kfl", "green2Kx", "green2Ky", "green2Kfl",
    "green4Kx", "green4Ky", "green4Kfl", "blue2Kx", "blue2Ky", "blue2Kfl",
    "blue4Kx", "blue4Ky", "blue4Kfl", "focusBoresight", "focusBoresightNote",
    "integratorPosition", "integratorPositionNote", "spotsOnScreen", "spotsOnScreenNote",
    "screenCropping", "screenCroppingNote", "convergence", "convergenceNote",
    "channelsChecked", "channelsCheckedNote", "pixelDefects", "pixelDefectsNote",
    "imageVibration", "imageVibrationNote", "liteloc", "litelocNote",
    "hcho", "tvoc", "pm1", "pm2_5", "pm10", "temperature", "humidity",
    "airPollutionLevel", "lightEngineSerialNumber", "BW_Step_10_2Kx", "BW_Step_10_2Ky",
    "BW_Step_10_2Kfl", "BW_Step_10_4Kx", "BW_Step_10_4Ky", "BW_Step_10_4Kfl",
  ];

  workDetailFields.forEach((field) => {
    const value = record[field];
    if (value !== null && value !== undefined) {
      if (typeof value === "number" || typeof value === "boolean") {
        flattened[field] = String(value);
      } else if (value instanceof Date) {
        flattened[field] = value.toISOString();
      } else {
        flattened[field] = String(value);
      }
    }
  });

  if (record.recommendedParts && Array.isArray(record.recommendedParts)) {
    flattened.recommendedParts = JSON.stringify(record.recommendedParts);
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
  "recommendedParts",
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
    .filter(key => key !== "action")
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
  job?: { updateProgress: (progress: number) => Promise<void> }
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

  console.log(`🔄 Generating PDFs in chunks of ${CHUNK_SIZE}...`);
  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    const chunk = records.slice(i, i + CHUNK_SIZE);
    const chunkNumber = Math.floor(i / CHUNK_SIZE) + 1;
    console.log(`  Processing chunk ${chunkNumber}/${totalChunks}`);

    const progressInChunk = (chunkNumber / totalChunks) * (pdfProgressEnd - pdfProgressStart);
    await updateProgress(pdfProgressStart + progressInChunk, `Generating PDFs (${chunkNumber}/${totalChunks})...`);

    const pdfPromises = chunk.map(async (record) => {
      try {
        const pdfUrl = await generateAndUploadPdf(record);
        return { id: record.id, url: pdfUrl };
      } catch (error) {
        console.error(`Failed to generate PDF for record ${record.id}:`, error);
        return { id: record.id, url: "" };
      }
    });

    const results = await Promise.all(pdfPromises);
    results.forEach(({ id, url }) => {
      if (url) pdfUrls.set(id, url);
    });
  }

  console.log(`✅ Generated ${pdfUrls.size} PDFs`);

  await updateProgress(75, "Creating Excel file...");
  console.log(`📝 Creating Excel file...`);
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Service Records");

  const headers = ["PDF", ...columnHeaders];
  worksheet.addRow(headers);

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
    const row: any[] = [pdfUrl, ...columnHeaders.map((col) => flattened[col] || "")];
    worksheet.addRow(row);

    if (pdfUrl) {
      const pdfCell = worksheet.getCell(worksheet.rowCount, 1);
      pdfCell.value = {
        text: pdfUrl,
        hyperlink: pdfUrl,
      };
      pdfCell.font = { color: { argb: "FF0000FF" }, underline: true };
    }
  });

  worksheet.columns.forEach((column) => {
    if (column.header) {
      column.width = 15;
    }
  });

  const excelBuffer = await workbook.xlsx.writeBuffer();
  const excelFileName = `exports/excel/export-${Date.now()}.xlsx`;
  const excelBlob = await put(excelFileName, Buffer.from(excelBuffer), {
    access: "public",
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  console.log(`✅ Excel file uploaded: ${excelBlob.url}`);

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
          <p style="margin-top: 30px;">
            <a href="${excelBlob.url}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Download Excel File
            </a>
          </p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            The Excel file contains all the data plus links to individual PDF reports for each service record.
          </p>
        </div>
      `,
    });
    console.log(`✅ Email sent successfully to ${jobData.email}`);
  } catch (emailError) {
    console.error(`❌ Failed to send email to ${jobData.email}:`, emailError);
    console.error("Email error details:", emailError instanceof Error ? emailError.message : String(emailError));
  }

  await updateProgress(100, "Export complete!");

  return {
    fileUrl: excelBlob.url,
    fileName: excelFileName,
    totalRecords: records.length,
  };
}
