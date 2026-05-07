import { NextResponse } from "next/server"

export function requireSessionUser(session: {
  user?: { id: string; role?: string }
} | null) {
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return null
}

/** Field engineers and admins may claim or manage assignment requests. */
export function canUseAssignmentRequests(role: string | undefined) {
  return role === "FIELD_WORKER" || role === "ADMIN"
}

export function requireAssignmentRole(session: {
  user?: { id: string; role?: string }
} | null) {
  const unauth = requireSessionUser(session)
  if (unauth) return unauth
  const role = session!.user!.role as string | undefined
  if (!canUseAssignmentRequests(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  return null
}
