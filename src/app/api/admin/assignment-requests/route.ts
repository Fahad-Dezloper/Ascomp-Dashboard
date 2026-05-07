import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/db"

/** All pending takeover requests (visible to admins for coordination). */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if ((session.user as { role?: string }).role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const pending = await prisma.serviceAssignmentRequest.findMany({
      where: { status: "PENDING" },
      include: {
        requester: { select: { id: true, name: true, email: true } },
        serviceRecord: {
          select: {
            id: true,
            serviceNumber: true,
            screenNumber: true,
            date: true,
            assignedToId: true,
            assignedTo: { select: { id: true, name: true, email: true } },
            site: { select: { siteName: true, address: true } },
            projector: { select: { modelNo: true, serialNo: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      items: pending.map((r) => ({
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        assigneeIdAtRequest: r.assigneeIdAtRequest,
        requester: r.requester,
        service: {
          id: r.serviceRecord.id,
          serviceNumber: r.serviceRecord.serviceNumber,
          screenNumber: r.serviceRecord.screenNumber,
          date: r.serviceRecord.date?.toISOString() ?? null,
          siteName: r.serviceRecord.site.siteName,
          address: r.serviceRecord.site.address,
          projectorModel: r.serviceRecord.projector.modelNo,
          projectorSerial: r.serviceRecord.projector.serialNo,
          currentAssignee: r.serviceRecord.assignedTo,
        },
      })),
    })
  } catch (e) {
    console.error("admin GET assignment-requests", e)
    return NextResponse.json({ error: "Failed to load" }, { status: 500 })
  }
}
