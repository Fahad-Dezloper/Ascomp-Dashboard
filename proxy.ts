import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const publicRoutes = ["/", "/login"]
  const isPublicRoute = publicRoutes.includes(pathname)

  try {
    // Check for better-auth session cookie instead of calling auth.api.getSession()
    // This avoids loading Better Auth in middleware, which breaks async local storage
    const cookieHeader = request.headers.get("cookie") || ""
    const hasSessionCookie = cookieHeader.includes("auth_token") || 
                             cookieHeader.includes("better-auth") ||
                             cookieHeader.includes("session")

    if (!hasSessionCookie) {
      if (!isPublicRoute) {
        return NextResponse.redirect(new URL("/login", request.url))
      }
      const res = NextResponse.next()
      res.headers.set("x-middleware-cache", "no-cache")
      return res
    }

    // If there's a session cookie, allow the request to proceed
    // The actual session validation will happen in the page/component
    // This is safe because protected pages will redirect to login if session is invalid

    const res = NextResponse.next()
    res.headers.set("x-middleware-cache", "no-cache")
    return res
  } catch (error) {
    console.error("[Proxy] Auth check failed:", error)
    const res = NextResponse.next()
    res.headers.set("x-middleware-cache", "no-cache")
    return res
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
