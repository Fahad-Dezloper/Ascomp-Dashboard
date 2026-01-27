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
        const body = await request.json()
        const { status, action, modelNo, serialNo, address, state, region, pvr, siteId } = body

        if (action === "unpack") {
            // ... (keep existing unpack logic)
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

        // Handle general updates
        const updateData: any = {}
        if (modelNo) updateData.modelNo = modelNo
        if (serialNo) updateData.serialNo = serialNo
        if (address) updateData.address = address
        if (state) updateData.state = state
        if (region) updateData.region = region
        if (pvr) updateData.pvr = pvr
        if (siteId) updateData.siteId = siteId

        if (status) {
            const upperStatus = status.toUpperCase() as keyof typeof ServiceStatus
            if (ServiceStatus[upperStatus]) {
                updateData.status = ServiceStatus[upperStatus]
            }
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: "No fields to update" }, { status: 400 })
        }

        const updatedProjector = await prisma.projector.update({
            where: { id: projectorId },
            data: updateData,
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
