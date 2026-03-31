"use client"

import { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"
import { generateMaintenanceReport, convertServiceVisitToText, type MaintenanceReportData } from "@/components/PDFGenerator"

interface PdfPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceRecordId: string
}

export default function PdfPreviewDialog({ open, onOpenChange, serviceRecordId }: PdfPreviewDialogProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [serviceData, setServiceData] = useState<any>(null)

  const buildPdfPayloadFromService = useCallback((service: any): MaintenanceReportData => {
    const mapStatus = (value: string | undefined | null, note?: string | undefined | null) => {
      return {
        status: note ? note.toString() : "",
        yesNo: value ? value.toString() : "",
      }
    }

    return {
      cinemaName: service.cinemaName || service.site.name || "",
      date: service.date ? new Date(service.date).toLocaleDateString() : "",
      address: service.address || service.site.address || "",
      contactDetails: service.contactDetails || service.site.contactDetails || "",
      location: service.location || "",
      screenNo: service.screenNumber || service.site.screenNo || "",
      serviceVisit: service.engineerName ? `${service.engineerName} - ${convertServiceVisitToText(service.serviceNumber)}` : service.serviceNumber.toString(),
      projectorModel: service.projector.model,
      serialNo: service.projector.serialNo,
      runningHours: service.projectorRunningHours?.toString() || "",
      projectorEnvironment: service.workDetails?.projectorPlacementEnvironment || "",
      startTime: service.workDetails?.startTime,
      endTime: service.workDetails?.endTime,

      opticals: {
        reflector: mapStatus(service.workDetails?.reflector, service.workDetails?.reflectorNote),
        uvFilter: mapStatus(service.workDetails?.uvFilter, service.workDetails?.uvFilterNote),
        integratorRod: mapStatus(service.workDetails?.integratorRod, service.workDetails?.integratorRodNote),
        coldMirror: mapStatus(service.workDetails?.coldMirror, service.workDetails?.coldMirrorNote),
        foldMirror: mapStatus(service.workDetails?.foldMirror, service.workDetails?.foldMirrorNote),
      },

      electronics: {
        touchPanel: mapStatus(service.workDetails?.touchPanel, service.workDetails?.touchPanelNote),
        evbBoard: mapStatus(service.workDetails?.evbBoard, service.workDetails?.evbBoardNote),
        ImcbBoard: mapStatus(service.workDetails?.ImcbBoard, service.workDetails?.ImcbBoardNote),
        pibBoard: mapStatus(service.workDetails?.pibBoard, service.workDetails?.pibBoardNote),
        IcpBoard: mapStatus(service.workDetails?.IcpBoard, service.workDetails?.IcpBoardNote),
        imbSBoard: mapStatus(service.workDetails?.imbSBoard, service.workDetails?.imbSBoardNote),
      },

      serialVerified: mapStatus(service.workDetails?.serialNumberVerified, service.workDetails?.serialNumberVerifiedNote),
      AirIntakeLadRad: mapStatus(service.workDetails?.AirIntakeLadRad, service.workDetails?.AirIntakeLadRadNote),
      coolant: mapStatus(service.workDetails?.coolantLevelColor, service.workDetails?.coolantLevelColorNote),

      lightEngineTest: {
        white: mapStatus(service.workDetails?.lightEngineWhite, service.workDetails?.lightEngineWhiteNote),
        red: mapStatus(service.workDetails?.lightEngineRed, service.workDetails?.lightEngineRedNote),
        green: mapStatus(service.workDetails?.lightEngineGreen, service.workDetails?.lightEngineGreenNote),
        blue: mapStatus(service.workDetails?.lightEngineBlue, service.workDetails?.lightEngineBlueNote),
        black: mapStatus(service.workDetails?.lightEngineBlack, service.workDetails?.lightEngineBlackNote),
      },

      mechanical: {
        acBlower: mapStatus(service.workDetails?.acBlowerVane, service.workDetails?.acBlowerVaneNote),
        extractor: mapStatus(service.workDetails?.extractorVane, service.workDetails?.extractorVaneNote),
        exhaustCFM: mapStatus(service.workDetails?.exhaustCfm, service.workDetails?.exhaustCfmNote),
        lightEngine4Fans: mapStatus(service.workDetails?.lightEngineFans, service.workDetails?.lightEngineFansNote),
        cardCageFans: mapStatus(service.workDetails?.cardCageFans, service.workDetails?.cardCageFansNote),
        radiatorFan: mapStatus(service.workDetails?.radiatorFanPump, service.workDetails?.radiatorFanPumpNote),
        connectorHose: mapStatus(service.workDetails?.pumpConnectorHose, service.workDetails?.pumpConnectorHoseNote),
        securityLock: mapStatus(service.workDetails?.securityLampHouseLock, service.workDetails?.securityLampHouseLockNote),
      },

      lampLOC: mapStatus(service.workDetails?.lampLocMechanism, service.workDetails?.lampLocMechanismNote),

      lampMake: service.workDetails?.lampMakeModel || "",
      lampHours: service.workDetails?.lampTotalRunningHours?.toString() || "",
      currentLampHours: service.workDetails?.lampCurrentRunningHours?.toString() || "",

      voltageParams: {
        pvn: service.workDetails?.pvVsN || "",
        pve: service.workDetails?.pvVsE || "",
        nve: service.workDetails?.nvVsE || "",
      },

      flBefore: service.workDetails?.flLeft?.toString() || "",
      flAfter: service.workDetails?.flRight?.toString() || "",

      contentPlayer: service.workDetails?.contentPlayerModel || "",
      acStatus: service.workDetails?.acStatus || "",
      leStatus: service.workDetails?.leStatus || "",
      remarks: service.remarks || "",
      leSerialNo: service.workDetails?.lightEngineSerialNumber || "",

      mcgdData: {
        white2K: {
          fl: service.workDetails?.white2Kfl?.toString() || "",
          x: service.workDetails?.white2Kx?.toString() || "",
          y: service.workDetails?.white2Ky?.toString() || "",
        },
        white4K: {
          fl: service.workDetails?.white4Kfl?.toString() || "",
          x: service.workDetails?.white4Kx?.toString() || "",
          y: service.workDetails?.white4Ky?.toString() || "",
        },
        red2K: {
          fl: service.workDetails?.red2Kfl?.toString() || "",
          x: service.workDetails?.red2Kx?.toString() || "",
          y: service.workDetails?.red2Ky?.toString() || "",
        },
        red4K: {
          fl: service.workDetails?.red4Kfl?.toString() || "",
          x: service.workDetails?.red4Kx?.toString() || "",
          y: service.workDetails?.red4Ky?.toString() || "",
        },
        green2K: {
          fl: service.workDetails?.green2Kfl?.toString() || "",
          x: service.workDetails?.green2Kx?.toString() || "",
          y: service.workDetails?.green2Ky?.toString() || "",
        },
        green4K: {
          fl: service.workDetails?.green4Kfl?.toString() || "",
          x: service.workDetails?.green4Kx?.toString() || "",
          y: service.workDetails?.green4Ky?.toString() || "",
        },
        blue2K: {
          fl: service.workDetails?.blue2Kfl?.toString() || "",
          x: service.workDetails?.blue2Kx?.toString() || "",
          y: service.workDetails?.blue2Ky?.toString() || "",
        },
        blue4K: {
          fl: service.workDetails?.blue4Kfl?.toString() || "",
          x: service.workDetails?.blue4Kx?.toString() || "",
          y: service.workDetails?.blue4Ky?.toString() || "",
        },
      },

      cieXyz2K: {
        x: service.workDetails?.BW_Step_10_2Kx?.toString() || "",
        y: service.workDetails?.BW_Step_10_2Ky?.toString() || "",
        fl: service.workDetails?.BW_Step_10_2Kfl?.toString() || "",
      },
      cieXyz4K: {
        x: service.workDetails?.BW_Step_10_4Kx?.toString() || "",
        y: service.workDetails?.BW_Step_10_4Ky?.toString() || "",
        fl: service.workDetails?.BW_Step_10_4Kfl?.toString() || "",
      },

      softwareVersion: service.workDetails?.softwareVersion || "",

      screenInfo: {
        scope: {
          height: service.workDetails?.screenHeight?.toString() || "",
          width: service.workDetails?.screenWidth?.toString() || "",
          gain: service.workDetails?.screenGain?.toString() || "",
        },
        flat: {
          height: service.workDetails?.flatHeight?.toString() || "",
          width: service.workDetails?.flatWidth?.toString() || "",
          gain: service.workDetails?.screenGain?.toString() || "",
        },
        make: service.workDetails?.screenMake || "",
      },

      throwDistance: service.workDetails?.throwDistance?.toString() || "",

      imageEvaluation: {
        focusBoresite: mapStatus(service.workDetails?.focusBoresight, service.workDetails?.focusBoresightNote),
        integratorPosition: mapStatus(service.workDetails?.integratorPosition, service.workDetails?.integratorPositionNote),
        spotOnScreen: mapStatus(service.workDetails?.spotsOnScreen, service.workDetails?.spotsOnScreenNote),
        screenCropping: mapStatus(service.workDetails?.screenCroppingOk, service.workDetails?.screenCroppingNote),
        convergence: mapStatus(service.workDetails?.convergenceOk, service.workDetails?.convergenceNote),
        channelsChecked: mapStatus(service.workDetails?.channelsCheckedOk, service.workDetails?.channelsCheckedNote),
        pixelDefects: mapStatus(service.workDetails?.pixelDefects, service.workDetails?.pixelDefectsNote),
        imageVibration: mapStatus(service.workDetails?.imageVibration, service.workDetails?.imageVibrationNote),
        liteLOC: mapStatus(service.workDetails?.liteloc, service.workDetails?.litelocNote),
      },

      airPollution: {
        airPollutionLevel: service.workDetails?.airPollutionLevel || "",
        hcho: service.workDetails?.hcho?.toString() || "",
        tvoc: service.workDetails?.tvoc?.toString() || "",
        pm10: service.workDetails?.pm10?.toString() || "",
        pm25: service.workDetails?.pm2_5?.toString() || "",
        pm100: service.workDetails?.pm1?.toString() || "",
        temperature: service.workDetails?.temperature?.toString() || "",
        humidity: service.workDetails?.humidity?.toString() || "",
      },

      recommendedParts: Array.isArray(service.workDetails?.recommendedParts)
        ? service.workDetails.recommendedParts.map((part: any) => ({
          partNumber: part.partNumber || part.part_number || "",
          name: part.name || part.description || "",
        }))
        : [],
      isDraft: service.verificationStatus !== "VERIFIED",
      engineerSignatureUrl: service.signatures?.engineer || (service.signatures as any)?.engineerSignatureUrl || "",
      siteSignatureUrl: service.signatures?.site || (service.signatures as any)?.siteSignatureUrl || "",
      imagesLink: (() => {
        // First check if photosDriveLink exists
        if (service.workDetails?.photosDriveLink) {
          return service.workDetails.photosDriveLink;
        }

        // Check if images arrays have any data
        const hasImages =
          (Array.isArray(service.images) && service.images.length > 0) ||
          (Array.isArray(service.afterImages) && service.afterImages.length > 0) ||
          (Array.isArray(service.brokenImages) && service.brokenImages.length > 0);

        if (hasImages) {
          // Generate link to images page with full domain from CORS_ORIGIN or window.location.origin
          if (typeof window !== 'undefined') {
            // Try to use CORS_ORIGIN from environment (via public env var) or fallback to window.location.origin
            const baseUrl = (process.env.NEXT_PUBLIC_CORS_ORIGIN as string) || window.location.origin;
            return `${baseUrl}/share/service-images/${service.id}`;
          }
          // Fallback for SSR - use relative URL (will be fixed by PDF viewer context)
          return `/share/service-images/${service.id}`;
        }

        return undefined;
      })(),
    }
  }, [])

  const generatePreview = useCallback(async () => {
    if (!serviceRecordId) return

    setIsGenerating(true)
    setError(null)

    try {
      // Fetch full service record
      const response = await fetch(`/api/admin/service-records/${serviceRecordId}`)
      if (!response.ok) {
        throw new Error("Failed to fetch service record")
      }
      const { service } = await response.json()
      setServiceData(service)

      // Build PDF payload
      const pdfData = buildPdfPayloadFromService(service)

      console.log("pdfData", pdfData);
      console.log("pdfData.imagesLink", pdfData.imagesLink);

      // Generate PDF
      const pdfBytes = await generateMaintenanceReport(pdfData)
      const blob = new Blob([pdfBytes as any], { type: "application/pdf" })
      setPdfBlob(blob)

      // Create preview URL
      const url = URL.createObjectURL(blob)
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return url
      })
    } catch (err) {
      console.error("Error generating PDF preview:", err)
      setError("Failed to generate PDF preview. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }, [serviceRecordId, buildPdfPayloadFromService])

  useEffect(() => {
    if (open && serviceRecordId) {
      generatePreview()
    }

    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
      }
    }
  }, [open, serviceRecordId])

  const handleDownload = () => {
    if (!pdfBlob) return

    const url = URL.createObjectURL(pdfBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${serviceData?.projector?.serialNo || serviceData?.projectorSerial || 'Service_Report'}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0" showCloseButton={true}>
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle>Service Report Preview</DialogTitle>
            <Button onClick={handleDownload} disabled={!pdfBlob || isGenerating} size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-hidden p-6">
          {isGenerating ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Generating PDF preview...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          ) : previewUrl ? (
            <iframe
              title="Service Report Preview"
              src={previewUrl}
              className="w-full h-full rounded border border-border"
            />
          ) : (
            <div className="flex items-center justify-center h-full border border-dashed border-border rounded">
              <p className="text-sm text-muted-foreground">PDF preview will appear here.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

