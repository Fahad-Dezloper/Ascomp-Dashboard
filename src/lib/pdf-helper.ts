import { generateMaintenanceReport, type MaintenanceReportData, convertServiceVisitToText } from "@/components/PDFGenerator"
import { readLaserField } from "@/lib/laser-service-record"

export async function constructAndGeneratePDF(serviceId: string, isDraft?: boolean) {
    const res = await fetch(`/api/admin/service-records/${serviceId}`, {
        credentials: "include",
    })

    if (!res.ok) throw new Error("Failed to fetch service")

    const json = await res.json()
    const fullService = json.service || json

    const mapStatus = (value?: string | null, note?: string | null) => {
        const valStr = value ? String(value) : ""
        const separatorIdx = valStr.indexOf(" - ")
        // If value contains " - " (sub-option format) and no separate note, parse from value
        if (separatorIdx !== -1 && !note) {
            return {
                yesNo: valStr.substring(0, separatorIdx).trim(),
                status: valStr.substring(separatorIdx + 3).trim(),
            }
        }
        return {
            status: note ? String(note) : "",
            yesNo: (valStr.split('(')[0] || "").trim(),
        }
    }

    const safe = (val: any) => val ? String(val) : ''

    const isLaser = !!fullService.isLaserProjector
    const laserRec = fullService.laserServiceRecord ?? null
    const wd = fullService.workDetails ?? {}

    /**
     * For laser reports: read from LaserServiceRecord first, fall back to the
     * standard workDetails column (for records saved before the new table existed).
     * For standard reports: always use workDetails directly.
     */
    const lf = (laserKey: string): string =>
        isLaser ? readLaserField(laserRec, laserKey, wd) : ""

    const reportData: MaintenanceReportData = {
        reportType: isLaser ? "laser" : "standard",
        cinemaName: fullService.cinemaName || fullService.site?.name || "",
        date: fullService.date ? new Date(fullService.date).toLocaleDateString() : "",
        address: fullService.address || fullService.site?.address || "",
        contactDetails: fullService.contactDetails || fullService.site?.contactDetails || "",
        location: fullService.location || "",
        screenNo: fullService.screenNumber || fullService.site?.screenNo || "",
        serviceVisit: fullService.engineerName ? `${fullService.engineerName} - ${convertServiceVisitToText(fullService.serviceNumber)}` : fullService.serviceNumber?.toString() || "",
        serviceNumber: fullService.serviceNumber?.toString() || "",
        projectorModel: fullService.projector?.model || "",
        serialNo: fullService.projector?.serialNo || "",
        runningHours: fullService.projectorRunningHours?.toString() || "",
        projectorEnvironment: wd.projectorPlacementEnvironment || "",
        startTime: wd.startTime,
        endTime: wd.endTime,
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
            screenCropping: mapStatus(wd.screenCroppingOk, wd.screenCroppingNote),
            convergence: mapStatus(wd.convergenceOk, wd.convergenceNote),
            channelsChecked: mapStatus(wd.channelsCheckedOk, wd.channelsCheckedNote),
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
            fullService.signatures?.engineer || (fullService.signatures as any)?.engineerSignatureUrl || "",
        siteSignatureUrl: fullService.signatures?.site || (fullService.signatures as any)?.siteSignatureUrl || "",
        imagesLink: (() => {
            // First check if photosDriveLink exists (it's in workDetails)
            if (wd.photosDriveLink) {
                return wd.photosDriveLink;
            }

            // Check if images arrays have any data
            const hasImages =
                (Array.isArray(fullService.images) && fullService.images.length > 0) ||
                (Array.isArray(fullService.afterImages) && fullService.afterImages.length > 0) ||
                (Array.isArray(fullService.brokenImages) && fullService.brokenImages.length > 0);

            if (hasImages) {
                // Generate link to images page with full domain from CORS_ORIGIN
                const baseUrl = process.env.CORS_ORIGIN || '';
                const imagesPath = `/share/service-images/${serviceId}`;

                return baseUrl ? `${baseUrl}${imagesPath}` : imagesPath;
            }

        return undefined;
        })(),
        isDraft,
    }

    return generateMaintenanceReport(reportData)
}
