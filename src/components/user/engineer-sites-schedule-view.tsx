"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import SearchBar from "@/components/search-bar"
import ProjectorDetails from "@/components/admin/projector-details"
import SelfScheduleModal from "@/components/user/self-schedule-modal"
import { ChevronDown, ChevronUp } from "lucide-react"
import type { Site, Projector } from "@/lib/types"
import { toast } from "sonner"
import { matchesSitesDirectorySearch } from "@/lib/site-directory-search"

interface ProjectorData {
  id: string
  name: string
  model: string
  serialNumber: string
  address?: string | null
  region?: string | null
  state?: string | null
  installDate: string
  lastServiceDate: string
  status: "completed" | "pending" | "scheduled" | "packed"
  nextServiceDue: string
  serviceHistory: unknown[]
}

interface SiteData {
  id: string
  name: string
  location: string
  address: string
  contactDetails: string
  createdDate: string
  siteCode?: string | null
  email?: string | null
  projectors: ProjectorData[]
}

/**
 * Same layout as Admin → Sites &amp; Projectors: search by site name, address, or projector serial/model,
 * expand a site, pick a projector, then assign the next open visit to yourself (admin “Schedule Service” rules).
 */
export default function EngineerSitesScheduleView() {
  const [sites, setSites] = useState<SiteData[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedSites, setExpandedSites] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedProjector, setSelectedProjector] = useState<{
    siteId: string
    projectorId: string
  } | null>(null)
  const [showSelfSchedule, setShowSelfSchedule] = useState(false)

  const fetchSites = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/user/sites-for-schedule", { credentials: "include" })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || "Failed to load sites")
      }
      const result = await response.json()
      setSites(result.sites || [])
    } catch (e) {
      console.error(e)
      toast.error(e instanceof Error ? e.message : "Could not load sites.")
      setSites([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSites()
  }, [])

  const toggleSite = (siteId: string) => {
    const next = new Set(expandedSites)
    if (next.has(siteId)) next.delete(siteId)
    else next.add(siteId)
    setExpandedSites(next)
  }

  const filteredSites = useMemo(() => {
    if (!searchQuery.trim()) return sites
    return sites.filter((site) => matchesSitesDirectorySearch(searchQuery, site))
  }, [sites, searchQuery])

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Schedule a visit</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Search matches site name, address, contact, site code, and projector fields (serial, model, region, state) —
          multi-word queries work like AMC lookup. Same list as admin Sites &amp; Projectors (scoped to your PVR access).
          Expand a site, choose <strong className="text-foreground">Assign to me</strong>, pick the visit date, and
          confirm. Uses the same scheduling rules as when an admin schedules you.
        </p>
      </div>

      <SearchBar
        placeholder="Site name or address (multi-word OK), contact, site code, projector serial/model/region…"
        value={searchQuery}
        onChange={setSearchQuery}
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="border-border">
              <div className="p-4">
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-64" />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1 items-start">
          {filteredSites.length === 0 ? (
            <div className="border border-border p-6 text-center bg-background rounded-lg col-span-full">
              <p className="text-muted-foreground">No sites match your search.</p>
            </div>
          ) : (
            filteredSites.map((site) => {
              const completedCount = site.projectors.filter((p) => p.status === "completed").length
              const pendingCount = site.projectors.filter((p) => p.status === "pending").length
              const scheduledCount = site.projectors.filter((p) => p.status === "scheduled").length

              return (
                <div
                  key={site.id}
                  className="border border-border bg-background rounded-lg shadow-sm"
                >
                  <div className="p-5">
                    <div className="mb-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="text-base font-bold text-foreground mb-0.5">{site.name}</h3>
                          {(site as { siteCode?: string | null }).siteCode && (
                            <p className="text-xs text-muted-foreground">
                              Site Code: {(site as { siteCode?: string }).siteCode}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Address</p>
                        <p className="text-sm text-foreground">{site.address}</p>
                      </div>
                      {site.contactDetails ? (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Contact</p>
                          <p className="text-sm text-foreground">{site.contactDetails}</p>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-3 pt-3 border-t border-border mt-3">
                      <div className="flex-1 text-center border-r border-border last:border-0 px-1">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                          Projectors
                        </p>
                        <p className="text-sm font-bold text-foreground">{site.projectors.length}</p>
                      </div>
                      <div className="flex-1 text-center border-r border-border last:border-0 px-1">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                          Pending
                        </p>
                        <p className="text-sm font-bold text-red-600">{pendingCount}</p>
                      </div>
                      <div className="flex-1 text-center border-r border-border last:border-0 px-1">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                          Scheduled
                        </p>
                        <p className="text-sm font-bold text-blue-600">{scheduledCount}</p>
                      </div>
                      <div className="flex-1 text-center px-1">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                          Completed
                        </p>
                        <p className="text-sm font-bold text-green-600">{completedCount}</p>
                      </div>
                    </div>

                    <div className="pt-2 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          toggleSite(site.id)
                        }}
                        className="w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground h-8"
                      >
                        {expandedSites.has(site.id) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {expandedSites.has(site.id) && (
                    <div className="border-t border-border bg-muted/20 p-5">
                      <h4 className="text-sm font-semibold text-foreground mb-3">Projectors</h4>
                      {site.projectors.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">No projectors at this site.</p>
                      ) : (
                        <div className="space-y-2">
                          {site.projectors.map((projector) => {
                            const projectorForDetails: Projector = {
                              id: projector.id,
                              name: projector.name,
                              model: projector.model,
                              serialNumber: projector.serialNumber,
                              installDate: projector.installDate ?? "",
                              lastServiceDate: projector.lastServiceDate,
                              status: projector.status,
                              nextServiceDue: projector.nextServiceDue,
                              serviceHistory: (projector.serviceHistory || []) as Projector["serviceHistory"],
                            }
                            const siteForDetails: Site = {
                              id: site.id,
                              name: site.name,
                              location: site.location,
                              address: site.address,
                              createdDate: site.createdDate,
                              projectors: [],
                              contactDetails: site.contactDetails,
                              siteCode: (site as { siteCode?: string }).siteCode,
                              email: undefined,
                            }
                            return (
                              <ProjectorDetails
                                key={projector.id}
                                site={siteForDetails}
                                projector={projectorForDetails}
                                scheduleButtonLabel="Assign to me"
                                onSchedule={() => {
                                  setSelectedProjector({
                                    siteId: site.id,
                                    projectorId: projector.id,
                                  })
                                  setShowSelfSchedule(true)
                                }}
                              />
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {selectedProjector && showSelfSchedule && (
        <SelfScheduleModal
          siteId={selectedProjector.siteId}
          projectorId={selectedProjector.projectorId}
          onClose={() => {
            setSelectedProjector(null)
            setShowSelfSchedule(false)
          }}
          onSuccess={() => {
            toast.success("Visit assigned to you. Open Workflow when you are ready.")
            fetchSites()
            setSelectedProjector(null)
            setShowSelfSchedule(false)
          }}
        />
      )}
    </div>
  )
}
