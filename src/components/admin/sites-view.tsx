"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import SearchBar from "../search-bar";
import { useAuth } from "@/lib/auth-context";

import AddSiteModal from "./modals/add-site-modal";
import EditSiteModal from "./modals/edit-site-modal";
import AddProjectorModal from "./modals/add-projector-modal";
import EditProjectorModal from "./modals/edit-projector-modal";
import ScheduleServiceModal from "./modals/schedule-service-modal";
import ProjectorDetails from "./projector-details";
import { ChevronDown, ChevronUp, Edit } from "lucide-react";
import type { Site, Projector } from "@/lib/types";
import { matchesSitesDirectorySearch } from "@/lib/site-directory-search";

interface ProjectorData {
  id: string;
  name: string;
  model: string;
  serialNumber: string;
  address?: string | null;
  region?: string | null;
  state?: string | null;
  installDate: string;
  lastServiceDate: string;
  status: "completed" | "pending" | "scheduled" | "packed";
  nextServiceDue: string;
  serviceHistory: any[];
}

interface SiteData {
  id: string;
  name: string;
  location: string;
  address: string;
  contactDetails: string;
  siteCode?: string | null;
  email?: string | null;
  screenNo: string;
  createdDate: string;
  totalCompletedServices?: number;
  projectors: ProjectorData[];
}

