import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/db"
import { requireAssignmentRole } from "@/lib/assignment-access"
import { Prisma } from "@prisma/client"

const TAKE = 600

function visitPhaseLabel(
  endTime: Date | null,
  startTime: Date | null,
  assignedToId: string | null,
): "completed" | "in_progress" | "pending" | "unassigned" {
  if (endTime) return "completed"
  if (startTime) return "in_progress"
  if (assignedToId) return "pending"
  return "unassigned"
}

/** Browse visits to self-assign. By default returns recent visits of any phase; use openOnly=1 for only incomplete. */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    const denied = requireAssignmentRole(session)
    if (denied) return denied

    const userId = session!.user!.id
    const { searchParams } = new URL(request.url)
    const q = (searchParams.get("q") || "").trim()
    const openOnly = searchParams.get("openOnly") === "1" || searchParams.get("openOnly") === "true"

    const siteFilter: Prisma.ServiceRecordWhereInput =
      q.length > 0
        ? {
            OR: [
              { site: { siteName: { contains: q, mode: "insensitive" } } },
              { site: { address: { contains: q, mode: "insensitive" } } },
              { cinemaName: { contains: q, mode: "insensitive" } },
              { projector: { serialNo: { contains: q, mode: "insensitive" } } },
              { projector: { modelNo: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}

    const records = await prisma.serviceRecord.findMany({
      where: {
        ...siteFilter,
        ...(openOnly ? { endTime: null } : {}),
      },
      select: {
        id: true,
        serviceNumber: true,
        screenNumber: true,
        date: true,
        cinemaName: true,
        assignedToId: true,
        assignedTo: { select: { id: true, name: true } },
        startTime: true,
        endTime: true,
        createdAt: true,
        reportSubmittedAt: true,
        site: {
          select: { id: true, siteName: true, address: true },
        },
        projector: {
          select: {
            id: true,
            modelNo: true,
            serialNo: true,
            status: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: TAKE,
    })

    const ids = records.map((r) => r.id)
    const myPending = await prisma.serviceAssignmentRequest.findMany({
      where: {
        requesterId: userId,
        status: "PENDING",
        serviceRecordId: { in: ids },
      },
      select: { id: true, serviceRecordId: true },
    })
    const pendingByService = new Map(
      myPending.map((p) => [p.serviceRecordId, p.id]),
    )

    const globalPendingIds = await prisma.serviceAssignmentRequest.findMany({
      where: {
        status: "PENDING",
        serviceRecordId: { in: ids },
      },
      select: { id: true, serviceRecordId: true, requesterId: true },
    })
    const blockedByOther = new Set<string>()
    for (const p of globalPendingIds) {
      if (p.requesterId !== userId) {
        blockedByOther.add(p.serviceRecordId)
      }
    }

    const items = records.map((r) => {
      const phase = visitPhaseLabel(r.endTime, r.startTime, r.assignedToId)
      const isVisitOpen = !r.endTime

      const assigned = r.assignedTo
      const unassigned = !r.assignedToId
      const mine = r.assignedToId === userId
      const myPendingId = pendingByService.get(r.id)
      const blocked = blockedByOther.has(r.id) && !myPendingId

      let claimState:
        | "completed"
        | "unassigned"
        | "mine"
        | "other"
        | "pending_mine"
        | "blocked_pending_other" = "other"

      if (!isVisitOpen) {
        claimState = "completed"
      } else if (unassigned) claimState = "unassigned"
      else if (mine) claimState = "mine"
      else if (myPendingId) claimState = "pending_mine"
      else if (blocked) claimState = "blocked_pending_other"

      return {
        id: r.id,
        siteId: r.site.id,
        projectorId: r.projector.id,
        serviceNumber: r.serviceNumber,
        screenNumber: r.screenNumber,
        date: r.date?.toISOString() ?? null,
        cinemaName: r.cinemaName,
        siteName: r.site.siteName,
        siteAddress: r.site.address,
        projectorModel: r.projector.modelNo,
        projectorSerial: r.projector.serialNo,
        projectorAssetStatus: r.projector.status,
        visitPhase: phase,
        assignedTo: assigned,
        claimState,
        myPendingRequestId: myPendingId ?? null,
        reportSubmittedAt: (r as any).reportSubmittedAt?.toISOString() ?? null,
      }
    })

    return NextResponse.json({
      items,
      truncated: records.length >= TAKE,
      openOnly,
    })
  } catch (e) {
    console.error("GET claimable services", e)
    return NextResponse.json(
      { error: "Failed to load visits" },
      { status: 500 },
    )
  }
}
