import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch ALL completed services (not filtered by userId).
    // Align with /completed: a visit counts as completed when it has endTime,
    // report is generated, completion date on the record, or the projector is marked COMPLETED.
    // Note: legacy / imported rows often have `date` set without `endTime` — omitting `date` under-counts vs admin “all visits” (~total ServiceRecords).
    // Use `select`, not full documents: each ServiceRecord has 100+ fields; loading entire
    // rows for thousands of completions will hang Mongo/Node and serialize forever.
    const services = await prisma.serviceRecord.findMany({
      where: {
        OR: [
          { endTime: { not: null } },
          { reportGenerated: true },
          { date: { not: null } },
          { projector: { status: "COMPLETED" } },
        ],
      },
      select: {
        id: true,
        serviceNumber: true,
        screenNumber: true,
        projectorRunningHours: true,
        date: true,
        endTime: true,
        createdAt: true,
        cinemaName: true,
        address: true,
        location: true,
        contactDetails: true,
        remarks: true,
        reportGenerated: true,
        reportUrl: true,
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
      orderBy: [{ endTime: "desc" }, { date: "desc" }],
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
      // List payload only — keeps response small (many rows). Full record: GET /api/admin/service-records/:id
      images: [],
      afterImages: [],
      brokenImages: [],
      signatures: null,
      reportGenerated: service.reportGenerated,
      reportUrl: service.reportUrl,
      workDetails: null,
    }))

    return NextResponse.json({
      services: formattedServices,
      count: formattedServices.length,
    })
  } catch (error) {
    console.error("Error fetching all completed services:", error)
    return NextResponse.json(
      { error: "Failed to fetch all completed services" },
      { status: 500 }
    )
  }
}
