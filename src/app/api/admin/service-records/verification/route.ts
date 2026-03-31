import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { auth } from "@/lib/auth"

function hasReadWriteAdminAccess(session: any) {
  if (!session?.user) return false
  const isAdmin = session.user.role === "ADMIN"
  const isReadOnly = session.user.accessLevel === "READ_ONLY"
  return isAdmin && !isReadOnly
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })

    if (!hasReadWriteAdminAccess(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const services = await prisma.serviceRecord.findMany({
      where: {
        verificationStatus: "PENDING",
        OR: [
          { endTime: { not: null } },
          { reportGenerated: true },
        ],
      },
      include: {
        site: {
          select: {
            id: true,
            siteName: true,
            address: true,
          },
        },
        projector: {
          select: {
            id: true,
            modelNo: true,
            serialNo: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        lastEditedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        endTime: "desc",
      },
    })

    return NextResponse.json({
      services: services.map((service) => ({
        id: service.id,
        serviceNumber: service.serviceNumber,
        date: service.date?.toISOString() || null,
        completedAt: service.endTime?.toISOString() || service.createdAt.toISOString(),
        verificationStatus: service.verificationStatus,
        lastEditedAt: service.lastEditedAt?.toISOString() || null,
        lastEditedBy: service.lastEditedBy || null,
        editCount: service.editCount ?? 0,
        site: service.site,
        projector: service.projector,
        engineer: service.assignedTo,
      })),
      count: services.length,
    })
  } catch (error) {
    console.error("Error fetching pending verification services:", error)
    return NextResponse.json({ error: "Failed to fetch pending verification services" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })

    if (!hasReadWriteAdminAccess(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { serviceRecordId } = await request.json()
    if (!serviceRecordId) {
      return NextResponse.json({ error: "serviceRecordId is required" }, { status: 400 })
    }

    const service = await prisma.serviceRecord.findUnique({
      where: { id: serviceRecordId },
      select: {
        id: true,
        endTime: true,
        reportGenerated: true,
        verificationStatus: true,
      },
    })

    if (!service) {
      return NextResponse.json({ error: "Service record not found" }, { status: 404 })
    }

    if (!service.endTime && !service.reportGenerated) {
      return NextResponse.json({ error: "Service record is not completed yet" }, { status: 400 })
    }

    const verified = await prisma.serviceRecord.update({
      where: { id: serviceRecordId },
      data: {
        verificationStatus: "VERIFIED",
        verifiedAt: new Date(),
        verifiedById: session.user.id,
      },
      select: {
        id: true,
        verificationStatus: true,
        verifiedAt: true,
      },
    })

    return NextResponse.json({ success: true, serviceRecord: verified })
  } catch (error) {
    console.error("Error verifying service record:", error)
    return NextResponse.json({ error: "Failed to verify service record" }, { status: 500 })
  }
}
