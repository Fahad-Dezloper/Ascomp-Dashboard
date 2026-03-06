import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try{
    const session = await auth.api.getSession({ headers: request.headers })
    const pvrAccess = session?.user?.pvrAccess || "BOTH"

    const whereClause: any = {}
    if (pvrAccess === "PVR") {
      whereClause.projector = { pvr: "PVR" }
    } else if (pvrAccess === "NonPVR") {
      whereClause.projector = { pvr: "NonPVR" }
    }

    const res = await prisma.serviceRecord.findMany({
      where: whereClause,
      include: {
        projector: true,
        site: true,
        user: true,
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      }
    })

    const filtered = res.map((record: any) => {
      const { assignedToId, assignedTo, createdAt, userId, projector, site, user, ...rest } = record
      const { lastServiceAt, ...projectorRest } = projector || {}

      // console.log("assigned to", assignedTo);
      return {
        ...rest,
        projector: projectorRest,
        site: site,
        engineerVisited: assignedTo?.name || null,
      }
    })

    return NextResponse.json(filtered);

  } catch (e) {
    console.error("Error fetching site:", e)
    return NextResponse.json({ error: "Failed to fetch site" }, { status: 500 })
  }
}

