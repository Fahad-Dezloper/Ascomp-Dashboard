import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/db"
import { requireAssignmentRole } from "@/lib/assignment-access"

/**
 * Current assignee (or admin) clears assignment and cancels pending takeover requests.
 */
export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ serviceRecordId: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: _request.headers })
    const denied = requireAssignmentRole(session)
    if (denied) return denied

    const userId = session!.user!.id
    const role = (session!.user as { role?: string }).role
    const { serviceRecordId } = await context.params

    const service = await prisma.serviceRecord.findUnique({
      where: { id: serviceRecordId },
      select: {
        id: true,
        assignedToId: true,
        endTime: true,
      },
    })

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 })
    }

    if (service.endTime) {
      return NextResponse.json(
        { error: "Cannot release a completed visit." },
        { status: 400 },
      )
    }

    const isAdmin = role === "ADMIN"
    if (!isAdmin && service.assignedToId !== userId) {
      return NextResponse.json(
        { error: "Only the assigned engineer or an admin can release this visit." },
        { status: 403 },
      )
    }

    await prisma.$transaction(async (tx) => {
      await tx.serviceRecord.update({
        where: { id: serviceRecordId },
        data: { assignedToId: null },
      })
      await tx.serviceAssignmentRequest.updateMany({
        where: {
          serviceRecordId,
          status: "PENDING",
        },
        data: { status: "CANCELLED" },
      })
    })

    return NextResponse.json({
      ok: true,
      kind: "released" as const,
      serviceRecordId,
    })
  } catch (e) {
    console.error("release service error", e)
    return NextResponse.json({ error: "Failed to release visit" }, { status: 500 })
  }
}
