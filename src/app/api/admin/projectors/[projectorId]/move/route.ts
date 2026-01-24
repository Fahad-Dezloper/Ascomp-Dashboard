import { NextRequest, NextResponse } from "next/server"
import prisma, { ServiceStatus } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectorId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { projectorId } = await context.params
    const { targetSiteId } = await request.json()

    if (!targetSiteId) {
      return NextResponse.json({ error: "Target site ID is required" }, { status: 400 })
    }

    // Fetch projector with its current site details
    const projector = await prisma.projector.findUnique({
      where: { id: projectorId },
      include: { site: true }
    })

    if (!projector) {
      return NextResponse.json({ error: "Projector not found" }, { status: 404 })
    }

    // Verify target site exists
    const targetSite = await prisma.site.findUnique({
      where: { id: targetSiteId },
    })

    if (!targetSite) {
      return NextResponse.json({ error: "Target site not found" }, { status: 404 })
    }

    // Move projector and record history in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create history record
      await tx.projectorMoveHistory.create({
        data: {
          projectorId: projectorId,
          fromSiteId: projector.siteId,
          fromSiteName: projector.site.siteName,
          fromAddress: projector.site.address,
          toSiteId: targetSiteId,
          toSiteName: targetSite.siteName,
          toAddress: targetSite.address,
        }
      })

      // 2. Update projector
      return await tx.projector.update({
        where: { id: projectorId },
        data: {
          siteId: targetSiteId,
          status: ServiceStatus.PACKED,
        },
      })
    })

    return NextResponse.json({
      success: true,
      projector: result,
    })
  } catch (error) {
    console.error("Error moving projector:", error)
    return NextResponse.json({ error: "Failed to move projector" }, { status: 500 })
  }
}
