"use client"

import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import ProjectorDetails from "./projector-details"
import AddProjectorModal from "./modals/add-projector-modal"
import ScheduleServiceModal from "./modals/schedule-service-modal"
import EditSiteModal from "./modals/edit-site-modal"
import { useState, useEffect } from "react"
import type { Site, Projector } from "@/lib/types"

interface SiteDetailPageProps {
  siteId?: string
}

export default function SiteDetailPage({ siteId: siteIdProp }: SiteDetailPageProps) {
  const router = useRouter()
  const params = useParams<{ siteId?: string }>()
  const siteId = siteIdProp ?? params?.siteId ?? ""
  const [site, setSite] = useState<Site | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddProjector, setShowAddProjector] = useState(false)
  const [showEditSite, setShowEditSite] = useState(false)
  const [selectedProjector, setSelectedProjector] = useState<{ siteId: string; projectorId: string } | null>(null)
  const [_showSchedule, setShowSchedule] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletingSite, setDeletingSite] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSite = async () => {
      if (!siteId) {
        setLoading(false)
        setSite(null)
        return
      }

      try {
        setLoading(true)
        const response = await fetch(`/api/admin/sites/${siteId}`)
        if (!response.ok) {
          throw new Error("Failed to fetch site")
        }
        const result = await response.json()
        setSite(result.site)
      } catch (error) {
        console.error("Error fetching site:", error)
        setSite(null)
      } finally {
        setLoading(false)
      }
    }

    fetchSite()
  }, [siteId])

  const handleDeleteSite = async () => {
    if (!siteId) return

    try {
      setDeletingSite(true)
      setDeleteError(null)
      const response = await fetch(`/api/admin/sites/${siteId}`, {
        method: "DELETE",
      })

      const result = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(result?.error || "Failed to delete site")
      }

      router.push("/admin/dashboard/sites")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete site"
      console.error("Failed to delete site:", error)
      setDeleteError(message)
    } finally {
      setDeletingSite(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!site) {
    return (
      <Card className="border-border p-6 text-center">
        <p className="text-muted-foreground">Site not found</p>
      </Card>
    )
  }

  const totalServices = site.projectors.reduce((acc, proj) => acc + proj.serviceHistory.length, 0)
  const pendingProjectors = site.projectors.filter((p) => p.status === "pending").length

  return (
    <div className="space-y-6">
      {/* Site Header Info */}
      <Card className="border-border bg-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">{site.name}</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowEditSite(true)}
              >
                Edit Site
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                disabled={deletingSite}
              >
                {deletingSite ? "Deleting..." : "Delete Site"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Address</p>
              <p className="text-foreground">{site.address}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Location</p>
              <p className="text-foreground">{site.location}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Created Date</p>
              <p className="text-foreground font-medium">{new Date(site.createdDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Total Projectors</p>
              <p className="text-foreground font-medium">{site.projectors.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Site Statistics - Simplified */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-border bg-white shadow-sm">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Projectors</p>
            <p className="text-2xl font-bold mt-1 text-foreground">{site.projectors.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-white shadow-sm">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Services</p>
            <p className="text-2xl font-bold mt-1 text-foreground">{totalServices}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-white shadow-sm">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pending</p>
            <p className="text-2xl font-bold mt-1 text-red-600">{pendingProjectors}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-white shadow-sm">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Completed</p>
            <p className="text-2xl font-bold mt-1 text-green-600">{site.projectors.filter(p => p.status === 'completed').length}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-white shadow-sm">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Packed</p>
            <p className="text-2xl font-bold mt-1 text-amber-600">{site.projectors.filter(p => p.status === 'packed').length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Projectors Section */}
      <Card className="border-border bg-white shadow-sm">
        <CardHeader className="pb-4 border-b border-border flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Projectors</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Manage projectors and their service schedules</p>
          </div>
          <Button
            size="sm"
            onClick={() => setShowAddProjector(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Add Projector
          </Button>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-3 gap-4">
            {site.projectors.length === 0 ? (
              <p className="text-sm text-muted-foreground">No projectors added to this site yet.</p>
            ) : (
              site.projectors.map((projector) => {
                // Convert to Projector type for ProjectorDetails component
                const projectorForDetails: Projector = {
                  id: projector.id,
                  name: projector.name,
                  model: projector.model,
                  serialNumber: projector.serialNumber,
                  installDate: projector.installDate,
                  lastServiceDate: projector.lastServiceDate,
                  status: projector.status,
                  nextServiceDue: projector.nextServiceDue,
                  serviceHistory: projector.serviceHistory || [],
                }
                return (
                  <ProjectorDetails
                    key={projector.id}
                    site={site}
                    projector={projectorForDetails}
                    onSchedule={() => {
                      setSelectedProjector({ siteId: site.id, projectorId: projector.id })
                      setShowSchedule(true)
                    }}
                    onViewDetails={() => router.push(`/admin/dashboard/sites/${site.id}/projectors/${projector.id}`)}
                  />
                )
              })
            )}
          </div>
        </CardContent>
      </Card>

      {showEditSite && (
        <EditSiteModal
          site={site}
          onClose={() => setShowEditSite(false)}
          onSuccess={() => {
            router.refresh()
            // Re-fetch site data locally to update the UI
            const fetchSite = async () => {
              try {
                const response = await fetch(`/api/admin/sites/${siteId}`)
                if (response.ok) {
                  const data = await response.json()
                  setSite(data.site)
                }
              } catch (err) {
                console.error("Error refreshing site:", err)
              }
            }
            fetchSite()
          }}
        />
      )}

      {showAddProjector && (
        <AddProjectorModal
          siteId={siteId}
          onClose={() => setShowAddProjector(false)}
          onSuccess={() => {
            // Refresh site data
            fetch(`/api/admin/sites/${siteId}`)
              .then((res) => res.json())
              .then((data) => setSite(data.site))
              .catch((err) => console.error("Error refreshing site:", err))
            setShowAddProjector(false)
          }}
        />
      )}
      {selectedProjector && (
        <ScheduleServiceModal
          siteId={selectedProjector.siteId}
          projectorId={selectedProjector.projectorId}
          onClose={() => {
            setSelectedProjector(null)
            setShowSchedule(false)
          }}
          onSuccess={() => {
            // Refresh site data
            fetch(`/api/admin/sites/${siteId}`)
              .then((res) => res.json())
              .then((data) => setSite(data.site))
              .catch((err) => console.error("Error refreshing site:", err))
            setSelectedProjector(null)
            setShowSchedule(false)
          }}
        />
      )}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-foreground mb-2">Delete Site</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Are you sure you want to delete the site{" "}
              <span className="font-semibold text-foreground">{site.name}</span>?
              <br />
              <span className="font-semibold text-destructive">
                All projectors from this site and all their service records will be permanently deleted.
              </span>
            </p>
            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-700 dark:text-red-400">{deleteError}</p>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                className="border-border"
                onClick={() => {
                  if (!deletingSite) {
                    setShowDeleteDialog(false)
                    setDeleteError(null)
                  }
                }}
                disabled={deletingSite}
              >
                {deleteError ? "Close" : "Cancel"}
              </Button>
              {deleteError ? (
                <Button
                  variant="destructive"
                  onClick={handleDeleteSite}
                  disabled={deletingSite}
                >
                  {deletingSite ? "Retrying..." : "Retry"}
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  onClick={handleDeleteSite}
                  disabled={deletingSite}
                >
                  {deletingSite ? "Deleting..." : "Delete"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
