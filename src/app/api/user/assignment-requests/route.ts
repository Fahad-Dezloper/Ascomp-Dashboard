import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/db"
import { requireAssignmentRole } from "@/lib/assignment-access"

const serviceSelect = {
  id: true,
  serviceNumber: true,
  screenNumber: true,
  date: true,
  assignedToId: true,
  site: {
    select: { id: true, siteName: true, address: true },
  },
  projector: {
    select: { id: true, modelNo: true, serialNo: true },
  },
  assignedTo: {
    select: { id: true, name: true },
  },
} as const

function formatRequest(
  r: {
    id: string
    createdAt: Date
    status: string
    requesterId: string
    assigneeIdAtRequest: string
    requester: { id: string; name: string }
    serviceRecord: {
      id: string
      serviceNumber: string
      screenNumber: string | null
      date: Date | null
      assignedToId: string | null
      site: { id: string; siteName: string; address: string }
      projector: { id: string; modelNo: string; serialNo: string }
      assignedTo: { id: string; name: string } | null
    }
  },
) {
  return {
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    status: r.status,
    requester: r.requester,
    assigneeIdAtRequest: r.assigneeIdAtRequest,
    service: {
      id: r.serviceRecord.id,
      serviceNumber: r.serviceRecord.serviceNumber,
      screenNumber: r.serviceRecord.screenNumber,
      date: r.serviceRecord.date?.toISOString() ?? null,
      siteName: r.serviceRecord.site.siteName,
      address: r.serviceRecord.site.address,
      projectorModel: r.serviceRecord.projector.modelNo,
      projectorSerial: r.serviceRecord.projector.serialNo,
      assignedTo: r.serviceRecord.assignedTo,
    },
  }
}

/** Lists takeover requests (incoming + outgoing) for the signed-in engineer. */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    const denied = requireAssignmentRole(session)
    if (denied) return denied

    const userId = session!.user!.id

    const [outgoing, incoming] = await Promise.all([
      prisma.serviceAssignmentRequest.findMany({
        where: { requesterId: userId, status: "PENDING" },
        include: {
          requester: { select: { id: true, name: true } },
          serviceRecord: {
            select: {
              ...serviceSelect,
              assignedTo: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.serviceAssignmentRequest.findMany({
        where: {
          status: "PENDING",
          serviceRecord: { assignedToId: userId },
        },
        include: {
          requester: { select: { id: true, name: true } },
          serviceRecord: {
            select: {
              ...serviceSelect,
              assignedTo: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ])

    return NextResponse.json({
      outgoing: outgoing.map(formatRequest),
      incoming: incoming.map(formatRequest),
    })
  } catch (e) {
    console.error("GET assignment-requests", e)
    return NextResponse.json({ error: "Failed to list requests" }, { status: 500 })
  }
}
