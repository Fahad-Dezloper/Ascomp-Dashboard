"use client"

import { useRouter, useParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import ScheduleServiceModal from "./modals/schedule-service-modal"
import PdfPreviewDialog from "./pdf-preview-dialog"
import { FileText } from "lucide-react"

interface ProjectorDetailPageProps {
  siteId?: string
  projectorId?: string
}

interface ProjectorData {
  id: string
  name: string
  model: string
  serialNumber: string
  installDate: string
  lastServiceDate: string
  status: "completed" | "pending" | "scheduled"
  nextServiceDue: string
  serviceHistory: Array<{
    id: string
    date: string | null
    technician?: string
    notes?: string
    nextDue?: string
    status?: string
    reportUrl?: string | null
    reportGenerated?: boolean
  }>
}

interface SiteData {
  id: string
  name: string
  address: string
  projectors: ProjectorData[]
}

export default function ProjectorDetailPage({ siteId: siteIdProp, projectorId: projectorIdProp }: ProjectorDetailPageProps) {
  const router = useRouter()
  const params = useParams<{ siteId?: string; projectorId?: string }>()
  const siteId = siteIdProp ?? params?.siteId ?? ""
  const projectorId = projectorIdProp ?? params?.projectorId ?? ""
  const [site, setSite] = useState<SiteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSchedule, setShowSchedule] = useState(false)
  const [previewServiceId, setPreviewServiceId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  useEffect(() => {
    const fetchProjector = async () => {
      if (!siteId) {
        setError("Missing site id")
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/admin/sites/${siteId}`)
        if (!response.ok) {
          throw new Error("Failed to fetch site")
        }
        const data = await response.json()
        setSite(data.site)
      } catch (err) {
        console.error("Error fetching projector:", err)
        setError(err instanceof Error ? err.message : "Unable to load projector")
        setSite(null)
      } finally {
        setLoading(false)
      }
    }

    fetchProjector()
  }, [siteId, projectorId])

  const projector = useMemo(() => site?.projectors.find((p) => p.id === projectorId) ?? null, [site, projectorId])

  const handleDeleteProjector = async () => {
    if (!projectorId) return

    try {
      setDeleting(true)
      const response = await fetch("/api/admin/projectors", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ projectorId }),
      })

      const result = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(result?.error || "Failed to delete projector")
      }

      router.push(`/admin/dashboard/sites/${siteId}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete projector"
      console.error("Failed to delete projector:", message)
    } finally {
      setDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !site || !projector) {
    return (
      <Card className="border-border p-6 text-center">
        <CardContent>
          <p className="text-muted-foreground">{error || "Projector not found"}</p>
          <Button className="mt-4" variant="outline" onClick={() => router.push(`/admin/dashboard/sites/${siteId}`)}>
            Back to Site
          </Button>
        </CardContent>
      </Card>
    )
  }

  const statusColor =
    projector.status === "pending"
      ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
      : projector.status === "completed"
        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
        : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"

  return (
    <div className="space-y-6">
      <Card className="border-border bg-white shadow-sm">
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">{projector.name}</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">{site.name}</p>
            </div>
            <Badge className={`${statusColor} px-3 py-1 text-sm`}>
              {projector.status.charAt(0).toUpperCase() + projector.status.slice(1)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Serial Number</p>
              <p className="text-base text-foreground font-medium">{projector.serialNumber}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Model</p>
              <p className="text-base text-foreground font-medium">{projector.model}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Last Service</p>
              <p className="text-base text-foreground font-medium">
                {projector.lastServiceDate ? new Date(projector.lastServiceDate).toLocaleDateString() : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Status</p>
              <p className="text-base text-foreground font-medium">{projector.status.toUpperCase()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => router.push(`/admin/dashboard/sites/${siteId}`)}>
          Back to Site
        </Button>
        {projector.status === "pending" && (
          <Button onClick={() => setShowSchedule(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
            Schedule Service
          </Button>
        )}
        <Button
          variant="destructive"
          onClick={() => setShowDeleteDialog(true)}
          disabled={deleting}
        >
          {deleting ? "Deleting..." : "Delete Projector"}
        </Button>
      </div>

      <Card className="border-border bg-white shadow-sm">
        <CardHeader className="pb-4 border-b border-border">
          <CardTitle className="text-lg">Service History</CardTitle>
        </CardHeader>
        <CardContent className="p-6 grid grid-cols-3">
          {projector.serviceHistory.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-border rounded-lg">
               <p className="text-sm text-muted-foreground">No service records available yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {projector.serviceHistory.map((service, index) => {
                const statusLabel = service.status
                  ? service.status.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())
                  : "Completed"
                const statusStyles =
                  service.status === "pending"
                    ? "bg-red-100 text-red-700"
                    : service.status === "scheduled" || service.status === "in_progress"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-green-100 text-green-700"

                return (
                  <Card key={service.id} className="border border-border shadow-sm">
                    <CardContent className="">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                           <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-bold text-sm">
                             #{projector.serviceHistory.length - index}
                           </div>
                           <div>
                             <h4 className="text-sm font-semibold text-foreground">
                               Service Record
                             </h4>
                             <p className="text-xs text-muted-foreground">
                               {service.date ? new Date(service.date).toLocaleDateString("en-US", {
                                 year: "numeric",
                                 month: "short",
                                 day: "numeric",
                               }) : "—"}
                             </p>
                           </div>
                        </div>
                        <Badge className={`${statusStyles} text-xs px-2.5 py-0.5`}>{statusLabel}</Badge>
                      </div>

                       <div className="grid grid-cols-2 md:grid-cols-2 gap-4 mb-4 pt-4 border-t border-border">
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Technician</p>
                            <p className="text-sm font-medium text-foreground">{service.technician || "Unassigned"}</p>
                          </div>
                           <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Date</p>
                            <p className="text-sm font-medium text-foreground">
                                {service.date
                                  ? new Date(service.date).toLocaleDateString()
                                  : "—"}
                            </p>
                          </div>
                            {service.notes && (
                            <div className="col-span-2">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Notes</p>
                                <p className="text-sm text-foreground line-clamp-1" title={service.notes}>{service.notes}</p>
                            </div>
                            )}
                       </div>

                      {/* Preview & Download Button */}
                      <div className="flex justify-end pt-3 border-t border-border">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPreviewServiceId(service.id)}
                          className="gap-2 h-8 text-xs"
                        >
                          <FileText className="h-3 w-3" />
                          View Report
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {showSchedule && (
        <ScheduleServiceModal siteId={siteId} projectorId={projectorId} onClose={() => setShowSchedule(false)} />
      )}

      {previewServiceId && (
        <PdfPreviewDialog
          open={!!previewServiceId}
          onOpenChange={(open) => {
            if (!open) setPreviewServiceId(null)
          }}
          serviceRecordId={previewServiceId}
        />
      )}

      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-foreground mb-2">Delete Projector</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Are you sure you want to delete this projector?
              <br />
              <span className="font-semibold text-destructive">
                All details of this projector and its service records will be permanently deleted.
              </span>
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                className="border-border"
                onClick={() => !deleting && setShowDeleteDialog(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteProjector}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
