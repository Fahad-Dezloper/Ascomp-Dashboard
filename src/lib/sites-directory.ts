import prisma, { ServiceStatus } from "@/lib/db"
import type { Prisma } from "@prisma/client"

/**
 * Shared site + projector tree used by Admin “Sites & Projectors” and field engineers “Schedule a visit”.
 * Respects PVR scope the same way as admin (`PVR` / `NonPVR` / `BOTH`).
 */
export async function getFormattedSitesDirectory(pvrAccess: string) {
  const projectorWhere: Prisma.ProjectorWhereInput = {}
  if (pvrAccess === "PVR") projectorWhere.pvr = "PVR"
  else if (pvrAccess === "NonPVR") projectorWhere.pvr = "NonPVR"

  const siteWhere: Prisma.SiteWhereInput | undefined =
    Object.keys(projectorWhere).length > 0 ? { projector: { some: projectorWhere } } : undefined

  const sites = await prisma.site.findMany({
    where: siteWhere,
    include: {
      projector: {
        where: projectorWhere,
        include: {
          serviceRecords: {
            select: {
              id: true,
              endTime: true,
              reportGenerated: true,
              date: true,
            },
          },
        },
        orderBy: {
          modelNo: "asc",
        },
      },
    },
    orderBy: {
      siteName: "asc",
    },
  })

  const formattedSites = sites.map((site) => {
    const totalCompletedServices = site.projector.reduce((acc, proj) => {
      return (
        acc +
        proj.serviceRecords.filter(
          (record) => record.endTime !== null || record.reportGenerated === true,
        ).length
      )
    }, 0)

    return {
      id: site.id,
      name: site.siteName,
      address: site.address,
      location: site.address,
      contactDetails: site.contactDetails,
      siteCode: site.siteCode || null,
      email: site.email || null,
      createdDate: new Date().toISOString().split("T")[0]!,
      totalCompletedServices,
      projectors: site.projector.map((proj) => {
        let effectiveLastServiceDate: Date | null = proj.lastServiceAt

        if (!effectiveLastServiceDate && proj.serviceRecords.length > 0) {
          const validRecords = proj.serviceRecords
            .filter((r) => (r.endTime !== null || r.reportGenerated === true) && r.date != null)
            .sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime())

          if (validRecords[0]) {
            effectiveLastServiceDate = validRecords[0].date
          }
        }

        const now = new Date()
        const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)

        let status: "completed" | "pending" | "scheduled" | "packed"

        if (proj.status === ServiceStatus.SCHEDULED || proj.status === ServiceStatus.IN_PROGRESS) {
          status = "scheduled"
        } else if (proj.status === ServiceStatus.PACKED) {
          status = "packed"
        } else if (effectiveLastServiceDate && effectiveLastServiceDate >= sixMonthsAgo) {
          status = "completed"
        } else {
          status = "pending"
        }

        const nextServiceDue =
          effectiveLastServiceDate != null
            ? (() => {
                const d = new Date(effectiveLastServiceDate)
                d.setMonth(d.getMonth() + 6)
                return d.toISOString().split("T")[0]!
              })()
            : null

        const completedServiceHistory = proj.serviceRecords.filter(
          (record) => record.endTime !== null || record.reportGenerated === true,
        )

        return {
          id: proj.id,
          name: `${proj.modelNo} (${proj.serialNo})`,
          model: proj.modelNo,
          serialNumber: proj.serialNo,
          address: proj.address ?? null,
          region: proj.region ?? null,
          state: proj.state ?? null,
          installDate: proj.lastServiceAt?.toISOString().split("T")[0] || null,
          lastServiceDate: effectiveLastServiceDate?.toISOString().split("T")[0] || null,
          status,
          nextServiceDue,
          serviceHistory: completedServiceHistory,
        }
      }),
    }
  })

  return {
    sites: formattedSites,
    count: formattedSites.length,
  }
}
