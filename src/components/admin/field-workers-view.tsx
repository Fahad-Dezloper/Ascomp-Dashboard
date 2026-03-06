"use client";

import { useRouter } from "next/navigation";
import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Mail,
  MoreVertical,
  Pencil,
  Trash2,
  KeyRound,
  X,
  Shield,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { toast } from "sonner";
import SearchBar from "../search-bar";
import AddFieldWorkerModal from "./modals/add-field-worker-modal";
import { useAuth } from "@/lib/auth-context";

interface FieldWorker {
  id: string;
  name: string;
  email: string;
  role: string;
  accessLevel: string | null;
  pvrAccess: string;
  joinDate: string;
  lastActiveDate: string;
  sitesCompleted: number;
  createdServicesCount: number;
  pendingTasks: number;
  totalTasks: number;
}

// ── small helpers ──────────────────────────────────────────────────────────────
const PVR_OPTIONS = [
  { value: "PVR", label: "PVR Only" },
  { value: "NonPVR", label: "Non-PVR Only" },
  { value: "BOTH", label: "Both" },
] as const;

const PVR_BADGE: Record<
  string,
  { label: string; className: string; Icon: React.ElementType }
> = {
  PVR: {
    label: "PVR Only",
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    Icon: ShieldCheck,
  },
  NonPVR: {
    label: "Non-PVR Only",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    Icon: ShieldOff,
  },
  BOTH: {
    label: "All Projectors",
    className:
      "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300",
    Icon: Shield,
  },
};

// ── Edit Modal ─────────────────────────────────────────────────────────────────
interface EditWorkerModalProps {
  worker: FieldWorker;
  onClose: () => void;
  onSaved: () => void;
}

