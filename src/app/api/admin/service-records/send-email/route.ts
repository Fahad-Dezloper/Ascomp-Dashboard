import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
    try {
        const { serviceId, recipientEmail, emailContent, ccEmails } = await request.json()

        if (!serviceId || !recipientEmail || !emailContent) {
            return NextResponse.json(
                { error: "Service ID, recipient email, and email content are required" },
                { status: 400 }
            )
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(recipientEmail.trim())) {
            return NextResponse.json({ error: "Invalid email address" }, { status: 400 })
        }

        let ccArray: string[] = [];
        if (ccEmails) {
            if (typeof ccEmails === 'string') {
                ccArray = ccEmails.split(',').map(e => e.trim()).filter(e => e.length > 0);
            } else if (Array.isArray(ccEmails)) {
                ccArray = ccEmails.map(e => String(e).trim()).filter(e => e.length > 0);
            }
            
            for (const email of ccArray) {
                if (!emailRegex.test(email)) {
                    return NextResponse.json({ error: `Invalid CC email address: ${email}` }, { status: 400 })
                }
            }
        }

        // Build absolute URL for API call
        const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
        const host = request.headers.get('host') || 'localhost:3000'
        const baseUrl = `${protocol}://${host}`

        // Fetch service data from API
        const res = await fetch(`${baseUrl}/api/admin/service-records/${serviceId}`, {
            headers: {
                cookie: request.headers.get('cookie') || '',
            },
        })

        if (!res.ok) throw new Error("Failed to fetch service")

        const json = await res.json()
        const fullService = json.service || json

        // Generate PDF using the PDF generator
        const { generateMaintenanceReport, convertServiceVisitToText } = await import("@/components/PDFGenerator")

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

        const { readLaserField } = await import("@/lib/laser-service-record")
        const isLaser = !!fullService.isLaserProjector
        const laserRec = fullService.laserServiceRecord ?? null
        const wd = fullService.workDetails ?? {}

        const lf = (laserKey: string): string =>
            isLaser ? readLaserField(laserRec, laserKey, wd) : ""

        const reportData: any = {
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
                white2K: { fl: wd.white2Kfl?.toString() || "", x: wd.white2Kx?.toString() || "", y: wd.white2Ky?.toString() || "" },
                white4K: { fl: wd.white4Kfl?.toString() || "", x: wd.white4Kx?.toString() || "", y: wd.white4Ky?.toString() || "" },
                red2K: { fl: wd.red2Kfl?.toString() || "", x: wd.red2Kx?.toString() || "", y: wd.red2Ky?.toString() || "" },
                red4K: { fl: wd.red4Kfl?.toString() || "", x: wd.red4Kx?.toString() || "", y: wd.red4Ky?.toString() || "" },
                green2K: { fl: wd.green2Kfl?.toString() || "", x: wd.green2Kx?.toString() || "", y: wd.green2Ky?.toString() || "" },
                green4K: { fl: wd.green4Kfl?.toString() || "", x: wd.green4Kx?.toString() || "", y: wd.green4Ky?.toString() || "" },
                blue2K: { fl: wd.blue2Kfl?.toString() || "", x: wd.blue2Kx?.toString() || "", y: wd.blue2Ky?.toString() || "" },
                blue4K: { fl: wd.blue4Kfl?.toString() || "", x: wd.blue4Kx?.toString() || "", y: wd.blue4Ky?.toString() || "" },
            },
            cieXyz2K: { x: wd.BW_Step_10_2Kx?.toString() || "", y: wd.BW_Step_10_2Ky?.toString() || "", fl: wd.BW_Step_10_2Kfl?.toString() || "" },
            cieXyz4K: { x: wd.BW_Step_10_4Kx?.toString() || "", y: wd.BW_Step_10_4Ky?.toString() || "", fl: wd.BW_Step_10_4Kfl?.toString() || "" },
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
                if (wd.photosDriveLink || fullService.photosDriveLink) {
                    return wd.photosDriveLink || fullService.photosDriveLink;
                }
                const hasImages =
                    (Array.isArray(fullService.images) && fullService.images.length > 0) ||
                    (Array.isArray(fullService.afterImages) && fullService.afterImages.length > 0) ||
                    (Array.isArray(fullService.brokenImages) && fullService.brokenImages.length > 0);
                if (hasImages) {
                    return `${baseUrl}/share/service-images/${serviceId}`;
                }
                return undefined;
            })(),
        }

        // Generate PDF
        const pdfBytes = await generateMaintenanceReport(reportData)

        // Convert PDF bytes to base64 for email attachment
        const pdfBase64 = Buffer.from(pdfBytes as any).toString('base64')

        // Send email with attachment
        const { createGmailTransporter } = await import("@/lib/email")

        const transporter = createGmailTransporter()

        if (!transporter) {
            throw new Error("Email transporter not configured")
        }

        await transporter.sendMail({
            from: `"Ascomp CRM" <${process.env.GMAIL_OAUTH_USER}>`,
            to: recipientEmail,
            cc: ccArray.length > 0 ? ccArray : undefined,
            subject: emailContent.subject,
            html: emailContent.body,
            attachments: [
                {
                    filename: `${fullService.projector?.serialNo || 'Service_Report'}.pdf`,
                    content: pdfBase64,
                    encoding: 'base64',
                    contentType: 'application/pdf',
                },
            ],
        })

        return NextResponse.json({
            success: true,
            message: `Email sent successfully to ${recipientEmail}`,
        })
    } catch (error) {
        console.error("Error sending service report email:", error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to send email" },
            { status: 500 }
        )
    }
}
