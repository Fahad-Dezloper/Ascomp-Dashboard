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

        // console.log("fullservice here", fullService)

        const reportData: any = {
            reportType: fullService.isLaserProjector ? "laser" : "standard",
            cinemaName: fullService.cinemaName || fullService.site?.name || "",
            date: fullService.date ? new Date(fullService.date).toLocaleDateString() : "",
            address: fullService.address || fullService.site?.address || "",
            contactDetails: fullService.contactDetails || fullService.site?.contactDetails || "",
            location: fullService.location || "",
            screenNo: fullService.screenNumber || fullService.site?.screenNo || "",
            serviceVisit: fullService.engineerName ? `${fullService.engineerName} - ${convertServiceVisitToText(fullService.serviceNumber)}` : fullService.serviceNumber?.toString() || "",
            projectorModel: fullService.projector?.model || "",
            serialNo: fullService.projector?.serialNo || "",
            runningHours: fullService.projectorRunningHours?.toString() || "",
            projectorEnvironment: fullService.workDetails?.projectorPlacementEnvironment || "",
            startTime: fullService.workDetails?.startTime,
            endTime: fullService.workDetails?.endTime,
            opticals: {
                reflector: mapStatus(fullService.workDetails?.reflector, fullService.workDetails?.reflectorNote),
                uvFilter: mapStatus(fullService.workDetails?.uvFilter, fullService.workDetails?.uvFilterNote),
                integratorRod: mapStatus(fullService.workDetails?.integratorRod, fullService.workDetails?.integratorRodNote),
                coldMirror: mapStatus(fullService.workDetails?.coldMirror, fullService.workDetails?.coldMirrorNote),
                foldMirror: mapStatus(fullService.workDetails?.foldMirror, fullService.workDetails?.foldMirrorNote),
            },
            electronics: {
                touchPanel: mapStatus(fullService.workDetails?.touchPanel, fullService.workDetails?.touchPanelNote),
                evbBoard: mapStatus(fullService.workDetails?.evbBoard, fullService.workDetails?.evbBoardNote),
                ImcbBoard: mapStatus(fullService.workDetails?.ImcbBoard, fullService.workDetails?.ImcbBoardNote),
                pibBoard: mapStatus(fullService.workDetails?.pibBoard, fullService.workDetails?.pibBoardNote),
                IcpBoard: mapStatus(fullService.workDetails?.IcpBoard, fullService.workDetails?.IcpBoardNote),
                imbSBoard: mapStatus(fullService.workDetails?.imbSBoard, fullService.workDetails?.imbSBoardNote),
            },
            serialVerified: mapStatus(fullService.workDetails?.serialNumberVerified, fullService.workDetails?.serialNumberVerifiedNote),
            AirIntakeLadRad: mapStatus(fullService.workDetails?.AirIntakeLadRad, fullService.workDetails?.AirIntakeLadRadNote),
            coolant: mapStatus(fullService.workDetails?.coolantLevelColor, fullService.workDetails?.coolantLevelColorNote),
            lightEngineTest: {
                white: mapStatus(fullService.workDetails?.lightEngineWhite, fullService.workDetails?.lightEngineWhiteNote),
                red: mapStatus(fullService.workDetails?.lightEngineRed, fullService.workDetails?.lightEngineRedNote),
                green: mapStatus(fullService.workDetails?.lightEngineGreen, fullService.workDetails?.lightEngineGreenNote),
                blue: mapStatus(fullService.workDetails?.lightEngineBlue, fullService.workDetails?.lightEngineBlueNote),
                black: mapStatus(fullService.workDetails?.lightEngineBlack, fullService.workDetails?.lightEngineBlackNote),
            },
            mechanical: {
                acBlower: mapStatus(fullService.workDetails?.acBlowerVane, fullService.workDetails?.acBlowerVaneNote),
                extractor: mapStatus(fullService.workDetails?.extractorVane, fullService.workDetails?.extractorVaneNote),
                exhaustCFM: mapStatus(fullService.workDetails?.exhaustCfm, fullService.workDetails?.exhaustCfmNote),
                lightEngine4Fans: mapStatus(fullService.workDetails?.lightEngineFans, fullService.workDetails?.lightEngineFansNote),
                cardCageFans: mapStatus(fullService.workDetails?.cardCageFans, fullService.workDetails?.cardCageFansNote),
                radiatorFan: mapStatus(fullService.workDetails?.radiatorFanPump, fullService.workDetails?.radiatorFanPumpNote),
                connectorHose: mapStatus(fullService.workDetails?.pumpConnectorHose, fullService.workDetails?.pumpConnectorHoseNote),
                securityLock: mapStatus(fullService.workDetails?.securityLampHouseLock, fullService.workDetails?.securityLampHouseLockNote),
            },
            lampLOC: mapStatus(fullService.workDetails?.lampLocMechanism, fullService.workDetails?.lampLocMechanismNote),
            lampMake: fullService.workDetails?.lampMakeModel || "",
            lampHours: fullService.workDetails?.lampTotalRunningHours?.toString() || "",
            currentLampHours: fullService.workDetails?.lampCurrentRunningHours?.toString() || "",
            voltageParams: {
                pvn: fullService.workDetails?.pvVsN || "",
                pve: fullService.workDetails?.pvVsE || "",
                nve: fullService.workDetails?.nvVsE || "",
            },
            flBefore: fullService.workDetails?.flLeft?.toString() || "",
            flAfter: fullService.workDetails?.flRight?.toString() || "",
            contentPlayer: fullService.workDetails?.contentPlayerModel || "",
            acStatus: fullService.workDetails?.acStatus || "",
            leStatus: {
                status: safe(fullService.workDetails?.leStatus),
                remarks: safe(fullService.workDetails?.leStatusNote),
            },
            remarks: fullService.remarks || "",
            leSerialNo: fullService.workDetails?.lightEngineSerialNumber || "",
            mcgdData: {
                white2K: {
                    fl: fullService.workDetails?.white2Kfl?.toString() || "",
                    x: fullService.workDetails?.white2Kx?.toString() || "",
                    y: fullService.workDetails?.white2Ky?.toString() || "",
                },
                white4K: {
                    fl: fullService.workDetails?.white4Kfl?.toString() || "",
                    x: fullService.workDetails?.white4Kx?.toString() || "",
                    y: fullService.workDetails?.white4Ky?.toString() || "",
                },
                red2K: {
                    fl: fullService.workDetails?.red2Kfl?.toString() || "",
                    x: fullService.workDetails?.red2Kx?.toString() || "",
                    y: fullService.workDetails?.red2Ky?.toString() || "",
                },
                red4K: {
                    fl: fullService.workDetails?.red4Kfl?.toString() || "",
                    x: fullService.workDetails?.red4Kx?.toString() || "",
                    y: fullService.workDetails?.red4Ky?.toString() || "",
                },
                green2K: {
                    fl: fullService.workDetails?.green2Kfl?.toString() || "",
                    x: fullService.workDetails?.green2Kx?.toString() || "",
                    y: fullService.workDetails?.green2Ky?.toString() || "",
                },
                green4K: {
                    fl: fullService.workDetails?.green4Kfl?.toString() || "",
                    x: fullService.workDetails?.green4Kx?.toString() || "",
                    y: fullService.workDetails?.green4Ky?.toString() || "",
                },
                blue2K: {
                    fl: fullService.workDetails?.blue2Kfl?.toString() || "",
                    x: fullService.workDetails?.blue2Kx?.toString() || "",
                    y: fullService.workDetails?.blue2Ky?.toString() || "",
                },
                blue4K: {
                    fl: fullService.workDetails?.blue4Kfl?.toString() || "",
                    x: fullService.workDetails?.blue4Kx?.toString() || "",
                    y: fullService.workDetails?.blue4Ky?.toString() || "",
                },
            },
            cieXyz2K: {
                x: fullService.workDetails?.BW_Step_10_2Kx?.toString() || "",
                y: fullService.workDetails?.BW_Step_10_2Ky?.toString() || "",
                fl: fullService.workDetails?.BW_Step_10_2Kfl?.toString() || "",
            },
            cieXyz4K: {
                x: fullService.workDetails?.BW_Step_10_4Kx?.toString() || "",
                y: fullService.workDetails?.BW_Step_10_4Ky?.toString() || "",
                fl: fullService.workDetails?.BW_Step_10_4Kfl?.toString() || "",
            },
            softwareVersion: fullService.workDetails?.softwareVersion || "",
            screenInfo: {
                scope: {
                    height: fullService.workDetails?.screenHeight?.toString() || "",
                    width: fullService.workDetails?.screenWidth?.toString() || "",
                    gain: fullService.workDetails?.screenGain?.toString() || "",
                },
                flat: {
                    height: fullService.workDetails?.flatHeight?.toString() || "",
                    width: fullService.workDetails?.flatWidth?.toString() || "",
                    gain: fullService.workDetails?.screenGain?.toString() || "",
                },
                make: fullService.workDetails?.screenMake || "",
            },
            throwDistance: fullService.workDetails?.throwDistance?.toString() || "",
            imageEvaluation: {
                focusBoresite: mapStatus(fullService.workDetails?.focusBoresight, fullService.workDetails?.focusBoresightNote),
                integratorPosition: mapStatus(fullService.workDetails?.integratorPosition, fullService.workDetails?.integratorPositionNote),
                spotOnScreen: mapStatus(fullService.workDetails?.spotsOnScreen, fullService.workDetails?.spotsOnScreenNote),
                screenCropping: mapStatus(fullService.workDetails?.screenCroppingOk, fullService.workDetails?.screenCroppingNote),
                convergence: mapStatus(fullService.workDetails?.convergenceOk, fullService.workDetails?.convergenceNote),
                channelsChecked: mapStatus(fullService.workDetails?.channelsCheckedOk, fullService.workDetails?.channelsCheckedNote),
                pixelDefects: mapStatus(fullService.workDetails?.pixelDefects, fullService.workDetails?.pixelDefectsNote),
                imageVibration: mapStatus(fullService.workDetails?.imageVibration, fullService.workDetails?.imageVibrationNote),
                liteLOC: mapStatus(fullService.workDetails?.liteloc, fullService.workDetails?.litelocNote),
            },
            airPollution: {
                airPollutionLevel: fullService.workDetails?.airPollutionLevel || "",
                hcho: fullService.workDetails?.hcho?.toString() || "",
                tvoc: fullService.workDetails?.tvoc?.toString() || "",
                pm10: fullService.workDetails?.pm10?.toString() || "",
                pm25: fullService.workDetails?.pm2_5?.toString() || "",
                pm100: fullService.workDetails?.pm1?.toString() || "",
                temperature: fullService.workDetails?.temperature?.toString() || "",
                humidity: fullService.workDetails?.humidity?.toString() || "",
            },
            recommendedParts: Array.isArray(fullService.workDetails?.recommendedParts)
                ? fullService.workDetails.recommendedParts.map((part: any) => ({
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
                if (fullService.workDetails?.photosDriveLink) {
                    return fullService.workDetails.photosDriveLink;
                }
                // Also check top-level photosDriveLink
                if (fullService.photosDriveLink) {
                    return fullService.photosDriveLink;
                }

                // Check if images arrays have any data
                const hasImages =
                    (Array.isArray(fullService.images) && fullService.images.length > 0) ||
                    (Array.isArray(fullService.afterImages) && fullService.afterImages.length > 0) ||
                    (Array.isArray(fullService.brokenImages) && fullService.brokenImages.length > 0);

                if (hasImages) {
                    // Generate link to images page with full domain
                    const imagesPath = `/share/service-images/${serviceId}`;
                    return `${baseUrl}${imagesPath}`;
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