function EditWorkerModal({ worker, onClose, onSaved }: EditWorkerModalProps) {
  const [role, setRole] = useState(worker.role);
  const [accessLevel, setAccessLevel] = useState(worker.accessLevel ?? "FULL");
  const [pvrAccess, setPvrAccess] = useState(worker.pvrAccess);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/field-workers/${worker.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, accessLevel, pvrAccess }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      toast.success("Worker updated successfully");
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-sm bg-background border border-border rounded-xl shadow-xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Edit Access
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {worker.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Role */}
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">
            Role
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="FIELD_WORKER">Field Worker</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>

        {/* Admin access level — only when ADMIN */}
        {role === "ADMIN" && (
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Admin Access Level
            </label>
            <select
              value={accessLevel}
              onChange={(e) => setAccessLevel(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="FULL">Full Access</option>
              <option value="READ_ONLY">Read Only</option>
            </select>
          </div>
        )}

        {/* PVR Access */}
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">
            Projector Type Access
          </label>
          <div className="flex gap-2">
            {PVR_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setPvrAccess(value)}
                className={`flex-1 py-2 px-2 rounded-md border text-xs font-medium transition-colors ${
                  pvrAccess === value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:bg-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
        )}

        <div className="flex gap-2 justify-end pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="border-border bg-transparent"
          >
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Delete Confirm Modal ───────────────────────────────────────────────────────
interface DeleteConfirmModalProps {
  worker: FieldWorker;
  onClose: () => void;
  onDeleted: () => void;
}

function DeleteConfirmModal({
  worker,
  onClose,
  onDeleted,
}: DeleteConfirmModalProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/field-workers/${worker.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      toast.success(`${worker.name} removed`, {
        description: "All service records have been preserved.",
      });
      onDeleted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-sm bg-background border border-border rounded-xl shadow-xl p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/40">
            <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Delete Field Worker
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Are you sure you want to remove{" "}
              <span className="font-medium text-foreground">{worker.name}</span>
              ?
            </p>
          </div>
        </div>

        <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md">
          <p className="text-xs text-amber-700 dark:text-amber-300">
            ⚠️ Their account will be deleted, but{" "}
            <strong>all service records are preserved</strong> and will remain
            in the system.
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
        )}

        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="border-border bg-transparent"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete Worker"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main View ──────────────────────────────────────────────────────────────────
export default function FieldWorkersView() {
  const router = useRouter();
  const { user } = useAuth();
  const canEdit = user?.accessLevel !== "READ_ONLY";
  const [workers, setWorkers] = useState<FieldWorker[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddWorker, setShowAddWorker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sendingCredentialsFor, setSendingCredentialsFor] = useState<
    string | null
  >(null);
  const [resettingPasswordFor, setResettingPasswordFor] = useState<
    string | null
  >(null);
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);
  const [editWorker, setEditWorker] = useState<FieldWorker | null>(null);
  const [deleteWorker, setDeleteWorker] = useState<FieldWorker | null>(null);

  const fetchWorkers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/field-workers");
      if (!response.ok) throw new Error("Failed to fetch field workers");
      const result = await response.json();
      setWorkers(result.workers || []);
    } catch (error) {
      console.error("Error fetching field workers:", error);
      setWorkers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendCredentials = async (
    e: React.MouseEvent,
    workerId: string,
    workerEmail: string,
  ) => {
    e.stopPropagation();
    setSendingCredentialsFor(workerId);
    try {
      const res = await fetch("/api/admin/field-workers/send-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: workerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send credentials");
      toast.success("Credentials sent", {
        description: `Login credentials sent to ${workerEmail}`,
      });
    } catch (error) {
      toast.error("Failed to send credentials", {
        description:
          error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setSendingCredentialsFor(null);
    }
  };

  const handleResetPassword = async (
    e: React.MouseEvent,
    workerId: string,
    workerName: string,
  ) => {
    e.stopPropagation();
    setOpenMenuFor(null);
    setResettingPasswordFor(workerId);
    try {
      const res = await fetch(
        `/api/admin/field-workers/${workerId}/reset-password`,
        {
          method: "POST",
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset password");
      toast.success(`Password reset for ${workerName}`, {
        description: "Default password restored and emailed to the worker.",
      });
    } catch (error) {
      toast.error("Failed to reset password", {
        description:
          error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setResettingPasswordFor(null);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, []);

  // close dropdown on outside click
  useEffect(() => {
    if (!openMenuFor) return;
    const handler = () => setOpenMenuFor(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [openMenuFor]);

  const filteredWorkers = useMemo(() => {
    return workers.filter(
      (w) =>
        w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.email.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [workers, searchQuery]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-foreground">Field Workers</h2>
        {canEdit && (
          <Button
            onClick={() => setShowAddWorker(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Add Field Worker
          </Button>
        )}
      </div>

      <SearchBar
        placeholder="Search workers by name or email..."
        value={searchQuery}
        onChange={setSearchQuery}
      />

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-border">
              <CardHeader>
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWorkers.length === 0 ? (
            <Card className="border-border col-span-full">
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">
                  No field workers found matching your search.
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredWorkers.map((worker) => {
              const pvr = (PVR_BADGE[worker.pvrAccess] ?? PVR_BADGE["BOTH"])!;
              const PvrIcon = pvr.Icon;
              const isMenuOpen = openMenuFor === worker.id;

              return (
                <Card
                  key={worker.id}
                  className="border-border hover:shadow-md transition-shadow cursor-pointer relative"
                  onClick={() =>
                    router.push(`/admin/dashboard/field-workers/${worker.id}`)
                  }
                >
                  <CardHeader className="pb-3">
                    <div className="flex w-full justify-between items-start gap-2">
                      <div className="min-w-0">
                        <CardTitle className="text-base font-semibold truncate">
                          {worker.name}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {worker.email}
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div
                        className="flex items-center gap-1 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Send credentials */}
                        <button
                          title="Send credentials"
                          onClick={(e) =>
                            handleSendCredentials(e, worker.id, worker.email)
                          }
                          disabled={sendingCredentialsFor === worker.id}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                        >
                          {sendingCredentialsFor === worker.id ? (
                            <span className="text-[10px] font-medium">…</span>
                          ) : (
                            <Mail className="h-4 w-4" />
                          )}
                        </button>

                        {/* ⋮ menu */}
                        {canEdit && (
                          <div className="relative">
                            <button
                              title="More options"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuFor(isMenuOpen ? null : worker.id);
                              }}
                              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>

                            {isMenuOpen && (
                              <div
                                className="absolute right-0 top-full mt-1 w-44 bg-background border border-border rounded-lg shadow-lg z-30 py-1 overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {/* Edit access */}
                                <button
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                                  onClick={() => {
                                    setOpenMenuFor(null);
                                    setEditWorker(worker);
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                  Edit Access
                                </button>

                                {/* Reset password */}
                                <button
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                                  disabled={resettingPasswordFor === worker.id}
                                  onClick={(e) =>
                                    handleResetPassword(
                                      e,
                                      worker.id,
                                      worker.name,
                                    )
                                  }
                                >
                                  <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                                  {resettingPasswordFor === worker.id
                                    ? "Resetting…"
                                    : "Reset Password"}
                                </button>

                                <div className="my-1 border-t border-border" />

                                {/* Delete */}
                                <button
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                  onClick={() => {
                                    setOpenMenuFor(null);
                                    setDeleteWorker(worker);
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Delete Worker
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 pt-0">
                    {/* Completed services */}
                    <div className="p-3 bg-muted/50 rounded-lg border border-border">
                      <p className="text-xs text-muted-foreground mb-1">
                        Completed Services
                      </p>
                      <p className="text-2xl font-bold text-foreground">
                        {worker.createdServicesCount}
                      </p>
                    </div>

                    {/* PVR badge */}
                    <div
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${pvr.className}`}
                    >
                      <PvrIcon className="h-3 w-3" />
                      {pvr.label}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Add worker modal */}
      {showAddWorker && (
        <AddFieldWorkerModal
          onClose={() => setShowAddWorker(false)}
          onSuccess={fetchWorkers}
        />
      )}

      {/* Edit access modal */}
      {editWorker && (
        <EditWorkerModal
          worker={editWorker}
          onClose={() => setEditWorker(null)}
          onSaved={fetchWorkers}
        />
      )}

      {/* Delete confirm modal */}
      {deleteWorker && (
        <DeleteConfirmModal
          worker={deleteWorker}
          onClose={() => setDeleteWorker(null)}
          onDeleted={fetchWorkers}
        />
      )}
    </div>
  );
}
