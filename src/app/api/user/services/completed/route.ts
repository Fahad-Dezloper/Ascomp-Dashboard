import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    // Fetch completed services assigned to this user
    // Completed: endTime, report, completion `date` on record, or projector COMPLETED (see all-completed)
    const services = await prisma.serviceRecord.findMany({
      where: {
        assignedToId: userId,
        OR: [
          { endTime: { not: null } },
          { reportGenerated: true },
          { date: { not: null } },
          { projector: { status: "COMPLETED" } },
        ],
      },
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
            address: true,
            contactDetails: true,
            siteCode: true,
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
      orderBy: {
        endTime: 'desc',
      },
    })

    // Format services for the frontend
    const formattedServices = services.map((service) => ({
      id: service.id,
      engineerName: service.assignedTo?.name,
      serviceNumber: service.serviceNumber,
      site: {
        id: service.site.id,
        name: service.site.siteName,
        address: service.site.address,
        contactDetails: service.site.contactDetails,
        siteCode: service.site.siteCode ?? null,
        screenNo: service.screenNumber, // screenNumber is on ServiceRecord, not Site
      },
      projector: {
        id: service.projector.id,
        model: service.projector.modelNo,
        serialNo: service.projector.serialNo,
        runningHours: service.projectorRunningHours, // runningHours is on ServiceRecord as projectorRunningHours
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
      signatures: service.signatures,
      reportGenerated: service.reportGenerated,
      reportUrl: service.reportUrl,
      // Include all work details
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
        flCenter: service.flLeft && service.flRight ? (service.flLeft + service.flRight) / 2 : null,
        contentPlayerModel: service.contentPlayerModel,
        acStatus: service.acStatus,
        leStatus: service.leStatus,
        lightEngineSerialNumber: service.lightEngineSerialNumber,
        // Color calibration - use 2K values as primary, fallback to 4K
        whiteX: service.white2Kx ?? service.white4Kx,
        whiteY: service.white2Ky ?? service.white4Ky,
        whiteFl: service.white2Kfl ?? service.white4Kfl,
        redX: service.red2Kx ?? service.red4Kx,
        redY: service.red2Ky ?? service.red4Ky,
        redFl: service.red2Kfl ?? service.red4Kfl,
        greenX: service.green2Kx ?? service.green4Kx,
        greenY: service.green2Ky ?? service.green4Ky,
        greenFl: service.green2Kfl ?? service.green4Kfl,
        blueX: service.blue2Kx ?? service.blue4Kx,
        blueY: service.blue2Ky ?? service.blue4Ky,
        blueFl: service.blue2Kfl ?? service.blue4Kfl,
        // Also include 2K and 4K variants for backward compatibility
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
    }))

    return NextResponse.json({
      services: formattedServices,
      count: formattedServices.length,
    })
  } catch (error) {
    console.error("Error fetching completed services:", error)
    return NextResponse.json(
      { error: "Failed to fetch completed services" },
      { status: 500 }
    )
  }
}

