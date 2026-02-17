import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const publicRoutes = ["/", "/login"]
  const isPublicRoute = publicRoutes.includes(pathname)

  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      if (!isPublicRoute) {
        return NextResponse.redirect(new URL("/login", request.url))
      }
      const res = NextResponse.next()
      res.headers.set("x-middleware-cache", "no-cache")
      return res
    }

    const userRole = (session.user as { role?: string })?.role

    if (pathname === "/login" || pathname === "/") {
      if (userRole === "ADMIN") {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url))
      }
      if (userRole === "FIELD_WORKER") {
        return NextResponse.redirect(new URL("/user/workflow", request.url))
      }
    }

    if (pathname.startsWith("/admin") && userRole !== "ADMIN") {
      return NextResponse.redirect(new URL("/user/workflow", request.url))
    }

    if (pathname.startsWith("/user") && userRole === "ADMIN") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url))
    }

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
