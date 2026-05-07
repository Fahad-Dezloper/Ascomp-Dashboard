"use client"

import { useCallback, useEffect, useState } from "react"
import type { Route } from "next"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react"
import { toast } from "sonner"

type Item = {
  id: string
  createdAt: string
  assigneeIdAtRequest: string
  requester: { id: string; name: string; email: string }
  service: {
    id: string
    serviceNumber: string
    screenNumber: string | null
    date: string | null
    siteName: string
    address: string
    projectorModel: string
    projectorSerial: string
    currentAssignee: { id: string; name: string; email: string } | null
  }
}

export default function AdminAssignmentRequestsPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/assignment-requests", { credentials: "include" })
      if (!res.ok) {
        if (res.status === 403) toast.error("Admins only.")
        else toast.error("Could not load.")
        setItems([])
        return
      }
      const data = await res.json()
      setItems(data.items || [])
    } catch {
      toast.error("Could not load.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isLoading || !user) return
    if (user.role !== "ADMIN") {
      router.replace("/admin/dashboard")
      return
    }
    load()
  }, [isLoading, user, router, load])

  if (isLoading || !user || user.role !== "ADMIN") {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2 mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Pending assignment requests</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Engineers asked to take a visit already assigned to someone else. Coordinate or use{" "}
            <span className="font-medium">Force assign</span> on the service record if needed.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => load()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground border rounded-lg p-8 text-center">No pending requests.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((it) => (
            <li
              key={it.id}
              className="border rounded-lg p-4 flex flex-col md:flex-row md:items-start md:justify-between gap-4"
            >
              <div className="space-y-1 text-sm">
                <p className="font-semibold">
                  {it.service.siteName}
                  {it.service.screenNumber ? (
                    <span className="text-muted-foreground font-normal"> · Screen {it.service.screenNumber}</span>
                  ) : null}
                </p>
                <p className="text-muted-foreground">
                  Visit #{it.service.serviceNumber} · {it.service.projectorModel} | {it.service.projectorSerial}
                </p>
                <p>
                  <span className="text-muted-foreground">Request from:</span> {it.requester.name}{" "}
                  <span className="text-xs">({it.requester.email})</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Currently assigned:</span>{" "}
                  {it.service.currentAssignee?.name ?? "—"}{" "}
                  {it.service.currentAssignee?.email ? (
                    <span className="text-xs">({it.service.currentAssignee.email})</span>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  Requested {new Date(it.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/admin/dashboard/scheduled-services" as Route)}
                >
                  Open scheduled services
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
