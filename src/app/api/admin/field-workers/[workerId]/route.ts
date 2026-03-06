import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"

// GET /api/admin/field-workers/[workerId] — fetch a single worker
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ workerId: string }> }
) {
  try {
    const { workerId } = await context.params
    const worker = await prisma.user.findUnique({
      where: { id: workerId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        accessLevel: true,
        pvrAccess: true,
        createdAt: true,
      },
    })
    if (!worker) {
      return NextResponse.json({ error: "Worker not found" }, { status: 404 })
    }
    return NextResponse.json({ worker })
  } catch (error) {
    console.error("Error fetching worker:", error)
    return NextResponse.json({ error: "Failed to fetch worker" }, { status: 500 })
  }
}

// PATCH /api/admin/field-workers/[workerId] — update role / accessLevel / pvrAccess
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ workerId: string }> }
) {
  try {
    const { workerId } = await context.params
    const { role, accessLevel, pvrAccess } = await request.json()

    const worker = await prisma.user.findUnique({ where: { id: workerId } })
    if (!worker) {
      return NextResponse.json({ error: "Worker not found" }, { status: 404 })
    }

    const updated = await prisma.user.update({
      where: { id: workerId },
      data: {
        ...(role && { role }),
        accessLevel: role === "ADMIN" && accessLevel ? accessLevel : null,
        ...(pvrAccess && { pvrAccess }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        accessLevel: true,
        pvrAccess: true,
      },
    })

    return NextResponse.json({ success: true, worker: updated })
  } catch (error) {
    console.error("Error updating worker:", error)
    return NextResponse.json({ error: "Failed to update worker" }, { status: 500 })
  }
}

// DELETE /api/admin/field-workers/[workerId] — delete user, preserve ALL service records
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ workerId: string }> }
) {
  try {
    const { workerId } = await context.params

    const worker = await prisma.user.findUnique({ where: { id: workerId } })
    if (!worker) {
      return NextResponse.json({ error: "Worker not found" }, { status: 404 })
    }

    // Find an admin to re-assign the worker's created records to so the
    // Cascade delete on userId doesn't wipe them.
    const admin = await prisma.user.findFirst({
      where: { role: "ADMIN", id: { not: workerId } },
      select: { id: true },
    })

    if (!admin) {
      return NextResponse.json(
        { error: "No admin user found to re-assign service records to." },
        { status: 500 }
      )
    }

    // Re-assign all service records CREATED by this worker → admin (prevents cascade delete)
    await prisma.serviceRecord.updateMany({
      where: { userId: workerId },
      data: { userId: admin.id },
    })

    // Nullify assignedToId so assigned services stay (SetNull handles this via DB,
    // but being explicit avoids FK errors during deletion)
    await prisma.serviceRecord.updateMany({
      where: { assignedToId: workerId },
      data: { assignedToId: null },
    })

    // Delete dependent auth rows
    await prisma.session.deleteMany({ where: { userId: workerId } })
    await prisma.account.deleteMany({ where: { userId: workerId } })

    // Delete the user
    await prisma.user.delete({ where: { id: workerId } })

    return NextResponse.json({
      success: true,
      message: "Field worker deleted. All service records have been preserved.",
    })
  } catch (error) {
    console.error("Error deleting worker:", error)
    return NextResponse.json({ error: "Failed to delete worker" }, { status: 500 })
  }
}
