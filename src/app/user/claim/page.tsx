"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Search, Loader2 } from "lucide-react"
import { toast } from "sonner"
import type { Route } from "next"

type ClaimState =
  | "completed"
  | "unassigned"
  | "mine"
  | "other"
  | "pending_mine"
  | "blocked_pending_other"

type ClaimableRow = {
  id: string
  serviceNumber: string
  screenNumber: string | null
  date: string | null
  cinemaName: string | null
  siteName: string
  siteAddress: string
  projectorModel: string
  projectorSerial: string
  projectorAssetStatus: string
  visitPhase: "completed" | "in_progress" | "pending" | "unassigned"
  assignedTo: { id: string; name: string } | null
  claimState: ClaimState
  myPendingRequestId: string | null
}

function phaseLabel(phase: ClaimableRow["visitPhase"]) {
  if (phase === "completed") return "This service visit finished"
  if (phase === "in_progress") return "Visit in progress"
  if (phase === "pending") return "Assigned — not started"
  return "Unassigned — open"
}

function projectorStatusLabel(s: string) {
  return s.replace(/_/g, " ")
}

export default function ClaimServicePage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [q, setQ] = useState("")
  const [debounced, setDebounced] = useState("")
  const [rows, setRows] = useState<ClaimableRow[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  const [openOnly, setOpenOnly] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 350)
    return () => clearTimeout(t)
  }, [q])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const url = new URL("/api/user/services/claimable", window.location.origin)
      if (debounced) url.searchParams.set("q", debounced)
      if (openOnly) url.searchParams.set("openOnly", "1")
      const res = await fetch(url.toString(), { credentials: "include" })
      if (!res.ok) {
        toast.error("Could not load visits.")
        setRows([])
        return
      }
      const data = await res.json()
      setRows(data.items || [])
    } catch {
      toast.error("Could not load visits.")
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [debounced, openOnly])

  useEffect(() => {
    if (isLoading || !user) return
    load()
  }, [isLoading, user, load])

  useEffect(() => {
    if (!isLoading && !user) router.push("/login")
  }, [isLoading, user, router])

  const claim = async (serviceRecordId: string) => {
    setActionId(serviceRecordId)
    try {
      const res = await fetch(`/api/user/service-records/${serviceRecordId}/claim`, {
        method: "POST",
        credentials: "include",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || "Could not claim or request.")
        return
      }
      if (data.kind === "claimed") {
        toast.success("Visit assigned to you. Open Workflow to start.")
      } else if (data.kind === "request_created") {
        toast.success(
          "Request sent. The current assignee and admins were notified — check Assignment requests.",
        )
      } else if (data.kind === "already_assigned") {
        toast.success("This visit is already yours.")
      } else if (data.kind === "request_pending") {
        toast.message("Your takeover request is already pending.")
      }
      await load()
    } finally {
      setActionId(null)
    }
  }

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-black" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white w-full">
      <div className="border-b-2 border-black p-4 sm:p-6">
        <div className="max-w-5xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4 border-2 border-transparent hover:border-black -ml-3"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold text-black">Claim a visit</h1>
          <p className="text-sm text-gray-600 mt-2 max-w-2xl">
            <strong className="text-black">Visit</strong> status (badges on the left) decides if you can claim or
            request a takeover. <strong className="text-black">Projector asset</strong> status (e.g. Completed) is
            separate — a projector can still show Completed while a <strong className="text-black">new open visit</strong>{" "}
            exists. To <strong className="text-black">start a new visit for yourself</strong> by site name or
            serial — the same flow as admin Schedule Service — open{" "}
            <button
              type="button"
              className="text-black font-semibold underline underline-offset-2"
              onClick={() => router.push("/user/schedule-visit" as Route)}
            >
              Schedule a visit
            </button>
            .
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-4">
            <label className="flex items-center gap-2 text-sm font-medium text-black cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 border-2 border-black rounded-sm accent-black"
                checked={openOnly}
                onChange={(e) => setOpenOnly(e.target.checked)}
              />
              Show only open visits (not completed)
            </label>
          </div>
          <div className="relative mt-4 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search site, cinema, serial, model..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9 border-2 border-gray-200"
            />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-black" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-gray-600 text-center py-12 border-2 border-dashed border-gray-300 rounded-sm">
            {openOnly
              ? "No open (incomplete) visits match your search. Turn off the filter to see all statuses."
              : "No visits match your search. Try another site, serial, or model."}
          </p>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <div
                key={r.id}
                className={`border-2 rounded-sm p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
                  r.claimState === "completed"
                    ? "border-gray-300 bg-gray-50/50"
                    : "border-black"
                }`}
              >
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-sm border ${
                        r.visitPhase === "completed"
                          ? "bg-gray-200 text-gray-800 border-gray-400"
                          : r.visitPhase === "in_progress"
                            ? "bg-amber-100 text-amber-900 border-amber-400"
                            : r.visitPhase === "pending"
                              ? "bg-blue-50 text-blue-900 border-blue-500"
                              : "bg-green-50 text-green-900 border-green-600"
                      }`}
                    >
                      {phaseLabel(r.visitPhase)}
                    </span>
                    <span className="text-xs font-medium text-gray-600 border border-gray-300 px-2 py-0.5 rounded-sm">
                      Projector asset: {projectorStatusLabel(r.projectorAssetStatus)}
                    </span>
                  </div>
                  {r.visitPhase !== "completed" &&
                    r.projectorAssetStatus?.toUpperCase() === "COMPLETED" && (
                      <p className="text-xs text-sky-800 bg-sky-50 border border-sky-200 px-2 py-1.5 rounded-sm">
                        Projector is marked Completed in master data — you can still claim or request this visit if
                        the visit itself is open (not finished).
                      </p>
                    )}
                  <p className="font-bold text-black">
                    {r.siteName}
                    {r.screenNumber ? (
                      <span className="text-gray-600 font-semibold"> · Screen {r.screenNumber}</span>
                    ) : null}
                  </p>
                  <p className="text-sm text-gray-600">
                    #{r.serviceNumber} · {r.projectorModel} | {r.projectorSerial}
                  </p>
                  {r.assignedTo ? (
                    <p className="text-xs text-gray-500">
                      Assigned: <span className="font-medium text-black">{r.assignedTo.name}</span>
                    </p>
                  ) : r.visitPhase === "unassigned" ? (
                    <p className="text-xs text-green-700 font-medium">Unassigned</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  {r.claimState === "completed" && (
                    <div className="flex flex-col items-end gap-2 max-w-[280px] text-right">
                      <span className="text-xs text-gray-600 py-1 px-2">
                        This past visit is finished — you cannot claim it again.
                      </span>
                      {user.role === "FIELD_WORKER" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-2 border-black"
                          onClick={() => router.push("/user/schedule-visit" as Route)}
                        >
                          Schedule a new visit (sites &amp; projectors)
                        </Button>
                      ) : (
                        <span className="text-[11px] text-gray-500 leading-snug px-2">
                          To schedule a new visit for an engineer, use{" "}
                          <strong className="text-gray-700">Admin → Schedule Service</strong> on the
                          projector.
                        </span>
                      )}
                    </div>
                  )}
                  {r.claimState === "unassigned" && (
                    <Button
                      size="sm"
                      className="bg-black text-white"
                      disabled={actionId === r.id}
                      onClick={() => claim(r.id)}
                    >
                      {actionId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Claim"}
                    </Button>
                  )}
                  {r.claimState === "mine" && (
                    <Button size="sm" variant="outline" onClick={() => router.push("/user/workflow")}>
                      Open workflow
                    </Button>
                  )}
                  {r.claimState === "other" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="border-2 border-black"
                      disabled={actionId === r.id}
                      onClick={() => claim(r.id)}
                    >
                      {actionId === r.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Request takeover"
                      )}
                    </Button>
                  )}
                  {r.claimState === "pending_mine" && (
                    <span className="text-xs text-amber-700 font-medium py-2 px-2">
                      Takeover pending
                    </span>
                  )}
                  {r.claimState === "blocked_pending_other" && (
                    <span className="text-xs text-gray-500 py-2 px-2 max-w-[200px]">
                      Another engineer&apos;s request is pending for this visit.
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
