import { NextRequest, NextResponse } from "next/server"
import prisma, { ServiceStatus } from "@/lib/db"

// Helper function to generate MongoDB-style ObjectId
function generateObjectId(): string {
  return [...Array(24)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')
}

export async function POST(request: NextRequest) {
  try {
    const { siteId, modelNo, serialNo, status, address, state, region, pvr } = await request.json()

    if (!siteId || !modelNo || !serialNo) {
      return NextResponse.json(
        { error: "Site ID, model number, and serial number are required" },
        { status: 400 },
      )
    }

    let mappedStatus: ServiceStatus | undefined
    if (status && typeof status === "string") {
      const upper = status.toUpperCase() as keyof typeof ServiceStatus
      if (ServiceStatus[upper]) {
        mappedStatus = ServiceStatus[upper]
      }
    }

    let mappedPvr: string | undefined
    if (pvr && typeof pvr === "string") {
      const normalized = pvr === "Non PVR" ? "NonPVR" : pvr
      if (normalized === "PVR" || normalized === "NonPVR") {
        mappedPvr = normalized
      }
    }

    // Check if projector with same serial number already exists
    const existingProjector = await prisma.projector.findUnique({
      where: { serialNo },
    })

    if (existingProjector) {
      return NextResponse.json(
        { error: "Projector with this serial number already exists" },
        { status: 400 },
      )
    }

    // Verify site exists
    const site = await prisma.site.findUnique({
      where: { id: siteId },
    })

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 })
    }

    const projector = await prisma.projector.create({
      data: {
        id: generateObjectId(),
        modelNo,
        serialNo,
        siteId,
        status: mappedStatus ?? ServiceStatus.DRAFT,
        address: address || null,
        state: state || null,
        region: region || null,
        pvr: mappedPvr as any,
      },
      include: {
        site: {
          select: {
            id: true,
            siteName: true,
            address: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      projector: {
        id: projector.id,
        name: `${projector.modelNo} (${projector.serialNo})`,
        model: projector.modelNo,
        serialNumber: projector.serialNo,
        installDate: new Date().toISOString().split("T")[0],
        lastServiceDate: null,
        status: "pending" as const,
      },
    })
  } catch (error) {
    console.error("Error creating projector:", error)
    return NextResponse.json({ error: "Failed to create projector" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { projectorId } = await request.json()

    if (!projectorId) {
      return NextResponse.json(
        { error: "Projector ID is required" },
        { status: 400 },
      )
    }

    const existing = await prisma.projector.findUnique({
      where: { id: projectorId },
    })

    if (!existing) {
      return NextResponse.json({ error: "Projector not found" }, { status: 404 })
    }

    // ServiceRecord has onDelete: Cascade on projector relation in Prisma schema,
    // so all related service records will be removed automatically.
    await prisma.projector.delete({
      where: { id: projectorId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting projector:", error)
    return NextResponse.json({ error: "Failed to delete projector" }, { status: 500 })
  }
}

