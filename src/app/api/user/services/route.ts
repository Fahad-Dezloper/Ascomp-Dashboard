import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    // Get the authenticated user from cookies using better-auth
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    // Fetch services and their historical technical data in one single database call
    const services = await prisma.serviceRecord.findMany({
      where: {
        assignedToId: userId,
        endTime: null,
      },
      include: {
        site: {
          select: {
            id: true,
            siteName: true,
            address: true,
            contactDetails: true,
          },
        },
        projector: {
          select: {
            id: true,
            modelNo: true,
            serialNo: true,
            // Fetch only the most recent COMPLETED record that has technical data
            serviceRecords: {
              where: {
                // Remove endTime requirement since some historical records are "filled" but have null endTime
                OR: [
                  { softwareVersion: { not: "" } },
                  { screenMake: { not: "" } },
                  { screenHeight: { not: null } },
                  { screenWidth: { not: null } },
                  { flatHeight: { not: null } },
                  { flatWidth: { not: null } },
                  { throwDistance: { not: null } },
                  { screenGain: { not: null } },
                  { lampMakeModel: { not: "" } },
                  { contentPlayerModel: { not: "" } },
                  { lightEngineSerialNumber: { not: "" } },
                ],
              },
              orderBy: [
                { endTime: "desc" },
                { date: "desc" },
                { createdAt: "desc" },
              ],
              take: 1,
              select: {
                softwareVersion: true,
                screenGain: true,
                screenMake: true,
                throwDistance: true,
                screenHeight: true,
                screenWidth: true,
                flatHeight: true,
                flatWidth: true,
                lampMakeModel: true,
                contentPlayerModel: true,
                lightEngineSerialNumber: true,
                screenNumber: true,
              },
            },
          },
        },
      },
      orderBy: {
        date: "asc",
      },
    })

    // Format services for the frontend
    const formattedServices = services.map((service) => {
      const serviceDate = service.createdAt ? new Date(service.createdAt) : null
      const formattedDate = serviceDate
        ? `${String(serviceDate.getDate()).padStart(2, "0")}/${String(serviceDate.getMonth() + 1).padStart(2, "0")}/${serviceDate.getFullYear()}`
        : "Not scheduled"

      // The historical data is now nested inside projector.serviceRecords[0]
      const lastService = service.projector.serviceRecords?.[0] || null
      const isSpecial = (service.serviceNumber || "").toLowerCase() === "special"

      return {
        id: service.id,
        serviceNumber: service.serviceNumber,
        site: service.site.siteName,
        siteId: service.site.id,
        address: service.site.address,
        contactDetails: service.site.contactDetails,
        screenNumber: lastService?.screenNumber || null,
        projector: service.projector.serialNo,
        projectorId: service.projector.id,
        projectorModel: service.projector.modelNo,
        type:
          service.startTime !== null
            ? "In Progress"
            : isSpecial
              ? "Special Service"
              : "Scheduled Maintenance",
        date: formattedDate,
        rawDate: service.date?.toISOString() || null,
        status: service.startTime !== null ? "in_progress" : "scheduled",
        lastServiceData: lastService ? {
          softwareVersion: lastService.softwareVersion || null,
          screenGain: lastService.screenGain || null,
          screenMake: lastService.screenMake || null,
          throwDistance: lastService.throwDistance || null,
          screenHeight: lastService.screenHeight || null,
          screenWidth: lastService.screenWidth || null,
          flatHeight: lastService.flatHeight || null,
          flatWidth: lastService.flatWidth || null,
          lampMakeModel: lastService.lampMakeModel || null,
          contentPlayerModel: lastService.contentPlayerModel || null,
          lightEngineSerialNumber: lastService.lightEngineSerialNumber || null,
          screenNumber: lastService.screenNumber || null,
        } : null,
      }
    })

    return NextResponse.json({
      services: formattedServices,
      count: formattedServices.length,
    })
  } catch (error) {
    console.error("Error fetching user services:", error)
    return NextResponse.json({ error: "Failed to fetch services" }, { status: 500 })
  }
}

