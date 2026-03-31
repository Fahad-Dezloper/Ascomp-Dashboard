import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

const MAX_MEDIA_BYTES = 100 * 1024 * 1024 // 100 MB
const MAX_LOG_BYTES = 200 * 1024 * 1024 // 200 MB

const MEDIA_TYPES = ["image/*", "video/*"]
const LOG_TYPES = [
  "application/zip",
  "application/x-zip-compressed",
  "application/x-rar-compressed",
  "application/x-7z-compressed",
]

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await request.json()) as HandleUploadBody

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const payload = clientPayload ? JSON.parse(clientPayload) : {}
        const folder = (payload.folder as string) || "uploads"
        if (!pathname.startsWith(folder + "/")) {
          throw new Error("Invalid upload path")
        }
        const isLog = folder === "projector-logs"

        const allowedContentTypes = isLog ? LOG_TYPES : MEDIA_TYPES
        const maximumSizeInBytes = isLog ? MAX_LOG_BYTES : MAX_MEDIA_BYTES

        return {
          allowedContentTypes,
          maximumSizeInBytes,
          addRandomSuffix: false,
          tokenPayload: JSON.stringify({ folder }),
        }
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    console.error("Client upload handler failed:", error)
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    )
  }
}
