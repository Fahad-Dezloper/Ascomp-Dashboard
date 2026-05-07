import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { auth } from "@/lib/auth"
import { getFormattedSitesDirectory } from "@/lib/sites-directory"

// Helper function to generate MongoDB-style ObjectId
function generateObjectId(): string {
  return [...Array(24)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    const pvrAccess = session?.user?.pvrAccess || "BOTH"
    const { sites, count } = await getFormattedSitesDirectory(pvrAccess)
    return NextResponse.json({
      sites,
      count,
    })
  } catch (error) {
    console.error("Error fetching sites:", error)
    return NextResponse.json({ error: "Failed to fetch sites" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { siteName, address, contactDetails, siteCode, email } = await request.json()

    if (!siteName || !address || !contactDetails) {
      return NextResponse.json(
        { error: "Site name, address, and contact details are required" },
        { status: 400 },
      )
    }

    // Check if site with same address already exists
    const existingSite = await prisma.site.findFirst({
      where: { address },
    })

    if (existingSite) {
      return NextResponse.json({ error: "Site with this address already exists" }, { status: 400 })
    }

    const site = await prisma.site.create({
      data: {
        id: generateObjectId(),
        siteName,
        address,
        contactDetails,
        siteCode: siteCode || null,
        email: email || null,
      },
      include: {
        projector: true,
      },
    })

    return NextResponse.json({
      success: true,
      site: {
        id: site.id,
        name: site.siteName,
        address: site.address,
        location: site.address,
        contactDetails: site.contactDetails,
        siteCode: site.siteCode || null,
        email: site.email || null,
        projectors: [],
      },
    })
  } catch (error) {
    console.error("Error creating site:", error)
    return NextResponse.json({ error: "Failed to create site" }, { status: 500 })
  }
}

