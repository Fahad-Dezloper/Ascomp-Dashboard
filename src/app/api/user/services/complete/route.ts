import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { auth } from "@/lib/auth"
import { buildLaserRecordData } from "@/lib/laser-service-record"
import { getLaserProjectorModels } from "@/lib/get-laser-models"
import { isLaserProjectorModel } from "@/lib/laser-projector-models"

export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user from cookies using better-auth
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const body = await request.json()
    const { serviceRecordId, workDetails, signatures, images, brokenImages, afterImages, logs } = body

    if (!serviceRecordId) {
      return NextResponse.json({ error: "Service record ID is required" }, { status: 400 })
    }

    // Verify the service record exists and is assigned to this user
    const serviceRecord = await prisma.serviceRecord.findUnique({
      where: { id: serviceRecordId },
      include: { projector: { select: { modelNo: true } } },
    })

    if (!serviceRecord) {
      return NextResponse.json({ error: "Service record not found" }, { status: 404 })
    }

    if (serviceRecord.assignedToId !== userId) {
      return NextResponse.json({ error: "Unauthorized: Service not assigned to you" }, { status: 403 })
    }

    // Prepare update data
    const updateData: any = {
      date: new Date(),
      reportGenerated: true,
      endTime: new Date(),
      // Set reportSubmittedAt only on the first submission (lock the 10-min edit window start)
      ...((serviceRecord as any).reportSubmittedAt == null ? { reportSubmittedAt: new Date() } : {}),
    }

    // Helper to convert value to proper type
    const convertValue = (key: string, value: any): any => {
      if (value === undefined || value === null || value === "") {
        return undefined
      }

      // Float fields
      // Note: airPollutionLevel is stored as a string in Prisma schema, so we intentionally
      // do NOT include it here to avoid converting textual levels (e.g. "GOOD") to numbers.
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

      // Integer fields
      const intFields = [
        'projectorRunningHours', 'lampTotalRunningHours', 'lampCurrentRunningHours'
      ]
      if (intFields.includes(key)) {
        if (value === null || value === '' || value === undefined) return undefined
        const num = parseInt(value, 10)
        return isNaN(num) || !isFinite(num) ? undefined : num
      }

      // Boolean fields
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

      // Date fields
      if (key === 'date' && value) {
        const date = new Date(value)
        return isNaN(date.getTime()) ? undefined : date
      }

      if ((key === 'startTime' || key === 'endTime') && value) {
        const date = new Date(value)
        return isNaN(date.getTime()) ? undefined : date
      }

      // String fields - convert to string, but handle empty strings
      const strValue = String(value)
      return strValue.trim() === '' ? null : strValue
    }

    // Valid fields from Prisma schema (whitelist approach)
    const validSchemaFields = new Set([
      'date', 'reportGenerated', 'endTime', 'startTime',
      'cinemaName', 'address', 'contactDetails', 'location', 'screenNumber',
      'serviceNumber',
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
      'focusBoresight', 'integratorPosition', 'spotsOnScreen',
      'screenCropping', 'convergence', 'channelsChecked', // Corrected from Ok
      'airPollutionLevel',
      'pixelDefects', 'imageVibration', 'liteloc',
      'hcho', 'tvoc', 'pm1', 'pm2_5', 'pm10', 'temperature', 'humidity',
      'remarks', 'lightEngineSerialNumber', 'signatures', 'recommendedParts',
      'images', 'brokenImages', 'afterImages', 'reportUrl', 'photosDriveLink', 'logs',
      // Note fields
      'reflectorNote', 'uvFilterNote', 'integratorRodNote', 'coldMirrorNote', 'foldMirrorNote',
      'touchPanelNote', 'evbBoardNote', 'ImcbBoardNote', 'pibBoardNote', 'IcpBoardNote', 'imbSBoardNote',
      'serialNumberVerifiedNote', 'AirIntakeLadRadNote', 'coolantLevelColorNote',
      'lightEngineWhiteNote', 'lightEngineRedNote', 'lightEngineGreenNote', 'lightEngineBlueNote', 'lightEngineBlackNote',
      'acBlowerVaneNote', 'extractorVaneNote', 'exhaustCfmNote',
      'lightEngineFansNote', 'cardCageFansNote', 'radiatorFanPumpNote', 'pumpConnectorHoseNote', 'lampLocMechanismNote',
      'securityLampHouseLockNote', 'leStatusNote',
      'focusBoresightNote', 'integratorPositionNote', 'spotsOnScreenNote',
      'screenCroppingNote', 'convergenceNote', 'channelsCheckedNote',
      'pixelDefectsNote', 'imageVibrationNote', 'litelocNote'
    ])

    if (workDetails) {
      if (workDetails.screenCroppingOk !== undefined) workDetails.screenCropping = workDetails.screenCroppingOk
      if (workDetails.screenCroppingOkNote !== undefined) workDetails.screenCroppingNote = workDetails.screenCroppingOkNote

      if (workDetails.convergenceOk !== undefined) workDetails.convergence = workDetails.convergenceOk
      if (workDetails.convergenceOkNote !== undefined) workDetails.convergenceNote = workDetails.convergenceOkNote

      if (workDetails.channelsCheckedOk !== undefined) workDetails.channelsChecked = workDetails.channelsCheckedOk
      if (workDetails.channelsCheckedOkNote !== undefined) workDetails.channelsCheckedNote = workDetails.channelsCheckedOkNote

      // Note: Status fields may contain sub-option values in "STATUS - SubOption" format
      // (e.g., "YES - Solarized"). Do not sanitize these as the sub-option data is intentional.
    }

    // Ensure `serviceNumber` stays unique per projector.
    // Apply suffixing for text-based service types that can repeat ("special service", "installation").
    // e.g. second "installation" for the same projector is saved as "installation 2", etc.
    const normalizeSpacesLower = (s: unknown) =>
      String(s ?? "")
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase()

    const requestedServiceNumberRaw =
      workDetails?.serviceNumber ?? workDetails?.serviceVisitType

    const DEDUPLICATED_BASES = ["special service", "installation"]
    const normalizedRequested = requestedServiceNumberRaw
      ? normalizeSpacesLower(requestedServiceNumberRaw)
      : ""
    const matchedBase = DEDUPLICATED_BASES.find(base => normalizedRequested === base)

    if (matchedBase) {
      const existing = await prisma.serviceRecord.findMany({
        where: {
          projectorId: serviceRecord.projectorId,
          id: { not: serviceRecord.id }, // exclude current record being updated
          OR: [
            { serviceNumber: { equals: matchedBase } },
            { serviceNumber: { startsWith: `${matchedBase} ` } },
          ],
        },
        select: { serviceNumber: true },
      })

      let maxN = 0
      for (const r of existing) {
        const sn = normalizeSpacesLower(r.serviceNumber)
        if (sn === matchedBase) {
          maxN = Math.max(maxN, 1)
          continue
        }
        const m = sn.match(new RegExp(`^${matchedBase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+(\\d+)$`))
        if (m?.[1]) {
          const n = Number(m[1])
          if (Number.isFinite(n)) maxN = Math.max(maxN, n)
        }
      }

      const nextN = maxN + 1
      workDetails.serviceNumber = nextN <= 1 ? matchedBase : `${matchedBase} ${nextN}`
    }



    // Fields that should not be updated (read-only or set on creation)
    const readonlyFields = new Set([
      'id', 'createdAt', 'updatedAt', 'userId', 'projectorId', 'siteId', 'assignedToId',
      'reportSubmittedAt', // Set once on first submission, never overwritten
    ])

    // Handle recommendedParts as JSON
    if (workDetails?.recommendedParts) {
      const recommendedParts = workDetails.recommendedParts
      // Only save if it's a non-empty array
      if (Array.isArray(recommendedParts) && recommendedParts.length > 0) {
        updateData.recommendedParts = recommendedParts
      } else if (!Array.isArray(recommendedParts) && recommendedParts && typeof recommendedParts === 'object') {
        // If it's not an array but exists as an object, save it (for flexibility)
        updateData.recommendedParts = recommendedParts
      }
      // If it's empty array or null, don't set it (let it remain as is in DB)
    }

    // Add work details with proper type conversion
    if (workDetails) {
      Object.keys(workDetails).forEach((key) => {
        // Skip readonly fields and fields not in schema
        if (readonlyFields.has(key) || !validSchemaFields.has(key)) return
        // Skip recommendedParts (handled separately)
        if (key === 'recommendedParts') return
        // Skip reportGenerated if already set (we set it directly above)
        if (key === 'reportGenerated' && updateData.reportGenerated !== undefined) return

        const converted = convertValue(key, workDetails[key])
        if (converted !== undefined) {
          updateData[key] = converted
        }
      })
    }

    // Ensure reportGenerated is always a boolean (never a string)
    if (updateData.reportGenerated !== undefined) {
      updateData.reportGenerated = Boolean(updateData.reportGenerated)
    }

    // Add signatures
    if (signatures) {
      const engineerSig = signatures.engineer || signatures.engineerSignatureUrl || null
      const siteSig = signatures.site || signatures.siteSignatureUrl || null
      // Only set signatures if at least one exists
      if (engineerSig || siteSig) {
        updateData.signatures = {
          engineer: engineerSig,
          site: siteSig,
        }
      }
    }

    // Add images - extract URLs from image objects
    // Always set images arrays, even if empty (Prisma needs them defined)
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

    if (logs !== undefined) {
      updateData.logs = logs
    }

    // Carry reportSubmittedAt directly (it's a DateTime set above, not in workDetails whitelist)
    if (updateData.reportSubmittedAt) {
      // Will be merged into cleanedData after loop
    }

    // Clean up undefined values and filter to only valid schema fields (Prisma doesn't accept undefined)
    const cleanedData: any = {}
    if (updateData.reportSubmittedAt) cleanedData.reportSubmittedAt = updateData.reportSubmittedAt
    Object.keys(updateData).forEach((key) => {
      if (key === 'reportSubmittedAt') return // already handled above
      // Double check that field is valid before adding
      if (updateData[key] !== undefined && validSchemaFields.has(key)) {
        const value = updateData[key]

        // Skip NaN values
        if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
          return
        }

        // Ensure boolean fields are always booleans (not strings)
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

        // Handle null values - Prisma prefers null over empty strings for optional fields
        if (value === '' && key !== 'images' && key !== 'brokenImages' && key !== 'afterImages') {
          cleanedData[key] = null
        } else {
          cleanedData[key] = value
        }
      }
    })

    // Ensure we have at least some data to update
    if (Object.keys(cleanedData).length === 0) {
      cleanedData.reportGenerated = true
      cleanedData.endTime = new Date()
    }

    // Log the data being sent (for debugging)
    if (process.env.NODE_ENV === 'development') {
      console.log('Updating service record with data keys:', Object.keys(cleanedData))
      console.log('Service record ID:', serviceRecordId)
      // Only log non-sensitive data
      const sanitizedData = { ...cleanedData }
      if (sanitizedData.signatures) sanitizedData.signatures = '[REDACTED]'
      console.log('Update data (sanitized):', JSON.stringify(sanitizedData, null, 2))
    }

    // Update the service record.
    // If `serviceNumber` violates the unique (projectorId, serviceNumber) constraint,
    // retry without changing `serviceNumber` so completion isn't blocked in prod.
    let updatedRecord: any
    try {
      updatedRecord = await prisma.serviceRecord.update({
        where: { id: serviceRecordId },
        data: cleanedData,
      })
    } catch (e: any) {
      const isUniqueViolation =
        e?.code === "P2002" &&
        Array.isArray(e?.meta?.target) &&
        e.meta.target.includes("projectorId") &&
        e.meta.target.includes("serviceNumber")

      if (isUniqueViolation && cleanedData?.serviceNumber !== undefined) {
        const { serviceNumber: _ignored, ...withoutServiceNumber } = cleanedData
        updatedRecord = await prisma.serviceRecord.update({
          where: { id: serviceRecordId },
          data: withoutServiceNumber,
        })
      } else {
        throw e
      }
    }

    // console.log(`✅ Service record updated successfully:`)
    // console.log(`   - ID: ${updatedRecord.id}`)
    // console.log(`   - Date: ${updatedRecord.date?.toISOString() || 'NOT SET'}`)
    // console.log(`   - EndTime: ${updatedRecord.endTime?.toISOString() || 'NOT SET'}`)
    // console.log(`   - ReportGenerated: ${updatedRecord.reportGenerated}`)


    // === PROJECTOR STATUS UPDATE ===
    // Always update the projector's lastServiceAt and status when a service is completed
    try {
      const projectorId = serviceRecord.projectorId
      const serviceDate = updatedRecord.date || updatedRecord.endTime || new Date()

      // console.log(`🔄 Updating projector ${projectorId} status...`)

      // Calculate if the service date puts the projector in COMPLETED status
      // (within 6 months from now)
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

      const newStatus = serviceDate >= sixMonthsAgo ? 'COMPLETED' : 'PENDING'

      await prisma.projector.update({
        where: { id: projectorId },
        data: {
          lastServiceAt: serviceDate,
          status: newStatus,
        }
      })

      // console.log(`✅ Successfully updated projector ${projectorId}:`)
      // console.log(`   - lastServiceAt: ${serviceDate.toISOString()}`)
      // console.log(`   - status: ${newStatus}`)
    } catch (projectorError) {
      console.error(`❌ Failed to update projector status:`, projectorError)
      // Log but don't fail the request - service record was already updated
    }

    // === LASER SERVICE RECORD UPSERT ===
    // If this is a laser projector, write canonical laser field names to the
    // dedicated LaserServiceRecord table (standard columns are also written for
    // backward compat / form pre-fill).
    try {
      const projectorModel = (serviceRecord as any).projector?.modelNo ?? ""
      const laserModels = await getLaserProjectorModels()
      const isLaser = isLaserProjectorModel(projectorModel, laserModels)

      if (isLaser && workDetails) {
        const laserData = buildLaserRecordData(workDetails)
        if (Object.keys(laserData).length > 0) {
          await prisma.laserServiceRecord.upsert({
            where: { serviceRecordId },
            create: { serviceRecordId, ...laserData },
            update: laserData,
          })
        }
      }
    } catch (laserErr) {
      console.error("Failed to upsert LaserServiceRecord:", laserErr)
      // Non-fatal — main service record was already saved
    }

    return NextResponse.json({
      success: true,
      serviceRecord: {
        id: updatedRecord.id,
        reportSubmittedAt: updatedRecord.reportSubmittedAt,
      },
    })
  } catch (error) {
    console.error("Error completing service record:", error)

    // Enhanced error logging
    let errorMessage = 'Unknown error'
    let errorDetails: any = null

    if (error instanceof Error) {
      errorMessage = error.message
      errorDetails = {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }

      // Check if it's a Prisma error
      if ('code' in error) {
        errorDetails.prismaCode = (error as any).code
        errorDetails.meta = (error as any).meta
      }
    } else {
      errorMessage = String(error)
    }

    console.error("Error details:", JSON.stringify(errorDetails, null, 2))


    return NextResponse.json(
      {
        error: "Failed to complete service record",
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        ...(process.env.NODE_ENV === 'development' && errorDetails ? { errorDetails } : {})
      },
      { status: 500 }
    )
  }
}

