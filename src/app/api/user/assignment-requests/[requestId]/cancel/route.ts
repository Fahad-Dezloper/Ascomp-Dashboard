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
    const { requestId } = await context.params

    const request = await prisma.serviceAssignmentRequest.findUnique({
      where: { id: requestId },
    })

    if (!request || request.status !== "PENDING") {
      return NextResponse.json(
        { error: "Request not found or no longer pending." },
        { status: 400 },
      )
    }

    if (request.requesterId !== userId) {
      return NextResponse.json(
        { error: "Only the requester can cancel." },
        { status: 403 },
      )
    }

    await prisma.serviceAssignmentRequest.update({
      where: { id: requestId },
      data: { status: "CANCELLED" },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("cancel assignment request", e)
    return NextResponse.json(
      { error: "Failed to cancel request" },
      { status: 500 },
    )
  }
}
