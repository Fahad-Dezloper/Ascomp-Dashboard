"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type PendingService = {
  id: string
  serviceNumber: string
  date: string | null
  completedAt: string
  verificationStatus: "PENDING" | "VERIFIED"
  lastEditedAt: string | null
  lastEditedBy: {
    id: string
    name: string
  } | null
  editCount: number
  site: {
    id: string
    siteName: string
    address: string
  }
  projector: {
    id: string
    modelNo: string
    serialNo: string
  }
  engineer: {
    id: string
    name: string
    email: string
  } | null
}

export default function VerificationPage() {
  const router = useRouter()
  const [services, setServices] = useState<PendingService[]>([])
  const [loading, setLoading] = useState(true)
  const [verifyingId, setVerifyingId] = useState<string | null>(null)
  const [dateScope, setDateScope] = useState<"today" | "all">("today")

  const loadPendingServices = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/service-records/verification", {
        cache: "no-store",
      })
      if (!response.ok) {
        setServices([])
        return
      }
      const data = await response.json()
      setServices(data.services || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPendingServices()
  }, [])

  const isToday = (isoDate: string | null | undefined) => {
    if (!isoDate) return false
    const date = new Date(isoDate)
    const now = new Date()
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    )
  }

  const filteredServices =
    dateScope === "today"
      ? services.filter((service) => isToday(service.date || service.completedAt))
      : services

  const formatAuditInfo = (service: PendingService) => {
    if (!service.lastEditedAt) return "No admin edits after submission"
    const editorName = service.lastEditedBy?.name || "Admin"
    const changedText = `${service.editCount} field${service.editCount === 1 ? "" : "s"} changed`
    return `Last edited by ${editorName} on ${new Date(service.lastEditedAt).toLocaleString()} (${changedText})`
  }

  const handleVerify = async (serviceRecordId: string) => {
    try {
      setVerifyingId(serviceRecordId)
      const response = await fetch("/api/admin/service-records/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceRecordId }),
      })
      if (!response.ok) return
      setServices((prev) => prev.filter((service) => service.id !== serviceRecordId))
    } finally {
      setVerifyingId(null)
    }
  }

  return (
    <div className="p-6 flex flex-col gap-6 bg-gray-50/50 min-h-screen">
      <div className="w-full flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">Service Verification</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Pending Verifications</CardTitle>
            <div className="inline-flex rounded-md border overflow-hidden">
              <Button
                variant={dateScope === "today" ? "default" : "ghost"}
                className="rounded-none h-8 px-3 text-xs"
                onClick={() => setDateScope("today")}
              >
                Today
              </Button>
              <Button
                variant={dateScope === "all" ? "default" : "ghost"}
                className="rounded-none h-8 px-3 text-xs"
                onClick={() => setDateScope("all")}
              >
                All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading pending records...
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="text-sm text-muted-foreground">No records pending verification.</div>
          ) : (
            <div className="space-y-3">
              {filteredServices.map((service) => (
                <div key={service.id} className="border rounded-md p-4 bg-white flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <div className="font-semibold">
                      Service #{service.serviceNumber} - {service.site.siteName}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {service.projector.modelNo} ({service.projector.serialNo})
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Engineer: {service.engineer?.name || "Unassigned"} | Service Date:{" "}
                      {service.date ? new Date(service.date).toLocaleDateString() : "N/A"} | Completed:{" "}
                      {new Date(service.completedAt).toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatAuditInfo(service)}
                    </div>
                  </div>

                  <div className="flex w-full md:w-auto gap-2">
                    <Button
                      variant="outline"
                      className="w-full md:w-auto"
                      onClick={() =>
                        router.push(
                          `/admin/dashboard/overview?edit=${service.id}&from=verification`,
                        )
                      }
                    >
                      Edit
                    </Button>
                    <Button
                      onClick={() => handleVerify(service.id)}
                      disabled={verifyingId === service.id}
                      className="w-full md:w-auto"
                    >
                      {verifyingId === service.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Verify
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
