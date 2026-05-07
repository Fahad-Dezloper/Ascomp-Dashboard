import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/db"

/** Admin overrides assignment on a visit (clears pending takeover requests). */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ serviceRecordId: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if ((session.user as { role?: string }).role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { serviceRecordId } = await context.params
    const body = await request.json().catch(() => ({}))
    const userId = (body.userId as string | null | undefined) ?? null

    if (userId !== null && typeof userId !== "string") {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 })
    }

    if (userId) {
      const u = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
      if (!u) {
        return NextResponse.json({ error: "User not found" }, { status: 400 })
      }
    }

    const service = await prisma.serviceRecord.findUnique({
      where: { id: serviceRecordId },
      select: { id: true, endTime: true },
    })
    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 })
    }
    if (service.endTime) {
      return NextResponse.json(
        { error: "Cannot reassign a completed visit" },
        { status: 400 },
      )
    }

    await prisma.$transaction(async (tx) => {
      await tx.serviceRecord.update({
        where: { id: serviceRecordId },
        data: { assignedToId: userId },
      })
      await tx.serviceAssignmentRequest.updateMany({
        where: {
          serviceRecordId,
          status: "PENDING",
        },
        data: { status: "CANCELLED" },
      })
    })

    return NextResponse.json({ ok: true, assignedToId: userId })
  } catch (e) {
    console.error("force-assign", e)
    return NextResponse.json({ error: "Failed to assign" }, { status: 500 })
  }
}
