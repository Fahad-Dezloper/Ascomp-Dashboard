import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { auth } from "@/lib/auth"

const EDIT_WINDOW_MS = 10 * 60 * 1000 // 10 minutes

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = session.user.id

    const body = await request.json()
    const { serviceRecordId } = body

    if (!serviceRecordId) {
      return NextResponse.json({ error: "Service record ID is required" }, { status: 400 })
    }

    const serviceRecord = await prisma.serviceRecord.findUnique({
      where: { id: serviceRecordId },
      select: { id: true, assignedToId: true, reportSubmittedAt: true },
    })

    if (!serviceRecord) {
      return NextResponse.json({ error: "Service record not found" }, { status: 404 })
    }

    if (serviceRecord.assignedToId !== userId) {
      return NextResponse.json({ error: "Unauthorized: Service not assigned to you" }, { status: 403 })
    }

    if (!serviceRecord.reportSubmittedAt) {
      return NextResponse.json({ error: "Report has not been submitted yet" }, { status: 400 })
    }

    const elapsed = Date.now() - new Date(serviceRecord.reportSubmittedAt).getTime()
    if (elapsed > EDIT_WINDOW_MS) {
      return NextResponse.json(
        { error: "Edit window expired", expiredAt: serviceRecord.reportSubmittedAt },
        { status: 403 }
      )
    }

    // Return remaining ms so client can display correct countdown
    return NextResponse.json({
      allowed: true,
      reportSubmittedAt: serviceRecord.reportSubmittedAt,
      remainingMs: Math.max(0, EDIT_WINDOW_MS - elapsed),
    })
  } catch (error) {
    console.error("Error checking re-edit permission:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
