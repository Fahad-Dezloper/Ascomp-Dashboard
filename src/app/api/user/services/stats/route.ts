import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { auth } from "@/lib/auth"
import type { Prisma } from "@prisma/client"

/** “Completed” matches `/api/user/services/completed`: assigned engineer + completion signals. */
function completedWhereForUser(userId: string): Prisma.ServiceRecordWhereInput {
  return {
    assignedToId: userId,
    OR: [
      { endTime: { not: null } },
      { reportGenerated: true },
      { date: { not: null } },
      { projector: { status: "COMPLETED" } },
    ],
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEndExclusive = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    const base = completedWhereForUser(userId)

    const [completedTotal, completedThisMonth] = await Promise.all([
      prisma.serviceRecord.count({ where: base }),
      prisma.serviceRecord.count({
        where: {
          AND: [
            base,
            {
              OR: [
                {
                  endTime: {
                    gte: monthStart,
                    lt: monthEndExclusive,
                  },
                },
                {
                  AND: [
                    { endTime: null },
                    { date: { gte: monthStart, lt: monthEndExclusive } },
                  ],
                },
              ],
            },
          ],
        },
      }),
    ])

    return NextResponse.json({
      completedTotal,
      completedThisMonth,
    })
  } catch (e) {
    console.error("GET /api/user/services/stats", e)
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 })
  }
}
