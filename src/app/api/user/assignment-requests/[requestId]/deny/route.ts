import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/db"
import { requireAssignmentRole } from "@/lib/assignment-access"

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ requestId: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: _request.headers })
    const denied = requireAssignmentRole(session)
    if (denied) return denied

    const userId = session!.user!.id
    const role = (session!.user as { role?: string }).role
    const { requestId } = await context.params

    const request = await prisma.serviceAssignmentRequest.findUnique({
      where: { id: requestId },
      include: {
        serviceRecord: {
          select: { id: true, assignedToId: true },
        },
      },
    })

    if (!request || request.status !== "PENDING") {
      return NextResponse.json(
        { error: "Request not found or no longer pending." },
        { status: 400 },
      )
    }

    const isAdmin = role === "ADMIN"
    const isCurrentAssignee =
      request.serviceRecord.assignedToId === userId

    if (!isAdmin && !isCurrentAssignee) {
      return NextResponse.json(
        { error: "Only the current assignee or an admin can deny." },
        { status: 403 },
      )
    }

    await prisma.serviceAssignmentRequest.update({
      where: { id: requestId },
      data: { status: "DENIED" },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("deny assignment request", e)
    return NextResponse.json({ error: "Failed to deny request" }, { status: 500 })
  }
}
