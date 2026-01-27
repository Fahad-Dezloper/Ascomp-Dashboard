import { NextResponse } from "next/server"
import prisma from "@/lib/db"

const formatDate = (value: Date | null | undefined) => {
  if (!value) return null
  try {
    return value.toISOString().split("T")[0]
  } catch {
    return null
  }
}

export async function GET() {
  try {
    const now = new Date()
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    // Get date boundaries
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const last6Months = new Date(now.getFullYear(), now.getMonth() - 5, 1)

    // Fetch all data in parallel - OPTIMIZED: removed unused queries
    const [
      totalServiceCount,
      completedServiceCount,
      scheduledProjectorCount,
      pendingProjectorCount,
      totalProjectorCount,
      engineerCount,
      packedCount,
      recentServiceRecords,
      // Fetch only projectors that might have low fL (have service records with fL data)
      lowFlCandidates,
      // Pending projectors needing service
      pendingProjectors,
      // Packed projectors
      packedProjectors,
    ] = await Promise.all([
      // Total service records (all time)
      prisma.serviceRecord.count(),

      // Completed projectors (status = COMPLETED)
      prisma.projector.count({
        where: {
          status: "COMPLETED",
          NOT: { status: "PACKED" },
        }
      }),

      // Projectors with SCHEDULED status
      prisma.projector.count({
        where: { status: "SCHEDULED" },
      }),

      // Projectors with PENDING status (need service)
      prisma.projector.count({
        where: {
          status: "PENDING",
          NOT: { status: "PACKED" },
        },
      }),

      // Total projectors
      prisma.projector.count(),

      // Engineers count (FIELD_WORKER role only)
      prisma.user.count({
        where: { role: "FIELD_WORKER" },
      }),

      // Count of packed projectors
      prisma.projector.count({
        where: { status: "PACKED" },
      }),

      // Service records from last 6 months (for charts) - only completed ones
      prisma.serviceRecord.findMany({
        where: {
          date: { gte: last6Months },
          OR: [
            { endTime: { not: null } },
            { reportGenerated: true },
          ],
        },
        select: {
          id: true,
          date: true,
        },
      }),

      // OPTIMIZED: Fetch projectors with fL data for low fL check
      // Only get projectors that have at least one service record
      prisma.projector.findMany({
        where: {
          serviceRecords: {
            some: {},
          },
        },
        select: {
          id: true,
          serialNo: true,
          modelNo: true,
          siteId: true,
          site: {
            select: {
              siteName: true,
              address: true,
            },
          },
          serviceRecords: {
            select: { date: true, flLeft: true, flRight: true },
            orderBy: { date: "desc" },
            take: 1,
          },
        },
      }),

      // Pending projectors that need service
      prisma.projector.findMany({
        where: {
          status: { notIn: ["PACKED", "SCHEDULED", "IN_PROGRESS"] },
          OR: [
            { status: "PENDING" },
            { lastServiceAt: { lt: sixMonthsAgo } },
            { lastServiceAt: null },
          ],
        },
        include: {
          site: true,
          serviceRecords: {
            orderBy: { date: "desc" },
            take: 1,
            select: { screenNumber: true },
          },
        },
        take: 20,
        orderBy: { lastServiceAt: "asc" },
      }),

      // Packed projectors
      prisma.projector.findMany({
        where: {
          status: "PACKED",
        },
        include: {
          site: true,
          serviceRecords: {
            orderBy: { date: "desc" },
            take: 1,
            select: { screenNumber: true },
          },
        },
        take: 20,
      }),
    ])

    // Calculate low fL projectors (fL < 10 in last service - using Right fL only)
    const lowFlProjectors = lowFlCandidates
      .map((projector) => {
        const lastService = projector.serviceRecords[0]
        if (!lastService) return null

        const flLeft = typeof lastService.flLeft === 'number' ? lastService.flLeft : parseFloat(String(lastService.flLeft || '0'))
        const flRight = typeof lastService.flRight === 'number' ? lastService.flRight : parseFloat(String(lastService.flRight || '0'))

        // Skip if both are 0 (no data)
        if (flLeft === 0 && flRight === 0) return null

        // Use only flRight for low fL check
        if (flRight > 0 && flRight < 10) {
          return {
            id: projector.id,
            serialNo: projector.serialNo,
            modelNo: projector.modelNo,
            siteId: projector.siteId,
            siteName: projector.site?.siteName || "Unknown",
            siteAddress: projector.site?.address || "",
            flLeft: flLeft.toFixed(2),
            flRight: flRight.toFixed(2),
            lastServiceDate: formatDate(lastService.date),
          }
        }
        return null
      })
      .filter(Boolean)

    // Service count by day (last 7 days) - using completed services
    const servicesByDay: Record<string, number> = {}
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    // Initialize last 7 days in order
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dayKey = dayNames[d.getDay()]
      if (dayKey) servicesByDay[dayKey] = 0
    }

    recentServiceRecords.forEach((record) => {
      if (record.date && record.date >= last7Days) {
        const dayIndex = record.date.getDay()
        const dayKey = dayNames[dayIndex]
        if (dayKey && servicesByDay[dayKey] !== undefined) {
          servicesByDay[dayKey] = (servicesByDay[dayKey] || 0) + 1
        }
      }
    })

    const servicesByDayData = Object.entries(servicesByDay).map(([day, count]) => ({
      day,
      count,
    }))

    // Service count by month (last 6 months) - using completed services
    const servicesByMonth: Record<string, number> = {}
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    // Initialize last 6 months in order
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = monthNames[d.getMonth()]
      if (monthKey) servicesByMonth[monthKey] = 0
    }

    recentServiceRecords.forEach((record) => {
      if (record.date) {
        const monthIndex = record.date.getMonth()
        const monthKey = monthNames[monthIndex]
        if (monthKey && servicesByMonth[monthKey] !== undefined) {
          servicesByMonth[monthKey] = (servicesByMonth[monthKey] || 0) + 1
        }
      }
    })

    const servicesByMonthData = Object.entries(servicesByMonth).map(([month, count]) => ({
      month,
      count,
    }))

    return NextResponse.json({
      totals: {
        all: totalServiceCount,
        completed: completedServiceCount,
        scheduled: scheduledProjectorCount,
        pending: pendingProjectorCount,
        packed: packedCount,
        projectors: totalProjectorCount,
        engineers: engineerCount,
      },
      servicesByDay: servicesByDayData,
      servicesByMonth: servicesByMonthData,
      lowFlProjectors,
      pendingProjectors: pendingProjectors.map((p) => ({
        id: p.id,
        serialNo: p.serialNo,
        modelNo: p.modelNo,
        status: p.status,
        siteId: p.siteId,
        siteName: p.site?.siteName || "Unknown",
        siteAddress: p.site?.address || "",
        screenNumber: p.serviceRecords[0]?.screenNumber || null,
        lastServiceDate: formatDate(p.lastServiceAt),
      })),
      packedProjectors: packedProjectors.map((p) => ({
        id: p.id,
        serialNo: p.serialNo,
        modelNo: p.modelNo,
        status: p.status,
        siteId: p.siteId,
        siteName: p.site?.siteName || "Unknown",
        siteAddress: p.site?.address || "",
        screenNumber: p.serviceRecords[0]?.screenNumber || null,
        lastServiceDate: formatDate(p.lastServiceAt),
      })),
    })
  } catch (error) {
    console.error("Error fetching analytics:", error)
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 })
  }
}
