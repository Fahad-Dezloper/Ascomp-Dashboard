"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2 } from "lucide-react"
import { toast } from "sonner"

type Row = {
  id: string
  createdAt: string
  requester: { id: string; name: string }
  service: {
    id: string
    serviceNumber: string
    screenNumber: string | null
    siteName: string
    projectorModel: string
    projectorSerial: string
  }
}

export default function AssignmentRequestsPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [outgoing, setOutgoing] = useState<Row[]>([])
  const [incoming, setIncoming] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [busyKey, setBusyKey] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/user/assignment-requests", { credentials: "include" })
      if (!res.ok) {
        toast.error("Could not load requests.")
        return
      }
      const data = await res.json()
      setOutgoing(data.outgoing || [])
      setIncoming(data.incoming || [])
    } catch {
      toast.error("Could not load requests.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isLoading || !user) return
    load()
  }, [isLoading, user, load])

  useEffect(() => {
    if (!isLoading && !user) router.push("/login")
  }, [isLoading, user, router])

  const act = async (
    actionKey: string,
    path: string,
    okMessage: string,
  ) => {
    setBusyKey(actionKey)
    try {
      const res = await fetch(path, { method: "POST", credentials: "include" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || "Action failed.")
        return
      }
      toast.success(okMessage)
      await load()
    } finally {
      setBusyKey(null)
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
        <div className="max-w-4xl mx-auto">
          <Button variant="ghost" onClick={() => router.back()} className="mb-4 -ml-3">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold text-black">Assignment requests</h1>
          <p className="text-sm text-gray-600 mt-2">
            Incoming: someone asked for a visit you hold. Outgoing: your takeover requests.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-10">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <>
            <section>
              <h2 className="text-lg font-bold border-b-2 border-black pb-2 mb-4">
                Incoming ({incoming.length})
              </h2>
              {incoming.length === 0 ? (
                <p className="text-gray-500 text-sm">No pending requests for your visits.</p>
              ) : (
                <ul className="space-y-3">
                  {incoming.map((r) => (
                    <li
                      key={r.id}
                      className="border-2 border-black rounded-sm p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                    >
                      <div>
                        <p className="font-semibold text-black">
                          {r.requester.name} wants: {r.service.siteName}{" "}
                          <span className="text-gray-600 font-normal">
                            · #{r.service.serviceNumber} · {r.service.projectorSerial}
                          </span>
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(r.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          className="bg-black text-white"
                          disabled={busyKey !== null}
                          onClick={() =>
                            act(
                              `${r.id}-approve`,
                              `/api/user/assignment-requests/${r.id}/approve`,
                              "Transfer approved. The other engineer is now assigned.",
                            )
                          }
                        >
                          {busyKey === `${r.id}-approve` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Approve transfer"
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyKey !== null}
                          onClick={() =>
                            act(
                              `${r.id}-deny`,
                              `/api/user/assignment-requests/${r.id}/deny`,
                              "Request denied.",
                            )
                          }
                        >
                          {busyKey === `${r.id}-deny` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Deny"
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busyKey !== null}
                          onClick={() =>
                            act(
                              `${r.id}-release`,
                              `/api/user/service-records/${r.service.id}/release`,
                              "You released this visit. It is unassigned; pending requests were cleared.",
                            )
                          }
                        >
                          {busyKey === `${r.id}-release` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Release visit"
                          )}
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h2 className="text-lg font-bold border-b-2 border-black pb-2 mb-4">
                Outgoing ({outgoing.length})
              </h2>
              {outgoing.length === 0 ? (
                <p className="text-gray-500 text-sm">You have no pending takeover requests.</p>
              ) : (
                <ul className="space-y-3">
                  {outgoing.map((r) => (
                    <li
                      key={r.id}
                      className="border-2 border-gray-200 rounded-sm p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                    >
                      <div>
                        <p className="font-medium text-black">
                          Waiting on assignee: {r.service.siteName} · #{r.service.serviceNumber} ·{" "}
                          {r.service.projectorSerial}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(r.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyKey !== null}
                        onClick={() =>
                          act(
                            `${r.id}-cancel`,
                            `/api/user/assignment-requests/${r.id}/cancel`,
                            "Request cancelled.",
                          )
                        }
                      >
                        {busyKey === `${r.id}-cancel` ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Cancel request"
                        )}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
