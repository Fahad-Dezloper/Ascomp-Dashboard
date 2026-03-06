import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    const pvrAccess = session?.user?.pvrAccess || "BOTH"

    const now = new Date()
    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Build PVR where clauses
    const projectorPvrWhere: any = {}
    if (pvrAccess === "PVR") projectorPvrWhere.pvr = "PVR"
    else if (pvrAccess === "NonPVR") projectorPvrWhere.pvr = "NonPVR"

    // Fetch data in parallel with optimized queries
    const [
      totalSites,
      totalProjectors,
      pendingProjectorsCount,
      completedServicesCount,
      scheduledServicesCount,
      pendingProjectors,
      fieldWorkers,
      recentTasks,
    ] = await Promise.all([
      // Count total sites, only counting those that have matching projectors if restricted 
      prisma.site.count({
        where: Object.keys(projectorPvrWhere).length > 0 ? {
          projector: { some: projectorPvrWhere }
        } : undefined
      }),

      // Count total projectors
      prisma.projector.count({
        where: projectorPvrWhere
      }),

      // Count pending projectors (no service or service > 6 months ago)
      prisma.projector.count({
        where: {
          ...projectorPvrWhere,
          status: { notIn: ["PACKED", "SCHEDULED", "IN_PROGRESS"] },
          OR: [
            { lastServiceAt: null },
            { lastServiceAt: { lt: sixMonthsAgo } },
          ],
        },
      }),

      // Count completed services from Projector model (projectors serviced within last 6 months)
      prisma.projector.count({
        where: {
          ...projectorPvrWhere,
          AND: [
            { lastServiceAt: { not: null } },
            { lastServiceAt: { gte: sixMonthsAgo } },
          ],
        },
      }),

      // Count scheduled services as projectors whose status is SCHEDULED
      prisma.projector.count({
        where: {
          ...projectorPvrWhere,
          status: "SCHEDULED",
        },
      }),

      // Get top 5 pending projectors with site info
      prisma.projector.findMany({
        where: {
          ...projectorPvrWhere,
          status: { notIn: ["PACKED", "SCHEDULED", "IN_PROGRESS"] },
          OR: [
            { lastServiceAt: null },
            { lastServiceAt: { lt: sixMonthsAgo } },
          ],
        },
        include: {
          site: {
            select: {
              id: true,
              siteName: true,
            },
          },
        },
        orderBy: {
          lastServiceAt: "asc",
        },
        take: 5,
      }),

      // Get field workers with their service counts
      prisma.user.findMany({
        where: {
          role: "FIELD_WORKER",
        },
        include: {
          assignedServices: {
            select: {
              id: true,
              endTime: true,
              reportGenerated: true,
              date: true,
            },
            orderBy: {
              date: "desc",
            },
          },
        },
      }),

      // Get recent scheduled tasks (service records that exist but aren't fully completed)
      prisma.serviceRecord.findMany({
        where: {
          ...(Object.keys(projectorPvrWhere).length > 0 ? { projector: projectorPvrWhere } : {}),
          AND: [
            { endTime: null },
            { reportGenerated: false },
          ],
        },
        include: {
          projector: {
            include: {
              site: {
                select: {
                  siteName: true,
                },
              },
            },
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          date: "desc",
        },
        take: 4,
      }),
    ])

    // Calculate active workers (active in last 7 days)
    const activeWorkers = fieldWorkers.filter((fw) => {
      const lastService = fw.assignedServices[0]
      if (!lastService?.date) return false
      return lastService.date >= sevenDaysAgo
    })

    // Format pending projectors
    const pendingProjectorsWithSite = pendingProjectors.map((p) => ({
      id: p.id,
      name: `${p.modelNo} (${p.serialNo})`,
      siteName: p.site.siteName,
      siteId: p.siteId,
      lastServiceAt: p.lastServiceAt?.toISOString().split("T")[0] || null,
    }))

    const recentWorkers = fieldWorkers
      .map((fw) => {
        const lastService = fw.assignedServices[0]
        // All service records are completed, but filter by completion indicators
        const completedCount = fw.assignedServices.filter(
          (s) => s.endTime !== null || s.reportGenerated === true,
        ).length
        // Pending are those without endTime and reportGenerated
        const pendingCount = fw.assignedServices.filter(
          (s) => s.endTime === null && s.reportGenerated === false,
        ).length

        return {
          id: fw.id,
          name: fw.name,
          email: fw.email,
          sitesCompleted: completedCount,
          pendingTasks: pendingCount,
          totalTasks: fw.assignedServices.length,
          lastActiveDate:
            lastService?.date?.toISOString().split("T")[0] || fw.createdAt.toISOString().split("T")[0],
          joinDate: fw.createdAt.toISOString().split("T")[0],
        }
      })
      .sort((a, b) => new Date(b.lastActiveDate || "").getTime() - new Date(a.lastActiveDate || "").getTime())
      .slice(0, 4)

    // Format recent tasks
    // All service records are considered completed, but these are ones that aren't fully completed yet
    const formattedRecentTasks = recentTasks.map((task) => {
      return {
        id: task.id,
        projectorId: task.projectorId,
        siteId: task.siteId,
        fieldWorkerId: task.assignedToId || "",
        scheduledDate: task.date?.toISOString().split("T")[0] || "",
        status: "scheduled" as const,
        projectorName: `${task.projector.modelNo} (${task.projector.serialNo})`,
        workerName: task.assignedTo?.name || "Unassigned",
        siteName: task.projector.site.siteName,
      }
    })

    return NextResponse.json({
      stats: {
        totalSites,
        totalProjectors,
        fieldWorkers: fieldWorkers.length,
        pendingServices: pendingProjectorsCount, // Pending services = projectors that need service
        completedServices: completedServicesCount, // Completed services = projectors serviced within last 6 months
        scheduledServices: scheduledServicesCount,
        activeWorkers: activeWorkers.length,
      },
      pendingProjectors: pendingProjectorsWithSite,
      recentWorkers,
      recentTasks: formattedRecentTasks,
    })
  } catch (error) {
    console.error("Error fetching overview data:", error)
    return NextResponse.json({ error: "Failed to fetch overview data" }, { status: 500 })
  }
}

