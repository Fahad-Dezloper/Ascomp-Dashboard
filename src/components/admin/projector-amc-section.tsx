"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  computeDefaultInclusiveEndDate,
  formatAmcDateForDisplay,
  formatAmcDateForInput,
  parseDateOnlyInput,
} from "@/lib/amc-dates";
import { withAmcCycleNumbers } from "@/lib/amc-cycles";
import { FileText, Loader2, Plus, Trash2, Pencil, Award } from "lucide-react";
import { toast } from "sonner";

export type AmcPeriodRow = {
  id: string;
  siteNameSnapshot: string;
  siteAddressSnapshot: string | null;
  modelNoSnapshot: string;
  serialNoSnapshot: string;
  startDate: string;
  endDate: string;
  clientPoNumber: string;
  invoiceNumber: string;
  certificateNumber: string;
  certificateBlobUrl: string | null;
  certificateIssuedAt: string | null;
};

export default function ProjectorAmcSection({
  projectorId,
  canEdit,
}: {
  projectorId: string;
  canEdit: boolean;
}) {
  const [rows, setRows] = useState<AmcPeriodRow[]>([]);
  /** Master site address when a row has no stored address snapshot */
  const [projectorSiteAddressFallback, setProjectorSiteAddressFallback] =
    useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [autoEnd, setAutoEnd] = useState(true);
  const [clientPo, setClientPo] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<AmcPeriodRow | null>(null);
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editPo, setEditPo] = useState("");
  const [editInv, setEditInv] = useState("");

  const load = useCallback(async () => {
    if (!projectorId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/projectors/${projectorId}/amc`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load AMC");
      const data = await res.json();
      setRows(data.amcPeriods || []);
      setProjectorSiteAddressFallback(
        typeof data.projectorSiteAddress === "string"
          ? data.projectorSiteAddress.trim() || null
          : null,
      );
    } catch (e) {
      console.error(e);
      toast.error("Could not load AMC periods");
    } finally {
      setLoading(false);
    }
  }, [projectorId]);

  useEffect(() => {
    load();
  }, [load]);

  const applyDefaultEndFromStart = (startIso: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startIso)) return;
    try {
      const s = parseDateOnlyInput(startIso);
      const e = computeDefaultInclusiveEndDate(s);
      setEndDate(formatAmcDateForInput(e));
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (autoEnd && startDate) applyDefaultEndFromStart(startDate);
  }, [autoEnd, startDate]);

  const resetCreateForm = () => {
    setStartDate("");
    setEndDate("");
    setAutoEnd(true);
    setClientPo("");
    setInvoiceNo("");
  };

  const handleCreate = async () => {
    if (!startDate) {
      toast.error("Start date is required");
      return;
    }
    if (!autoEnd && !endDate) {
      toast.error("End date is required when auto end is off");
      return;
    }
    if (!clientPo.trim() || !invoiceNo.trim()) {
      toast.error("Client PO and our invoice number are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/projectors/${projectorId}/amc`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate,
          endDate: autoEnd ? undefined : endDate,
          autoEndFromStart: autoEnd,
          clientPoNumber: clientPo.trim(),
          invoiceNumber: invoiceNo.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Save failed");
        return;
      }
      toast.success("AMC period created");
      setCreateOpen(false);
      resetCreateForm();
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: AmcPeriodRow) => {
    if (!confirm(`Delete AMC ${row.certificateNumber}?`)) return;
    try {
      const res = await fetch(
        `/api/admin/projectors/${projectorId}/amc/${row.id}`,
        { method: "DELETE", credentials: "include" },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Delete failed");
        return;
      }
      toast.success("AMC deleted");
      await load();
    } catch {
      toast.error("Delete failed");
    }
  };

  const handleIssueCert = async (row: AmcPeriodRow) => {
    try {
      const res = await fetch(
        `/api/admin/projectors/${projectorId}/amc/${row.id}/certificate`,
        { method: "POST", credentials: "include" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Certificate failed");
        return;
      }
      toast.success("Certificate generated");
      if (data.url) window.open(data.url, "_blank", "noopener,noreferrer");
      await load();
    } catch {
      toast.error("Certificate failed");
    }
  };

  const openEdit = (row: AmcPeriodRow) => {
    if (row.certificateBlobUrl) {
      toast.message("This AMC is locked because a certificate was issued.");
      return;
    }
    setEditing(row);
    setEditStart(row.startDate);
    setEditEnd(row.endDate);
    setEditPo(row.clientPoNumber);
    setEditInv(row.invoiceNumber);
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    try {
      const res = await fetch(
        `/api/admin/projectors/${projectorId}/amc/${editing.id}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startDate: editStart,
            endDate: editEnd,
            clientPoNumber: editPo.trim(),
            invoiceNumber: editInv.trim(),
          }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Update failed");
        return;
      }
      toast.success("AMC updated");
      setEditOpen(false);
      setEditing(null);
      await load();
    } catch {
      toast.error("Update failed");
    }
  };

  const displayRows = useMemo(() => withAmcCycleNumbers(rows), [rows]);

  const now = new Date();
  const activeRow = displayRows.find((r) => {
    const s = new Date(r.startDate + "T12:00:00.000Z");
    const e = new Date(r.endDate + "T12:00:00.000Z");
    return now >= s && now <= e;
  });

  return (
    <Card className="border-border bg-white shadow-sm">
      <CardHeader className="pb-4 border-b border-border flex flex-row flex-wrap items-center justify-between gap-2">
        <div>
          <CardTitle className="text-lg">AMC (Annual Maintenance)</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            One row per contract period. <span className="font-medium text-foreground/90">Cycle</span>{" "}
            is the renewal sequence (1 = first AMC, 2 = first renewal, 3–4 =
            further renewals). Dates are inclusive. Certificates use snapshots
            from AMC creation (venue name, address, projector).
          </p>
        </div>
        {canEdit && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New AMC
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        {activeRow && (
          <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
            <span className="font-semibold">Active today (Cycle {activeRow.cycleNumber}):</span>{" "}
            {activeRow.certificateNumber} —{" "}
            {formatAmcDateForDisplay(
              new Date(activeRow.startDate + "T12:00:00.000Z"),
            )}{" "}
            to{" "}
            {formatAmcDateForDisplay(
              new Date(activeRow.endDate + "T12:00:00.000Z"),
            )}
          </div>
        )}
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-6">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading AMC…
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No AMC periods yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="p-2 font-semibold w-16 whitespace-nowrap">
                    Cycle
                  </th>
                  <th className="p-2 font-semibold whitespace-nowrap">
                    Start
                  </th>
                  <th className="p-2 font-semibold whitespace-nowrap">End</th>
                  <th className="p-2 font-semibold min-w-[160px]">
                    Site address
                  </th>
                  <th className="p-2 font-semibold">PO / Invoice</th>
                  <th className="p-2 font-semibold">Certificate</th>
                  <th className="p-2 font-semibold w-36">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="p-2 align-top">
                      <span
                        className="inline-flex items-center justify-center rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-semibold tabular-nums text-primary"
                        title={`Cycle ${r.cycleNumber} — renewal ${r.cycleNumber === 1 ? "(first contract)" : `(renewal ${r.cycleNumber - 1})`}`}
                      >
                        {r.cycleNumber}
                      </span>
                    </td>
                    <td className="p-2 align-top whitespace-nowrap">
                      {formatAmcDateForDisplay(
                        new Date(r.startDate + "T12:00:00.000Z"),
                      )}
                    </td>
                    <td className="p-2 align-top whitespace-nowrap">
                      {formatAmcDateForDisplay(
                        new Date(r.endDate + "T12:00:00.000Z"),
                      )}
                    </td>
                    <td className="p-2 align-top">
                      <div className="max-w-[260px]">
                        {(() => {
                          const addr =
                            (
                              r.siteAddressSnapshot?.trim() ||
                              projectorSiteAddressFallback?.trim() ||
                              ""
                            ).trim();
                          const primary =
                            addr || r.siteNameSnapshot || "—";
                          const showVenueSecondary =
                            Boolean(addr) &&
                            Boolean(r.siteNameSnapshot?.trim()) &&
                            r.siteNameSnapshot !== primary;
                          return (
                            <>
                              <div>{primary}</div>
                              {showVenueSecondary ? (
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {r.siteNameSnapshot}
                                </div>
                              ) : null}
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {r.modelNoSnapshot} / {r.serialNoSnapshot}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="p-2 align-top text-xs">
                      <div>PO: {r.clientPoNumber}</div>
                      <div>Inv: {r.invoiceNumber}</div>
                    </td>
                    <td className="p-2 align-top text-xs">
                      <div className="font-mono">{r.certificateNumber}</div>
                      {r.certificateBlobUrl ? (
                        <a
                          href={r.certificateBlobUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary inline-flex items-center gap-1 hover:underline mt-1"
                        >
                          <FileText className="h-3 w-3" />
                          PDF
                        </a>
                      ) : (
                        <span className="text-amber-700">Not issued</span>
                      )}
                    </td>
                    <td className="p-2 align-top">
                      <div className="flex flex-wrap gap-1">
                        {canEdit && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => handleIssueCert(r)}
                          >
                            <Award className="h-3.5 w-3.5 mr-1" />
                            {r.certificateBlobUrl ? "Re-PDF" : "PDF"}
                          </Button>
                        )}
                        {canEdit && !r.certificateBlobUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => openEdit(r)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-destructive"
                            onClick={() => handleDelete(r)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New AMC period</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Start date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="autoEnd"
                checked={autoEnd}
                onCheckedChange={(v) => setAutoEnd(v === true)}
              />
              <label htmlFor="autoEnd" className="text-sm">
                Auto end date: start + 1 year − 1 day (inclusive)
              </label>
            </div>
            {!autoEnd && (
              <div>
                <Label>End date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            )}
            <div>
              <Label>Client PO number</Label>
              <Input
                value={clientPo}
                onChange={(e) => setClientPo(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Our invoice number</Label>
              <Input
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Saving…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit AMC (before certificate)</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Start date</Label>
              <Input
                type="date"
                value={editStart}
                onChange={(e) => setEditStart(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>End date</Label>
              <Input
                type="date"
                value={editEnd}
                onChange={(e) => setEditEnd(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Client PO</Label>
              <Input
                value={editPo}
                onChange={(e) => setEditPo(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Our invoice</Label>
              <Input
                value={editInv}
                onChange={(e) => setEditInv(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