export default function SitesView() {
  const router = useRouter();
  const { user } = useAuth();
  const canEdit = user?.accessLevel !== "READ_ONLY";
  const [sites, setSites] = useState<SiteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSites, setExpandedSites] = useState<Set<string>>(new Set());
  const [showAddSite, setShowAddSite] = useState(false);
  const [showEditSite, setShowEditSite] = useState(false);
  const [siteToEdit, setSiteToEdit] = useState<SiteData | null>(null);
  const [showEditProjector, setShowEditProjector] = useState(false);
  const [projectorToEdit, setProjectorToEdit] = useState<any>(null);
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [selectedProjector, setSelectedProjector] = useState<{
    siteId: string;
    projectorId: string;
  } | null>(null);
  const [_showSchedule, setShowSchedule] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [projectorFilter] = useState<string>("ALL");

  const fetchSites = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/sites");

      if (!response.ok) {
        let errorMessage = "Failed to fetch sites";
        try {
          const errorResult = await response.json();
          errorMessage = errorResult.error || errorMessage;
        } catch {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        console.error("Error fetching sites:", errorMessage, response.status);
        throw new Error(errorMessage);
      }

      const result = await response.json();
      setSites(result.sites || []);
      // Don't expand sites by default - keep them closed
    } catch (error) {
      console.error("Error fetching sites:", error);
      setSites([]);
      // Error is logged but we don't show it to user to avoid breaking the UI
      // The empty sites array will show "No sites found" message
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();
  }, []);

  const toggleSite = (siteId: string) => {
    const newExpanded = new Set(expandedSites);
    if (newExpanded.has(siteId)) {
      newExpanded.delete(siteId);
    } else {
      newExpanded.add(siteId);
    }
    setExpandedSites(newExpanded);
  };

  const filteredSites = useMemo(() => {
    return sites
      .filter((site) => matchesSitesDirectorySearch(searchQuery, site))
      .map((site) => ({
        ...site,
        projectors: site.projectors.filter((p) => {
          if (projectorFilter === "all") return true;
          if (projectorFilter === "completed") return p.status === "completed";
          if (projectorFilter === "pending") return p.status === "pending";
          if (projectorFilter === "scheduled") return p.status === "scheduled";
          return true;
        }),
      }));
  }, [sites, searchQuery, projectorFilter]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-foreground">
          Sites &amp; Projectors
        </h2>
        {canEdit && (
          <Button
            onClick={() => setShowAddSite(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Add Site
          </Button>
        )}
      </div>

      <SearchBar
        placeholder="Site name or address (multi-word OK), contact, site code, projector serial/model/region…"
        value={searchQuery}
        onChange={setSearchQuery}
      />

      {/* <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">Projector Status</p>
        <FilterTabs
          tabs={["all", "completed", "pending", "scheduled"]}
          activeTab={projectorFilter}
          onTabChange={setProjectorFilter}
        />
      </div> */}

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
            <div className="border border-border p-6 text-center bg-background">
              <p className="text-muted-foreground">
                No sites found matching your search.
              </p>
            </div>
          ) : (
            filteredSites.map((site) => {
              const completedCount = site.projectors.filter(
                (p) => p.status === "completed",
              ).length;
              const pendingCount = site.projectors.filter(
                (p) => p.status === "pending",
              ).length;
              const scheduledCount = site.projectors.filter(
                (p) => p.status === "scheduled",
              ).length;

              const siteInfo = site as any; // Type assertion to access additional fields

              return (
                <div
                  key={site.id}
                  className="border border-border bg-background rounded-lg shadow-sm"
                >
                  <div className="p-5">
                    {/* Site Header */}
                    <div className="mb-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="text-base font-bold text-foreground mb-0.5">
                            {site.name}
                          </h3>
                          {siteInfo?.siteCode && (
                            <p className="text-xs text-muted-foreground">
                              Site Code: {siteInfo.siteCode}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          {canEdit && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSiteToEdit(site);
                                setShowEditSite(true);
                              }}
                              className="border-border h-8 text-xs px-2"
                              title="Edit Site"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              router.push(`/admin/dashboard/sites/${site.id}`);
                            }}
                            className="border-border h-8 text-xs px-3"
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Site Information */}
                    <div className="space-y-2 mb-4">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Address
                        </p>
                        <p className="text-sm text-foreground">
                          {site.address}
                        </p>
                      </div>
                      {site.contactDetails && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Contact Details
                          </p>
                          <p className="text-sm text-foreground">
                            {site.contactDetails}
                          </p>
                        </div>
                      )}
                      {/* <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Created Date</p>
                      <p className="text-sm text-foreground">
                        {new Date(site.createdDate).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div> */}
                    </div>

                    {/* Statistics */}
                    {/* Statistics - Simplified */}
                    <div className="flex items-center gap-3 pt-3 border-t border-border mt-3">
                      <div className="flex-1 text-center border-r border-border last:border-0 px-1">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                          Projectors
                        </p>
                        <p className="text-sm font-bold text-foreground">
                          {site.projectors.length}
                        </p>
                      </div>
                      <div className="flex-1 text-center border-r border-border last:border-0 px-1">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                          Pending
                        </p>
                        <p className="text-sm font-bold text-red-600">
                          {pendingCount}
                        </p>
                      </div>
                      <div className="flex-1 text-center border-r border-border last:border-0 px-1">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                          Scheduled
                        </p>
                        <p className="text-sm font-bold text-blue-600">
                          {scheduledCount}
                        </p>
                      </div>
                      <div className="flex-1 text-center border-r border-border last:border-0 px-1">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                          Completed
                        </p>
                        <p className="text-sm font-bold text-green-600">
                          {completedCount}
                        </p>
                      </div>
                    </div>

                    {/* Toggle Button at the end */}
                    <div className="pt-2 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleSite(site.id);
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
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <h4 className="text-sm font-semibold text-foreground mb-0.5">
                            Projectors
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {site.projectors.length} projector
                            {site.projectors.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                        {canEdit && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSite(site.id);
                            }}
                            className="border-border"
                          >
                            Add Projector
                          </Button>
                        )}
                      </div>

                      {site.projectors.length === 0 ? (
                        <div className="py-6 text-center border border-dashed border-border">
                          <p className="text-sm text-muted-foreground mb-3">
                            No projectors match the selected filter.
                          </p>
                          {canEdit && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSite(site.id);
                              }}
                              className="border-border"
                            >
                              Add First Projector
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {site.projectors.map((projector) => {
                            const projectorForDetails: Projector = {
                              id: projector.id,
                              name: projector.name,
                              model: projector.model,
                              serialNumber: projector.serialNumber,
                              installDate: projector.installDate,
                              lastServiceDate: projector.lastServiceDate,
                              status: projector.status,
                              nextServiceDue: projector.nextServiceDue,
                              serviceHistory: projector.serviceHistory,
                            };
                            const siteForDetails: Site = {
                              id: site.id,
                              name: site.name,
                              location: site.location,
                              address: site.address,
                              createdDate: site.createdDate,
                              projectors: [],
                              contactDetails: site.contactDetails,
                              siteCode: (site as any).siteCode,
                              email: (site as any).email,
                            };
                            return (
                              <ProjectorDetails
                                key={projector.id}
                                site={siteForDetails}
                                projector={projectorForDetails}
                                onSchedule={
                                  canEdit
                                    ? () => {
                                        setSelectedProjector({
                                          siteId: site.id,
                                          projectorId: projector.id,
                                        });
                                        setShowSchedule(true);
                                      }
                                    : undefined
                                }
                                onEdit={
                                  canEdit
                                    ? () => {
                                        setProjectorToEdit({
                                          ...projector,
                                          siteId: site.id,
                                        });
                                        setShowEditProjector(true);
                                      }
                                    : undefined
                                }
                                onViewDetails={() =>
                                  router.push(
                                    `/admin/dashboard/sites/${site.id}/projectors/${projector.id}`,
                                  )
                                }
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {showAddSite && (
        <AddSiteModal
          onClose={() => setShowAddSite(false)}
          onSuccess={() => {
            fetchSites();
          }}
        />
      )}
      {showEditSite && siteToEdit && (
        <EditSiteModal
          site={siteToEdit}
          onClose={() => {
            setShowEditSite(false);
            setSiteToEdit(null);
          }}
          onSuccess={() => {
            fetchSites();
          }}
        />
      )}
      {selectedSite && (
        <AddProjectorModal
          siteId={selectedSite}
          onClose={() => setSelectedSite(null)}
          onSuccess={() => {
            fetchSites();
            setSelectedSite(null);
          }}
        />
      )}
      {showEditProjector && projectorToEdit && (
        <EditProjectorModal
          projector={{
            id: projectorToEdit.id,
            serialNo: projectorToEdit.serialNumber,
            modelNo: projectorToEdit.model,
            status: projectorToEdit.status.toUpperCase(),
            address: projectorToEdit.address,
            state: projectorToEdit.state,
            region: projectorToEdit.region,
            pvr: projectorToEdit.pvr,
            siteId: projectorToEdit.siteId,
          }}
          onClose={() => {
            setShowEditProjector(false);
            setProjectorToEdit(null);
          }}
          onSuccess={() => {
            fetchSites();
          }}
        />
      )}
      {selectedProjector && (
        <ScheduleServiceModal
          siteId={selectedProjector.siteId}
          projectorId={selectedProjector.projectorId}
          onClose={() => {
            setSelectedProjector(null);
            setShowSchedule(false);
          }}
          onSuccess={() => {
            // Optimistic update: immediately update the local state
            setSites((prevSites) =>
              prevSites.map((site) => {
                if (site.id === selectedProjector.siteId) {
                  return {
                    ...site,
                    projectors: site.projectors.map((proj) => {
                      if (proj.id === selectedProjector.projectorId) {
                        return { ...proj, status: "scheduled" as const };
                      }
                      return proj;
                    }),
                  };
                }
                return site;
              }),
            );

            // Also fetch fresh data from server to ensure consistency
            fetchSites();

            setSelectedProjector(null);
            setShowSchedule(false);
          }}
        />
      )}
    </div>
  );
}
