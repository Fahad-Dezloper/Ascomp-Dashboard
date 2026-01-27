import { NextRequest, NextResponse } from "next/server"
import prisma, { ServiceStatus } from "@/lib/db"

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await context.params

    const site = await prisma.site.findUnique({
      where: { id: siteId },
      include: {
        projector: {
          include: {
            moveHistory: {
              orderBy: {
                movedAt: "desc",
              }
            },
            serviceRecords: {
              orderBy: {
                createdAt: "desc",
              },
              take: 5,
              include: {
                assignedTo: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            modelNo: "asc",
          },
        },
      },
    })

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 })
    }

    // Format site with projector status
    const formattedSite = {
      id: site.id,
      name: site.siteName,
      address: site.address,
      location: site.address,
      contactDetails: site.contactDetails,
      siteCode: site.siteCode || null,
      createdDate: new Date().toISOString().split("T")[0],
      projectors: site.projector.map((proj) => {
        // Calculate effective last service date
        // Use projector.lastServiceAt if available, otherwise find the latest date from service records
        let effectiveLastServiceDate: Date | null = proj.lastServiceAt

        if (!effectiveLastServiceDate && proj.serviceRecords.length > 0) {
          // serviceRecords are ordered by createdAt desc (line 18), but we should check 'date' field
          // Find the latest record with a valid date
          const validRecords = proj.serviceRecords
            .filter((r) => r.date != null)
            .sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime())

          if (validRecords[0]) {
            effectiveLastServiceDate = validRecords[0].date
          }
        }

        const now = new Date()
        const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)

        // Default to pending
        let status: "completed" | "pending" | "scheduled" | "packed" = "pending"
        const projectorStatus = proj.status

        if (projectorStatus === ServiceStatus.SCHEDULED || projectorStatus === ServiceStatus.IN_PROGRESS) {
          status = "scheduled"
        } else if (projectorStatus === ServiceStatus.PACKED) {
          status = "packed"
        } else if (effectiveLastServiceDate && effectiveLastServiceDate >= sixMonthsAgo) {
          // If last service was within 6 months, it's completed (good standing)
          status = "completed"
        } else {
          // Otherwise (no service or older than 6 months), it's pending
          status = "pending"
        }

        const serviceHistory = proj.serviceRecords.map((record) => ({
          id: record.id,
          date: record.date?.toISOString() || record.createdAt?.toISOString() || null,
          technician: record.assignedTo?.name || "Unassigned",
          notes: record.remarks || null,
          reportUrl: record.reportUrl,
          reportGenerated: record.reportGenerated,
        }))

        const nextServiceDue =
          effectiveLastServiceDate != null
            ? (() => {
              const d = new Date(effectiveLastServiceDate)
              d.setMonth(d.getMonth() + 6)
              return d.toISOString().split("T")[0]
            })()
            : null

        return {
          id: proj.id,
          name: `${proj.modelNo} (${proj.serialNo})`,
          model: proj.modelNo,
          serialNumber: proj.serialNo,
          installDate: proj.lastServiceAt?.toISOString().split("T")[0] || new Date().toISOString().split("T")[0],
          lastServiceDate: effectiveLastServiceDate?.toISOString().split("T")[0] || null,
          status,
          nextServiceDue,
          serviceHistory,
          moveHistory: proj.moveHistory.map(h => ({
            id: h.id,
            fromSiteName: h.fromSiteName,
            fromAddress: h.fromAddress,
            toSiteName: h.toSiteName,
            toAddress: h.toAddress,
            movedAt: h.movedAt.toISOString(),
          }))
        }
      }),
    }

    return NextResponse.json({
      site: formattedSite,
    })
  } catch (error) {
    console.error("Error fetching site:", error)
    return NextResponse.json({ error: "Failed to fetch site" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await context.params

    const existing = await prisma.site.findUnique({
      where: { id: siteId },
    })

    if (!existing) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 })
    }

    // Delete all service records and projectors for this site, then the site itself
    await prisma.$transaction([
      prisma.serviceRecord.deleteMany({
        where: { siteId },
      }),
      prisma.projector.deleteMany({
        where: { siteId },
      }),
      prisma.site.delete({
        where: { id: siteId },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting site:", error)
    return NextResponse.json({ error: "Failed to delete site" }, { status: 500 })
  }
}

