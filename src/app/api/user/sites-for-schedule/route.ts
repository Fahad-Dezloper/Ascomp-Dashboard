import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getFormattedSitesDirectory } from "@/lib/sites-directory"

/**
 * Same site/projector directory as admin Sites &amp; Projectors, for field engineers picking
 * where to self-assign a new visit (PVR scope matches the signed-in user).
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: _request.headers })
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "FIELD_WORKER") {
      return NextResponse.json(
        { error: "Only field engineers can use this directory." },
        { status: 403 },
      )
    }

    const pvrAccess = session.user.pvrAccess || "BOTH"
    const { sites, count } = await getFormattedSitesDirectory(pvrAccess)

    return NextResponse.json({ sites, count })
  } catch (error) {
    console.error("GET /api/user/sites-for-schedule", error)
    return NextResponse.json({ error: "Failed to load sites" }, { status: 500 })
  }
}
