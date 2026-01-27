import { NextRequest, NextResponse } from "next/server"
import prisma, { ServiceStatus } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ projectorId: string }> }
) {
    try {
        const session = await auth.api.getSession({ headers: request.headers })

        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { projectorId } = await context.params
        const { status, action } = await request.json()

        if (action === "unpack") {
            // Logic to unpack and set status back to COMPLETED or PENDING based on service history
            const sixMonthsAgo = new Date()
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

            const lastCompletedService = await prisma.serviceRecord.findFirst({
                where: {
                    projectorId,
                    date: { not: null },
                },
                orderBy: { date: "desc" },
                select: { date: true },
            })

            let newStatus: ServiceStatus = ServiceStatus.PENDING
            let lastServiceAt: Date | null = null

            if (lastCompletedService?.date) {
                lastServiceAt = lastCompletedService.date
                newStatus =
                    lastCompletedService.date >= sixMonthsAgo
                        ? ServiceStatus.COMPLETED
                        : ServiceStatus.PENDING
            }

            const updatedProjector = await prisma.projector.update({
                where: { id: projectorId },
                data: {
                    status: newStatus,
                    lastServiceAt,
                },
            })

            return NextResponse.json({
                success: true,
                projector: updatedProjector,
                calculatedStatus: newStatus.toLowerCase(),
            })
        }

        if (!status) {
            return NextResponse.json({ error: "Status or action is required" }, { status: 400 })
        }

        // Verify status is valid
        const upperStatus = status.toUpperCase() as keyof typeof ServiceStatus
        if (!ServiceStatus[upperStatus]) {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 })
        }

        const updatedProjector = await prisma.projector.update({
            where: { id: projectorId },
            data: {
                status: ServiceStatus[upperStatus],
            },
        })

        return NextResponse.json({
            success: true,
            projector: updatedProjector,
        })
    } catch (error) {
        console.error("Error updating projector:", error)
        return NextResponse.json({ error: "Failed to update projector" }, { status: 500 })
    }
}
