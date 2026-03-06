import { NextRequest, NextResponse } from "next/server"
import prisma, { ServiceStatus } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    const pvrAccess = session?.user?.pvrAccess || "BOTH"

    const { searchParams } = new URL(request.url)
    const q = (searchParams.get("q") || "").toLowerCase().trim()

    // Build PVR where clauses
    const whereClause: any = {
      status: ServiceStatus.SCHEDULED,
    }
    if (pvrAccess === "PVR") whereClause.pvr = "PVR"
    else if (pvrAccess === "NonPVR") whereClause.pvr = "NonPVR"

    const projectors = await prisma.projector.findMany({
      where: whereClause,
      include: {
        site: {
          select: {
            siteName: true,
            address: true,
          },
        },
        serviceRecords: {
          where: {
            date: null,  // Only uncompleted services
          },
          include: {
            assignedTo: {
              select: {
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",  // Latest scheduled service first
          },
          take: 1,  // Only get the latest one per projector
        },
      },
    })

    const mapped = projectors.flatMap((p) => {
      // Use the earliest non-completed service record for this scheduled projector, if any
      const sr = p.serviceRecords[0]
      if (!sr) return []

      return {
        id: sr.id,
        projectorId: p.id,
        siteId: p.siteId,
        serviceNumber: sr.serviceNumber,
        siteName: p.site?.siteName || "",
        siteAddress: p.site?.address || "",
        projectorModel: p.modelNo || null,
        projectorSerial: p.serialNo || null,
        screenNumber: sr.screenNumber ?? null,
        assignedToName: sr.assignedTo?.name || null,
        assignedToEmail: sr.assignedTo?.email || null,
        status: sr.startTime !== null ? "in_progress" : "scheduled",
        scheduledDate: sr.createdAt ? sr.createdAt.toISOString() : null,
      }
    })

    const filtered = q
      ? mapped.filter((s) => {
        const haystack = [
          s.siteName,
          s.siteAddress,
          s.projectorModel || "",
          s.projectorSerial || "",
          s.assignedToName || "",
        ]
          .join(" ")
          .toLowerCase()
        return haystack.includes(q)
      })
      : mapped

    return NextResponse.json({ services: filtered })
  } catch (error) {
    console.error("Error fetching scheduled services", error)
    return NextResponse.json({ error: "Failed to fetch scheduled services" }, { status: 500 })
  }
}
