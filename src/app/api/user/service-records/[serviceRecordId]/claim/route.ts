import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/db"
import { requireAssignmentRole } from "@/lib/assignment-access"

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ serviceRecordId: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: _request.headers })
    const denied = requireAssignmentRole(session)
    if (denied) return denied

    const userId = session!.user!.id
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

    // Claim depends only on THIS service visit (endTime), not Projector.status — assets may stay "COMPLETED"
    // while new visits are opened and scheduled.
    if (service.endTime) {
      return NextResponse.json(
        { error: "This visit is already completed." },
        { status: 400 },
      )
    }

    if (service.assignedToId === userId) {
      return NextResponse.json({
        ok: true,
        kind: "already_assigned" as const,
        serviceRecordId: service.id,
      })
    }

    if (!service.assignedToId) {
      await prisma.serviceRecord.update({
        where: { id: serviceRecordId },
        data: { assignedToId: userId },
      })
      return NextResponse.json({
        ok: true,
        kind: "claimed" as const,
        serviceRecordId: service.id,
      })
    }

    const otherPending =
      await prisma.serviceAssignmentRequest.findFirst({
        where: {
          serviceRecordId,
          status: "PENDING",
        },
      })

    if (otherPending) {
      if (otherPending.requesterId === userId) {
        return NextResponse.json({
          ok: true,
          kind: "request_pending" as const,
          requestId: otherPending.id,
          serviceRecordId,
        })
      }
      return NextResponse.json(
        {
          error:
            "Another engineer already has a pending takeover request for this visit. Wait for the current assignee or an admin to resolve it.",
          existingRequestId: otherPending.id,
        },
        { status: 409 },
      )
    }

    const created = await prisma.serviceAssignmentRequest.create({
      data: {
        serviceRecordId,
        requesterId: userId,
        assigneeIdAtRequest: service.assignedToId,
        status: "PENDING",
      },
    })

    return NextResponse.json({
      ok: true,
      kind: "request_created" as const,
      requestId: created.id,
      serviceRecordId,
    })
  } catch (e) {
    console.error("claim service error", e)
    return NextResponse.json(
      { error: "Failed to claim or request assignment" },
      { status: 500 },
    )
  }
}
