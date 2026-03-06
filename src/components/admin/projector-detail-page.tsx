"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import ScheduleServiceModal from "./modals/schedule-service-modal";
import PdfPreviewDialog from "./pdf-preview-dialog";
import EditProjectorModal from "./modals/edit-projector-modal";
import { FileText } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

interface ProjectorDetailPageProps {
  siteId?: string;
  projectorId?: string;
}

interface ProjectorData {
  id: string;
  name: string;
  model: string;
  serialNumber: string;
  installDate: string;
  lastServiceDate: string;
  status: "completed" | "pending" | "scheduled" | "packed";
  nextServiceDue: string;
  address?: string | null;
  state?: string | null;
  region?: string | null;
  pvr?: string | null;
  serviceHistory: Array<{
    id: string;
    date: string | null;
    technician?: string;
    notes?: string;
    nextDue?: string;
    status?: string;
    reportUrl?: string | null;
    reportGenerated?: boolean;
  }>;
  moveHistory: Array<{
    id: string;
    fromSiteName: string;
    fromAddress: string;
    toSiteName: string;
    toAddress: string;
    movedAt: string;
  }>;
}

interface SiteData {
  id: string;
  name: string;
  address: string;
  projectors: ProjectorData[];
}

export default function ProjectorDetailPage({
  siteId: siteIdProp,
  projectorId: projectorIdProp,
}: ProjectorDetailPageProps) {
  const router = useRouter();
  const params = useParams<{ siteId?: string; projectorId?: string }>();
  const siteId = siteIdProp ?? params?.siteId ?? "";
  const projectorId = projectorIdProp ?? params?.projectorId ?? "";
  const { user } = useAuth();
  const canEdit = user?.accessLevel !== "READ_ONLY";
  const [site, setSite] = useState<SiteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [previewServiceId, setPreviewServiceId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [showEditProjector, setShowEditProjector] = useState(false);
  const [moving, setMoving] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [targetSiteId, setTargetSiteId] = useState<string>("");
  const [siteSearchQuery, setSiteSearchQuery] = useState<string>("");
  const [markingPacked, setMarkingPacked] = useState(false);
  const [unmarkingPacked, setUnmarkingPacked] = useState(false);
  const [sites, setAllSites] = useState<
    Array<{ id: string; siteName: string; address: string }>
  >([]);

  useEffect(() => {
    const fetchProjector = async () => {
      if (!siteId) {
        setError("Missing site id");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/admin/sites/${siteId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch site");
        }
        const data = await response.json();
        setSite(data.site);
      } catch (err) {
        console.error("Error fetching projector:", err);
        setError(
          err instanceof Error ? err.message : "Unable to load projector",
        );
        setSite(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProjector();
  }, [siteId, projectorId]);

  const projector = useMemo(
    () => site?.projectors.find((p) => p.id === projectorId) ?? null,
    [site, projectorId],
  );

  useEffect(() => {
    if (showMoveDialog) {
      const fetchSites = async () => {
        try {
          const response = await fetch("/api/admin/sites");
          if (response.ok) {
            const data = await response.json();
            setAllSites(data.sites || []);
          }
        } catch (err) {
          console.error("Error fetching sites:", err);
        }
      };
      fetchSites();
    }
  }, [showMoveDialog]);

  const handleMoveProjector = async () => {
    if (!projectorId || !targetSiteId) return;

    try {
      setMoving(true);
      setMoveError(null);
      const response = await fetch(
        `/api/admin/projectors/${projectorId}/move`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ targetSiteId }),
        },
      );

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Failed to move projector");
      }

      // Refresh data or redirect
      router.push(`/admin/dashboard/sites/${targetSiteId}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to move projector";
      console.error("Failed to move projector:", message);
      setMoveError(message);
    } finally {
      setMoving(false);
    }
  };

  const handleMarkAsPacked = async () => {
    if (!projectorId) return;

    try {
      setMarkingPacked(true);
      const response = await fetch(`/api/admin/projectors/${projectorId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "PACKED" }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Failed to update status");
      }

      // Refresh data
      router.refresh();
      // Locally update state to reflect change immediately if router.refresh is not enough
      if (site) {
        setSite({
          ...site,
          projectors: site.projectors.map((p) =>
            p.id === projectorId ? { ...p, status: "packed" as const } : p,
          ),
        });
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update status";
      console.error("Failed to mark as packed:", message);
      alert(message);
    } finally {
      setMarkingPacked(false);
    }
  };

  const handleUnpackProjector = async () => {
    if (!projectorId) return;

    try {
      setUnmarkingPacked(true);
      const response = await fetch(`/api/admin/projectors/${projectorId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "unpack" }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Failed to unpack projector");
      }

      // Refresh data
      router.refresh();
      if (site) {
        setSite({
          ...site,
          projectors: site.projectors.map((p) =>
            p.id === projectorId
              ? { ...p, status: (result.calculatedStatus || "pending") as any }
              : p,
          ),
        });
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to unpack projector";
      console.error("Failed to unpack projector:", message);
      alert(message);
    } finally {
      setUnmarkingPacked(false);
    }
  };

  const handleDeleteProjector = async () => {
    if (!projectorId) return;

    try {
      setDeleting(true);
      setDeleteError(null);
      const response = await fetch("/api/admin/projectors", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ projectorId }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Failed to delete projector");
      }

      router.push(`/admin/dashboard/sites/${siteId}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete projector";
      console.error("Failed to delete projector:", message);
      setDeleteError(message);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !site || !projector) {
    return (
      <Card className="border-border p-6 text-center">
        <CardContent>
          <p className="text-muted-foreground">
            {error || "Projector not found"}
          </p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => router.push(`/admin/dashboard/sites/${siteId}`)}
          >
            Back to Site
          </Button>
        </CardContent>
      </Card>
    );
  }

  const statusColor =
    projector.status.toLowerCase() === "pending"
      ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
      : projector.status.toLowerCase() === "completed"
        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
        : projector.status.toLowerCase() === "packed"
          ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100"
          : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";

  return (
    <div className="space-y-6">
      <Card className="border-border bg-white shadow-sm">
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">{projector.name}</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {site.name}
              </p>
            </div>
            <Badge className={`${statusColor} px-3 py-1 text-sm`}>
              {projector.status.charAt(0).toUpperCase() +
                projector.status.slice(1)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Serial Number
              </p>
              <p className="text-base text-foreground font-medium">
                {projector.serialNumber}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Model
              </p>
              <p className="text-base text-foreground font-medium">
                {projector.model}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Last Service
              </p>
              <p className="text-base text-foreground font-medium">
                {projector.lastServiceDate
                  ? new Date(projector.lastServiceDate).toLocaleDateString()
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Status
              </p>
              <p className="text-base text-foreground font-medium">
                {projector.status.toUpperCase()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={() => router.push(`/admin/dashboard/sites/${siteId}`)}
        >
          Back to Site
        </Button>
        {canEdit &&
          (projector.status === "pending" || projector.status === "packed") && (
            <Button
              onClick={() => setShowSchedule(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Schedule Service
            </Button>
          )}
        {canEdit && (
          <Button
            variant="outline"
            onClick={() => setShowMoveDialog(true)}
            disabled={moving || markingPacked}
          >
            {moving ? "Moving..." : "Packed & Move"}
          </Button>
        )}
        {canEdit && projector.status !== "packed" && (
          <Button
            variant="outline"
            onClick={handleMarkAsPacked}
            disabled={markingPacked || moving}
          >
            {markingPacked ? "Marking..." : "Mark as Packed"}
          </Button>
        )}
        {canEdit && projector.status === "packed" && (
          <Button
            variant="outline"
            onClick={handleUnpackProjector}
            disabled={unmarkingPacked || moving}
          >
            {unmarkingPacked ? "Unpacking..." : "Unpack Projector"}
          </Button>
        )}
        {canEdit && (
          <Button variant="outline" onClick={() => setShowEditProjector(true)}>
            Edit Projector
          </Button>
        )}
        {canEdit && (
          <Button
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete Projector"}
          </Button>
        )}
      </div>

      <Card className="border-border bg-white shadow-sm">
        <CardHeader className="pb-4 border-b border-border">
          <CardTitle className="text-lg">Service History</CardTitle>
        </CardHeader>
        <CardContent className="p-6 w-full">
          {projector.serviceHistory.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-border rounded-lg">
              <p className="text-sm text-muted-foreground">
                No service records available yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4 w-full grid grid-cols-4 gap-4 ">
              {projector.serviceHistory.map((service, index) => {
                const statusLabel = service.status
                  ? service.status
                      .replace("_", " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase())
                  : "Completed";
                const statusStyles =
                  service.status === "pending"
                    ? "bg-red-100 text-red-700"
                    : service.status === "scheduled" ||
                        service.status === "in_progress"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-green-100 text-green-700";

                return (
                  <Card
                    key={service.id}
                    className="border h-[25vh] border-border shadow-sm"
                  >
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
                              {service.date
                                ? new Date(service.date).toLocaleDateString(
                                    "en-US",
                                    {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    },
                                  )
                                : "—"}
                            </p>
                          </div>
                        </div>
                        <Badge
                          className={`${statusStyles} text-xs px-2.5 py-0.5`}
                        >
                          {statusLabel}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-2 gap-4 mb-4 pt-4 border-t border-border">
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                            Technician
                          </p>
                          <p className="text-sm font-medium text-foreground">
                            {service.technician || "Unassigned"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                            Date
                          </p>
                          <p className="text-sm font-medium text-foreground">
                            {service.date
                              ? new Date(service.date).toLocaleDateString()
                              : "—"}
                          </p>
                        </div>
                        {service.notes && (
                          <div className="col-span-2">
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                              Notes
                            </p>
                            <p
                              className="text-sm text-foreground line-clamp-1"
                              title={service.notes}
                            >
                              {service.notes}
                            </p>
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
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {projector.moveHistory && projector.moveHistory.length > 0 && (
        <Card className="border-border bg-white shadow-sm">
          <CardHeader className="pb-4 border-b border-border">
            <CardTitle className="text-lg">Movement History</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="relative border-l-2 border-muted pl-6 space-y-8">
              {projector.moveHistory.map((history) => (
                <div key={history.id} className="relative">
                  <div className="absolute -left-[31px] top-1.5 h-4 w-4 rounded-full bg-amber-500 border-2 border-white shadow-sm" />
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-semibold text-foreground">
                        Projector Moved
                      </h4>
                      <span className="text-xs text-muted-foreground">
                        {new Date(history.movedAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-2 p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
                          From
                        </p>
                        <p className="font-medium">{history.fromSiteName}</p>
                        <p className="text-xs text-muted-foreground">
                          {history.fromAddress}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
                          To
                        </p>
                        <p className="font-medium">{history.toSiteName}</p>
                        <p className="text-xs text-muted-foreground">
                          {history.toAddress}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {showEditProjector && (
        <EditProjectorModal
          projector={{
            id: projector.id,
            serialNo: projector.serialNumber,
            modelNo: projector.model,
            status: projector.status.toUpperCase(),
            address: projector.address,
            state: projector.state,
            region: projector.region,
            pvr: projector.pvr,
            siteId: siteId,
          }}
          onClose={() => setShowEditProjector(false)}
          onSuccess={() => {
            router.refresh();
            // Re-fetch site data to update local state
            const fetchProjector = async () => {
              try {
                const response = await fetch(`/api/admin/sites/${siteId}`);
                if (response.ok) {
                  const data = await response.json();
                  setSite(data.site);
                }
              } catch (err) {
                console.error("Error refreshing projector:", err);
              }
            };
            fetchProjector();
          }}
        />
      )}

      {showSchedule && (
        <ScheduleServiceModal
          siteId={siteId}
          projectorId={projectorId}
          onClose={() => setShowSchedule(false)}
        />
      )}

      {previewServiceId && (
        <PdfPreviewDialog
          open={!!previewServiceId}
          onOpenChange={(open) => {
            if (!open) setPreviewServiceId(null);
          }}
          serviceRecordId={previewServiceId}
        />
      )}

      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Delete Projector
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Are you sure you want to delete this projector?
              <br />
              <span className="font-semibold text-destructive">
                All details of this projector and its service records will be
                permanently deleted.
              </span>
            </p>
            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-700 dark:text-red-400">
                  {deleteError}
                </p>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                className="border-border"
                onClick={() => {
                  if (!deleting) {
                    setShowDeleteDialog(false);
                    setDeleteError(null);
                  }
                }}
                disabled={deleting}
              >
                {deleteError ? "Close" : "Cancel"}
              </Button>
              {deleteError ? (
                <Button
                  variant="destructive"
                  onClick={handleDeleteProjector}
                  disabled={deleting}
                >
                  {deleting ? "Retrying..." : "Retry"}
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  onClick={handleDeleteProjector}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Delete"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {showMoveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Packed & Move Projector
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Mark this projector as{" "}
              <span className="font-semibold text-foreground">PACKED</span> and
              move it to a new site.
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Search & Select Target Site
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Search by address or site name..."
                    value={siteSearchQuery}
                    onChange={(e) => setSiteSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <select
                    value={targetSiteId}
                    onChange={(e) => setTargetSiteId(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select a site...</option>
                    {sites
                      .filter(
                        (s: any) =>
                          (s.address || "")
                            .toLowerCase()
                            .includes(siteSearchQuery.toLowerCase()) ||
                          (s.name || s.siteName || "")
                            .toLowerCase()
                            .includes(siteSearchQuery.toLowerCase()),
                      )
                      .map((s: any) => (
                        <option
                          key={s.id}
                          value={s.id}
                          disabled={s.id === siteId}
                        >
                          {s.address} {s.id === siteId ? "(Current)" : ""}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>

            {moveError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-700 dark:text-red-400">
                  {moveError}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                className="border-border"
                onClick={() => {
                  if (!moving) {
                    setShowMoveDialog(false);
                    setMoveError(null);
                    setSiteSearchQuery("");
                  }
                }}
                disabled={moving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleMoveProjector}
                disabled={moving || !targetSiteId}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {moving ? "Moving..." : "Mark Packed & Move"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
