import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/db"
import { requireAssignmentRole } from "@/lib/assignment-access"
import { assignProjectorToFieldWorker } from "@/lib/projector-service-assignment"

/**
 * Engineer assigns themselves to the next open visit for a projector (same rules as admin schedule,
 * but cannot override another engineer's active assignment without the takeover flow).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    const denied = requireAssignmentRole(session)
    if (denied) return denied

    const userId = session!.user!.id
    const role = session!.user!.role as string | undefined
    if (role !== "FIELD_WORKER") {
      return NextResponse.json(
        { error: "Only field engineers can assign themselves from this action." },
        { status: 403 },
      )
    }

    const body = await request.json().catch(() => ({}))
    const { siteId, projectorId, scheduledDate } = body as {
      siteId?: string
      projectorId?: string
      scheduledDate?: string
    }

    if (!siteId || !projectorId) {
      return NextResponse.json({ error: "Site and projector are required." }, { status: 400 })
    }

    const dateStr =
      scheduledDate ||
      (() => {
        const d = new Date()
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, "0")
        const day = String(d.getDate()).padStart(2, "0")
        return `${y}-${m}-${day}`
      })()

    const fieldWorker = await prisma.user.findFirst({
      where: { id: userId, role: "FIELD_WORKER" },
      select: { id: true, email: true, name: true, pvrAccess: true },
    })
    if (!fieldWorker) {
      return NextResponse.json({ error: "Field engineer profile not found." }, { status: 404 })
    }

    const assigned = await assignProjectorToFieldWorker({
      siteId,
      projectorId,
      fieldWorker: {
        id: fieldWorker.id,
        email: fieldWorker.email,
        name: fieldWorker.name,
        pvrAccess: fieldWorker.pvrAccess,
      },
      recordUserId: userId,
      scheduledDate: dateStr,
      allowOverrideAssignee: false,
    })

    if (!assigned.ok) {
      return NextResponse.json({ error: assigned.error }, { status: assigned.status })
    }

    return NextResponse.json({
      success: true,
      kind: "self_assigned" as const,
      serviceRecord: {
        id: assigned.record.id,
        date: assigned.record.date,
        assignedToId: assigned.fieldWorker.id,
      },
    })
  } catch (e) {
    console.error("POST self-schedule", e)
    return NextResponse.json({ error: "Failed to assign visit" }, { status: 500 })
  }
}
