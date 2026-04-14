import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ serviceRecordId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { serviceRecordId } = await context.params

    const service = await prisma.serviceRecord.findUnique({
      where: { id: serviceRecordId },
      include: {
        assignedTo: {
          select: {
            name: true,
          },
        },
        site: {
          select: {
            id: true,
            siteName: true,
            siteCode: true,
            address: true,
            contactDetails: true,
          },
        },
        projector: {
          select: {
            id: true,
            modelNo: true,
            serialNo: true,
          },
        },
      },
    })

    if (!service) {
      return NextResponse.json({ error: "Service record not found" }, { status: 404 })
    }

    // Build the same shape as /api/user/services/completed for reuse on the frontend
    const formattedService = {
      id: service.id,
      engineerName: service.assignedTo?.name,
      serviceNumber: service.serviceNumber,
      site: {
        id: service.site.id,
        name: service.site.siteName,
        siteCode: service.site.siteCode,
        address: service.site.address,
        contactDetails: service.site.contactDetails,
        screenNo: service.screenNumber,
      },
      projector: {
        id: service.projector.id,
        model: service.projector.modelNo,
        serialNo: service.projector.serialNo,
        runningHours: service.projectorRunningHours,
      },
      date: service.date?.toISOString() || null,
      completedAt: service.endTime?.toISOString() || service.createdAt.toISOString(),
      cinemaName: service.cinemaName,
      address: service.address,
      location: service.location,
      screenNumber: service.screenNumber,
      contactDetails: service.contactDetails,
      projectorRunningHours: service.projectorRunningHours,
      remarks: service.remarks,
      images: service.images || [],
      afterImages: service.afterImages || [],
      brokenImages: service.brokenImages || [],
      logs: (service as any).logs || '',
      signatures: service.signatures,
      reportGenerated: service.reportGenerated,
      reportUrl: service.reportUrl,
      workDetails: {
        reflector: service.reflector,
        reflectorNote: service.reflectorNote,
        uvFilter: service.uvFilter,
        uvFilterNote: service.uvFilterNote,
        integratorRod: service.integratorRod,
        integratorRodNote: service.integratorRodNote,
        coldMirror: service.coldMirror,
        coldMirrorNote: service.coldMirrorNote,
        foldMirror: service.foldMirror,
        foldMirrorNote: service.foldMirrorNote,
        touchPanel: service.touchPanel,
        touchPanelNote: service.touchPanelNote,
        evbBoard: service.evbBoard,
        evbBoardNote: service.evbBoardNote,
        ImcbBoard: service.ImcbBoard,
        ImcbBoardNote: service.ImcbBoardNote,
        pibBoard: service.pibBoard,
        pibBoardNote: service.pibBoardNote,
        IcpBoard: service.IcpBoard,
        IcpBoardNote: service.IcpBoardNote,
        imbSBoard: service.imbSBoard,
        imbSBoardNote: service.imbSBoardNote,
        serialNumberVerified: service.serialNumberVerified,
        serialNumberVerifiedNote: service.serialNumberVerifiedNote,
        AirIntakeLadRad: service.AirIntakeLadRad,
        AirIntakeLadRadNote: service.AirIntakeLadRadNote,
        coolantLevelColor: service.coolantLevelColor,
        coolantLevelColorNote: service.coolantLevelColorNote,
        lightEngineWhite: service.lightEngineWhite,
        lightEngineWhiteNote: service.lightEngineWhiteNote,
        lightEngineRed: service.lightEngineRed,
        lightEngineRedNote: service.lightEngineRedNote,
        lightEngineGreen: service.lightEngineGreen,
        lightEngineGreenNote: service.lightEngineGreenNote,
        lightEngineBlue: service.lightEngineBlue,
        lightEngineBlueNote: service.lightEngineBlueNote,
        lightEngineBlack: service.lightEngineBlack,
        lightEngineBlackNote: service.lightEngineBlackNote,
        acBlowerVane: service.acBlowerVane,
        acBlowerVaneNote: service.acBlowerVaneNote,
        extractorVane: service.extractorVane,
        extractorVaneNote: service.extractorVaneNote,
        exhaustCfm: service.exhaustCfm,
        exhaustCfmNote: service.exhaustCfmNote,
        lightEngineFans: service.lightEngineFans,
        lightEngineFansNote: service.lightEngineFansNote,
        cardCageFans: service.cardCageFans,
        cardCageFansNote: service.cardCageFansNote,
        radiatorFanPump: service.radiatorFanPump,
        radiatorFanPumpNote: service.radiatorFanPumpNote,
        pumpConnectorHose: service.pumpConnectorHose,
        pumpConnectorHoseNote: service.pumpConnectorHoseNote,
        securityLampHouseLock: service.securityLampHouseLock,
        securityLampHouseLockNote: service.securityLampHouseLockNote,
        lampLocMechanism: service.lampLocMechanism,
        lampLocMechanismNote: service.lampLocMechanismNote,
        projectorPlacementEnvironment: service.projectorPlacementEnvironment,
        softwareVersion: service.softwareVersion,
        screenHeight: service.screenHeight,
        screenWidth: service.screenWidth,
        flatHeight: service.flatHeight,
        flatWidth: service.flatWidth,
        screenGain: service.screenGain,
        screenMake: service.screenMake,
        throwDistance: service.throwDistance,
        lampMakeModel: service.lampMakeModel,
        lampTotalRunningHours: service.lampTotalRunningHours,
        lampCurrentRunningHours: service.lampCurrentRunningHours,
        pvVsN: service.pvVsN,
        pvVsE: service.pvVsE,
        nvVsE: service.nvVsE,
        flLeft: service.flLeft,
        flRight: service.flRight,
        contentPlayerModel: service.contentPlayerModel,
        acStatus: service.acStatus,
        leStatus: service.leStatus,
        lightEngineSerialNumber: service.lightEngineSerialNumber,
        white2Kx: service.white2Kx,
        white2Ky: service.white2Ky,
        white2Kfl: service.white2Kfl,
        white4Kx: service.white4Kx,
        white4Ky: service.white4Ky,
        white4Kfl: service.white4Kfl,
        red2Kx: service.red2Kx,
        red2Ky: service.red2Ky,
        red2Kfl: service.red2Kfl,
        red4Kx: service.red4Kx,
        red4Ky: service.red4Ky,
        red4Kfl: service.red4Kfl,
        green2Kx: service.green2Kx,
        green2Ky: service.green2Ky,
        green2Kfl: service.green2Kfl,
        green4Kx: service.green4Kx,
        green4Ky: service.green4Ky,
        green4Kfl: service.green4Kfl,
        blue2Kx: service.blue2Kx,
        blue2Ky: service.blue2Ky,
        blue2Kfl: service.blue2Kfl,
        blue4Kx: service.blue4Kx,
        blue4Ky: service.blue4Ky,
        blue4Kfl: service.blue4Kfl,
        BW_Step_10_2Kx: service.BW_Step_10_2Kx,
        BW_Step_10_2Ky: service.BW_Step_10_2Ky,
        BW_Step_10_2Kfl: service.BW_Step_10_2Kfl,
        BW_Step_10_4Kx: service.BW_Step_10_4Kx,
        BW_Step_10_4Ky: service.BW_Step_10_4Ky,
        BW_Step_10_4Kfl: service.BW_Step_10_4Kfl,
        focusBoresight: service.focusBoresight,
        integratorPosition: service.integratorPosition,
        spotsOnScreen: service.spotsOnScreen,
        screenCroppingOk: service.screenCropping,
        convergenceOk: service.convergence,
        channelsCheckedOk: service.channelsChecked,
        pixelDefects: service.pixelDefects,
        imageVibration: service.imageVibration,
        liteloc: service.liteloc,
        airPollutionLevel: service.airPollutionLevel,
        hcho: service.hcho,
        tvoc: service.tvoc,
        pm1: service.pm1,
        pm2_5: service.pm2_5,
        pm10: service.pm10,
        temperature: service.temperature,
        humidity: service.humidity,
        startTime: service.startTime?.toISOString() || null,
        endTime: service.endTime?.toISOString() || null,
        replacementRequired: (service as any).replacementRequired ?? null,
        photosDriveLink: service.photosDriveLink,
        recommendedParts: service.recommendedParts,
      },
    }

    return NextResponse.json({ service: formattedService })
  } catch (error) {
    console.error("Error fetching admin service record:", error)
    return NextResponse.json({ error: "Failed to fetch service record" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ serviceRecordId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { serviceRecordId } = await context.params
    const body = await request.json()
    const { workDetails, signatures, images, afterImages, brokenImages, logs } = body

    // Verify the service record exists
    const serviceRecord = await prisma.serviceRecord.findUnique({
      where: { id: serviceRecordId },
    })

    if (!serviceRecord) {
      return NextResponse.json({ error: "Service record not found" }, { status: 404 })
    }

    // Helper to convert value to proper type (same as in complete route)
    const convertValue = (key: string, value: any): any => {
      if (value === undefined || value === null || value === "") {
        return undefined
      }

      const floatFields = [
        'screenHeight', 'screenWidth', 'flatHeight', 'flatWidth', 'screenGain', 'throwDistance',
        'flLeft', 'flRight',
        'white2Kx', 'white2Ky', 'white2Kfl', 'white4Kx', 'white4Ky', 'white4Kfl',
        'red2Kx', 'red2Ky', 'red2Kfl', 'red4Kx', 'red4Ky', 'red4Kfl',
        'green2Kx', 'green2Ky', 'green2Kfl', 'green4Kx', 'green4Ky', 'green4Kfl',
        'blue2Kx', 'blue2Ky', 'blue2Kfl', 'blue4Kx', 'blue4Ky', 'blue4Kfl',
        'hcho', 'tvoc', 'pm1', 'pm2_5', 'pm10',
        'temperature', 'humidity'
      ]
      if (floatFields.includes(key)) {
        if (value === null || value === '' || value === undefined) return undefined
        const num = parseFloat(value)
        return isNaN(num) || !isFinite(num) ? undefined : num
      }

      const intFields = [
        'projectorRunningHours', 'lampTotalRunningHours', 'lampCurrentRunningHours'
      ]
      if (intFields.includes(key)) {
        if (value === null || value === '' || value === undefined) return undefined
        const num = parseInt(value, 10)
        return isNaN(num) || !isFinite(num) ? undefined : num
      }

      const boolFields = [
        'reportGenerated', 'replacementRequired'
      ]
      if (boolFields.includes(key)) {
        if (typeof value === 'boolean') return value
        if (typeof value === 'string') {
          const lower = value.toLowerCase()
          return lower === 'true' || lower === 'yes' || lower === '1'
        }
        return Boolean(value)
      }

      if (key === 'date' && value) {
        const date = new Date(value)
        return isNaN(date.getTime()) ? undefined : date
      }

      if ((key === 'startTime' || key === 'endTime') && value) {
        const date = new Date(value)
        return isNaN(date.getTime()) ? undefined : date
      }

      const strValue = String(value)
      return strValue.trim() === '' ? null : strValue
    }

    const validSchemaFields = new Set([
      'reportGenerated', 'endTime', 'startTime',
      'cinemaName', 'address', 'contactDetails', 'location', 'screenNumber',
      'projectorRunningHours', 'replacementRequired',
      'reflector', 'uvFilter', 'integratorRod', 'coldMirror', 'foldMirror',
      'touchPanel', 'evbBoard', 'ImcbBoard', 'pibBoard', 'IcpBoard', 'imbSBoard',
      'serialNumberVerified', 'AirIntakeLadRad', 'coolantLevelColor',
      'lightEngineWhite', 'lightEngineRed', 'lightEngineGreen', 'lightEngineBlue', 'lightEngineBlack',
      'acBlowerVane', 'extractorVane', 'exhaustCfm', 'lightEngineFans', 'cardCageFans',
      'radiatorFanPump', 'pumpConnectorHose', 'securityLampHouseLock', 'lampLocMechanism',
      'projectorPlacementEnvironment', 'softwareVersion',
      'screenHeight', 'screenWidth', 'flatHeight', 'flatWidth', 'screenGain', 'screenMake', 'throwDistance',
      'lampMakeModel', 'lampTotalRunningHours', 'lampCurrentRunningHours',
      'pvVsN', 'pvVsE', 'nvVsE', 'flLeft', 'flRight',
      'contentPlayerModel', 'acStatus', 'leStatus',
      'white2Kx', 'white2Ky', 'white2Kfl', 'white4Kx', 'white4Ky', 'white4Kfl',
      'red2Kx', 'red2Ky', 'red2Kfl', 'red4Kx', 'red4Ky', 'red4Kfl',
      'green2Kx', 'green2Ky', 'green2Kfl', 'green4Kx', 'green4Ky', 'green4Kfl',
      'blue2Kx', 'blue2Ky', 'blue2Kfl', 'blue4Kx', 'blue4Ky', 'blue4Kfl',
      'BW_Step_10_2Kx', 'BW_Step_10_2Ky', 'BW_Step_10_2Kfl',
      'BW_Step_10_4Kx', 'BW_Step_10_4Ky', 'BW_Step_10_4Kfl',
      'focusBoresight', 'integratorPosition', 'spotsOnScreen', 'screenCropping', 'airPollutionLevel',
      'convergence', 'channelsChecked', 'pixelDefects', 'imageVibration', 'liteloc',
      'hcho', 'tvoc', 'pm1', 'pm2_5', 'pm10', 'temperature', 'humidity',
      'remarks', 'lightEngineSerialNumber', 'signatures', 'recommendedParts',
      'images', 'afterImages', 'brokenImages', 'logs', 'reportUrl', 'photosDriveLink',
      'reflectorNote', 'uvFilterNote', 'integratorRodNote', 'coldMirrorNote', 'foldMirrorNote',
      'touchPanelNote', 'evbBoardNote', 'ImcbBoardNote', 'pibBoardNote', 'IcpBoardNote', 'imbSBoardNote',
      'serialNumberVerifiedNote', 'AirIntakeLadRadNote', 'coolantLevelColorNote',
      'lightEngineWhiteNote', 'lightEngineRedNote', 'lightEngineGreenNote', 'lightEngineBlueNote', 'lightEngineBlackNote',
      'acBlowerVaneNote', 'extractorVaneNote', 'exhaustCfmNote',
      'lightEngineFansNote', 'cardCageFansNote', 'radiatorFanPumpNote', 'pumpConnectorHoseNote', 'lampLocMechanismNote',
      'securityLampHouseLockNote'
    ])

    // Status fields that should NEVER contain note-like patterns
    const statusFields = new Set([
      'reflector', 'uvFilter', 'integratorRod', 'coldMirror', 'foldMirror',
      'touchPanel', 'evbBoard', 'ImcbBoard', 'pibBoard', 'IcpBoard', 'imbSBoard',
      'serialNumberVerified', 'AirIntakeLadRad', 'coolantLevelColor',
      'lightEngineWhite', 'lightEngineRed', 'lightEngineGreen', 'lightEngineBlue', 'lightEngineBlack',
      'acBlowerVane', 'extractorVane', 'lightEngineFans', 'cardCageFans',
      'radiatorFanPump', 'pumpConnectorHose', 'securityLampHouseLock', 'lampLocMechanism',
      'focusBoresight', 'integratorPosition', 'spotsOnScreen',
      'screenCropping', 'convergence', 'channelsChecked',
      'pixelDefects', 'imageVibration', 'liteloc', 'leStatus', 'acStatus'
    ])

    // Known valid status values (the part before any " - ")
    const validStatusPrefixes = [
      'OK', 'YES', 'Concern', 'Working', 'Not Working', 'Not Available',
      'Removed', 'Not removed', 'OK (Part is Ok)', 'YES (Needs Replacement)'
    ]

    // Sanitize status field value - removes any note-like patterns
    const sanitizeStatusValue = (value: string): string => {
      if (!value || typeof value !== 'string') return value

      const separatorIndex = value.indexOf(' - ')
      if (separatorIndex === -1) return value

      const statusPart = value.substring(0, separatorIndex).trim()
      const isValidStatus = validStatusPrefixes.some(prefix =>
        statusPart === prefix || statusPart.startsWith(prefix)
      )

      if (isValidStatus) {
        return statusPart
      }

      return value
    }

    const readonlyFields = new Set([
      'id', 'createdAt', 'updatedAt', 'userId', 'projectorId', 'siteId', 'serviceNumber', 'assignedToId', 'date'
    ])

    const updateData: any = {}

    // Handle recommendedParts as JSON
    if (workDetails?.recommendedParts) {
      const recommendedParts = workDetails.recommendedParts
      if (Array.isArray(recommendedParts) && recommendedParts.length > 0) {
        updateData.recommendedParts = recommendedParts
      } else if (!Array.isArray(recommendedParts) && recommendedParts && typeof recommendedParts === 'object') {
        updateData.recommendedParts = recommendedParts
      }
    }

    // Sanitize all status fields before processing.
    // IMPORTANT: Some historical records stored note text inside the status field,
    // e.g. "YES - Chipped - corner broken". If we simply strip after " - " we would
    // permanently lose the note. So we migrate the suffix into the corresponding
    // "<field>Note" column when possible.
    if (workDetails) {
      statusFields.forEach((field) => {
        const raw = workDetails[field]
        if (!raw || typeof raw !== "string") return

        const separatorIndex = raw.indexOf(" - ")
        if (separatorIndex === -1) return

        const statusPart = raw.substring(0, separatorIndex).trim()
        const suffix = raw.substring(separatorIndex + 3).trim()
        const isValidStatus = validStatusPrefixes.some(
          (prefix) => statusPart === prefix || statusPart.startsWith(prefix),
        )

        if (!isValidStatus) return

        // Move suffix into note field if the schema supports it and it's currently empty.
        const noteKey = `${field}Note`
        if (
          suffix &&
          validSchemaFields.has(noteKey) &&
          (!workDetails[noteKey] || String(workDetails[noteKey]).trim() === "")
        ) {
          workDetails[noteKey] = suffix
        }

        workDetails[field] = statusPart
      })
    }

    // Add work details with proper type conversion
    if (workDetails) {
      Object.keys(workDetails).forEach((key) => {
        if (readonlyFields.has(key) || !validSchemaFields.has(key)) return
        if (key === 'recommendedParts') return

        const converted = convertValue(key, workDetails[key])
        if (converted !== undefined) {
          updateData[key] = converted
        }
      })
    }

    // Add signatures
    if (signatures) {
      const engineerSig = signatures.engineer || signatures.engineerSignatureUrl || null
      const siteSig = signatures.site || signatures.siteSignatureUrl || null
      if (engineerSig || siteSig) {
        updateData.signatures = {
          engineer: engineerSig,
          site: siteSig,
        }
      }
    }

    // Add images
    if (images !== undefined) {
      if (Array.isArray(images) && images.length > 0) {
        updateData.images = images.map((img: any) => {
          if (typeof img === 'string') return img
          if (img && typeof img === 'object') return img.url || img
          return null
        }).filter((url): url is string => Boolean(url) && typeof url === 'string')
      } else {
        updateData.images = []
      }
    }

    if (afterImages !== undefined) {
      if (Array.isArray(afterImages) && afterImages.length > 0) {
        updateData.afterImages = afterImages.map((img: any) => {
          if (typeof img === 'string') return img
          if (img && typeof img === 'object') return img.url || img
          return null
        }).filter((url): url is string => Boolean(url) && typeof url === 'string')
      } else {
        updateData.afterImages = []
      }
    }

    if (brokenImages !== undefined) {
      if (Array.isArray(brokenImages) && brokenImages.length > 0) {
        updateData.brokenImages = brokenImages.map((img: any) => {
          if (typeof img === 'string') return img
          if (img && typeof img === 'object') return img.url || img
          return null
        }).filter((url): url is string => Boolean(url) && typeof url === 'string')
      } else {
        updateData.brokenImages = []
      }
    }

    if (logs !== undefined) {
      updateData.logs = logs || null
    }

    // Clean up undefined values
    const cleanedData: any = {}
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] !== undefined && validSchemaFields.has(key)) {
        const value = updateData[key]

        if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
          return
        }

        const boolFields = [
          'reportGenerated', 'replacementRequired'
        ]
        if (boolFields.includes(key)) {
          if (typeof value === 'string') {
            const lower = value.toLowerCase()
            cleanedData[key] = lower === 'true' || lower === 'yes' || lower === '1'
          } else {
            cleanedData[key] = Boolean(value)
          }
          return
        }

        if (value === '' && key !== 'images' && key !== 'afterImages' && key !== 'brokenImages') {
          cleanedData[key] = null
        } else {
          cleanedData[key] = value
        }
      }
    })

    // Update the service record
    const updatedRecord = await prisma.serviceRecord.update({
      where: { id: serviceRecordId },
      data: cleanedData,
    })

    return NextResponse.json({
      success: true,
      serviceRecord: {
        id: updatedRecord.id,
      },
    })
  } catch (error) {
    console.error("Error updating service record:", error)
    return NextResponse.json({ error: "Failed to update service record" }, { status: 500 })
  }
}


