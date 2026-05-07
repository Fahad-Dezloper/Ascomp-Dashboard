"use client";

import { useCallback, useState, Fragment } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatAmcDateForDisplay } from "@/lib/amc-dates";
import { FileSpreadsheet, Loader2, Search, Upload } from "lucide-react";
import { toast } from "sonner";

type AmcSearchPeriod = {
  id: string;
  cycleNumber: number;
  startDate: string;
  endDate: string;
  certificateNumber: string;
};

type AmcSearchProjector = {
  projectorId: string;
  serialNo: string;
  modelNo: string;
  periods: AmcSearchPeriod[];
};

type AmcSearchSiteGroup = {
  siteId: string;
  siteName: string;
  siteAddress?: string | null;
  projectors: AmcSearchProjector[];
};

type ValidationErr = { row: number; serialNo?: string; errors: string[] };
type RowErr = { row: number; message: string };

export default function AmcSearchView() {
  const router = useRouter();
  const [siteName, setSiteName] = useState("");
  const [serial, setSerial] = useState("");
  const [groups, setGroups] = useState<AmcSearchSiteGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [lastImportReport, setLastImportReport] = useState<{
    kind: "preflight" | "upload";
    totalRows: number;
    validRows?: number;
    created?: number;
    skippedOrInvalid?: number;
    validationErrors: ValidationErr[];
    rowErrors?: RowErr[];
  } | null>(null);

  const runSearch = useCallback(async () => {
    const s = siteName.trim();
    const n = serial.trim();
    if (!s && !n) {
      setGroups([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams();
      if (s) params.set("siteName", s);
      if (n) params.set("serial", n);
      const res = await fetch(`/api/admin/amc/search?${params}`, {
        credentials: "include",
      });
      if (!res.ok) {
        setGroups([]);
        return;
      }
      const data = await res.json();
      setGroups(data.groups || []);
    } finally {
      setLoading(false);
    }
  }, [siteName, serial]);

  const postExcel = useCallback(
    async (mode: "preflight" | "upload") => {
      if (!excelFile) {
        toast.error("Select an Excel file first");
        return;
      }
      setImportBusy(true);
      setLastImportReport(null);

      try {
        const fd = new FormData();
        fd.append("file", excelFile);
        fd.append("mode", mode);
        let res: Response;
        try {
          res = await fetch("/api/admin/amc/upload-excel", {
            method: "POST",
            body: fd,
            credentials: "include",
          });
        } catch (fetchErr: unknown) {
          toast.error(
            fetchErr instanceof Error
              ? fetchErr.message
              : "Could not reach the server",
          );
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(data.error || "Upload failed");
          return;
        }
        if (mode === "preflight") {
          setLastImportReport({
            kind: "preflight",
            totalRows: data.totalRows,
            validRows: data.validRows,
            validationErrors: data.validationErrors || [],
          });
          toast(
            `Checked ${data.totalRows} row(s): ${data.validRows} ready to import`,
          );
        } else {
          setLastImportReport({
            kind: "upload",
            totalRows: data.totalRows,
            created: data.created,
            skippedOrInvalid: data.skippedOrInvalid,
            validationErrors: data.validationErrors || [],
            rowErrors: data.rowErrors || [],
          });
          toast.success(`Imported ${data.created} AMC period(s)`);
          if (siteName.trim() || serial.trim()) {
            await runSearch();
          }
        }
      } catch (e) {
        console.error(e);
        toast.error(e instanceof Error ? e.message : "Import request failed");
      } finally {
        setImportBusy(false);
      }
    },
    [excelFile, siteName, serial, runSearch],
  );

  return (
    <div className="space-y-6">
      <Card className="border-border bg-white shadow-sm">
        <CardHeader className="pb-4 border-b border-border">
          <CardTitle className="text-lg">AMC lookup</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Search by site name,{" "}
            <span className="font-medium text-foreground/90">
              site address
            </span>
            , contact / site code, and/or projector serial. Multi-word
            queries match if the full phrase appears or each word appears
            somewhere in those fields (e.g. EVA + Mall).{" "}
            <span className="font-medium text-foreground/90">Cycle</span>{" "}
            numbers each renewal (1 = first AMC, 2–4 = later renewals) by start
            date. Open a projector for full detail.
          </p>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="amc-site">Site name or address</Label>
              <Input
                id="amc-site"
                className="mt-1"
                placeholder="Venue name, street, area…"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runSearch()}
              />
            </div>
            <div>
              <Label htmlFor="amc-serial">Projector serial</Label>
              <Input
                id="amc-serial"
                className="mt-1"
                placeholder="Contains…"
                value={serial}
                onChange={(e) => setSerial(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runSearch()}
              />
            </div>
          </div>
          <Button type="button" onClick={runSearch} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Searching…
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Search
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border bg-white shadow-sm">
        <CardHeader className="pb-4 border-b border-border">
          <CardTitle className="text-lg">Import historical AMC (Excel)</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Large sheets can take a few minutes — keep this tab open until the
            import completes. Use the same layout as service-record uploads: a
            sheet named{" "}
            <span className="font-medium">Data</span>. Leave{" "}
            <span className="font-medium">End Date</span> blank to apply the
            default (start + 1 year − 1 day). Serial numbers must match an
            existing projector. Rows that duplicate an existing AMC start date
            for that projector are skipped.
          </p>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" asChild>
              <a href="/api/admin/amc/download-example">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Download template
              </a>
            </Button>
          </div>
          <div>
            <Label htmlFor="amc-excel">Excel file (.xlsx / .xls)</Label>
            <Input
              id="amc-excel"
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              className="mt-1 max-w-md cursor-pointer"
              onChange={(e) => {
                setExcelFile(e.target.files?.[0] ?? null);
                setLastImportReport(null);
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={importBusy || !excelFile}
              onClick={() => postExcel("preflight")}
            >
              {importBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Validate only
                </>
              )}
            </Button>
            <Button
              type="button"
              disabled={importBusy || !excelFile}
              onClick={() => postExcel("upload")}
            >
              {importBusy ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Import rows
            </Button>
          </div>
          {lastImportReport &&
          (lastImportReport.validationErrors.length > 0 ||
            (lastImportReport.rowErrors?.length ?? 0) > 0) ? (
            <div className="rounded-md border border-border bg-muted/20 p-3 text-sm max-h-64 overflow-y-auto space-y-2">
              <p className="font-medium text-foreground">Issues</p>
              {lastImportReport.validationErrors.map((v, i) => (
                <div key={`v-${i}`} className="text-xs">
                  <span className="font-mono">Row {v.row}</span>
                  {v.serialNo ? (
                    <span className="text-muted-foreground">
                      {" "}
                      · {v.serialNo}
                    </span>
                  ) : null}
                  : {v.errors.join("; ")}
                </div>
              ))}
              {lastImportReport.rowErrors?.map((r, i) => (
                <div key={`r-${i}`} className="text-xs">
                  <span className="font-mono">Row {r.row}</span>: {r.message}
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {searched && !loading && groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No AMC periods matched. Try different text or check spelling.
        </p>
      ) : null}

      {groups.map((g) => {
        const addr = g.siteAddress?.trim() || "";
        const title = addr || g.siteName;
        const showVenue =
          Boolean(addr) &&
          Boolean(g.siteName?.trim()) &&
          g.siteName.trim() !== title;

        return (
        <Card key={g.siteId} className="border-border bg-white shadow-sm">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-base max-w-[min(100%,48rem)] leading-snug">
              {title}
            </CardTitle>
            {showVenue ? (
              <p className="text-sm text-muted-foreground font-normal mt-1">
                {g.siteName}
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground font-normal mt-1">
              Site ID: {g.siteId}
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="p-3 font-semibold">Projector</th>
                    <th className="p-3 font-semibold w-16">Cycle</th>
                    <th className="p-3 font-semibold">Start</th>
                    <th className="p-3 font-semibold">End</th>
                    <th className="p-3 font-semibold w-40"> </th>
                  </tr>
                </thead>
                <tbody>
                  {g.projectors.map((p) => (
                    <Fragment key={p.projectorId}>
                      {p.periods.map((row, idx) => (
                        <tr
                          key={`${p.projectorId}-${row.id}`}
                          className="border-b last:border-0 hover:bg-muted/30"
                        >
                          {idx === 0 ? (
                            <td
                              className="p-3 align-top border-r border-border/60"
                              rowSpan={p.periods.length}
                            >
                              <div className="font-medium">{p.serialNo}</div>
                              <div className="text-xs text-muted-foreground">
                                {p.modelNo}
                              </div>
                            </td>
                          ) : null}
                          <td className="p-3 align-top">
                            <span
                              className="inline-flex items-center justify-center rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-semibold tabular-nums text-primary"
                              title={`Cycle ${row.cycleNumber}`}
                            >
                              {row.cycleNumber}
                            </span>
                          </td>
                          <td className="p-3 align-top">
                            {formatAmcDateForDisplay(
                              new Date(row.startDate + "T12:00:00.000Z"),
                            )}
                          </td>
                          <td className="p-3 align-top">
                            {formatAmcDateForDisplay(
                              new Date(row.endDate + "T12:00:00.000Z"),
                            )}
                          </td>
                          {idx === 0 ? (
                            <td
                              className="p-3 align-top"
                              rowSpan={p.periods.length}
                            >
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  router.push(
                                    `/admin/dashboard/sites/${g.siteId}/projectors/${p.projectorId}`,
                                  )
                                }
                              >
                                Open projector
                              </Button>
                            </td>
                          ) : null}
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        );
      })}
    </div>
  );
}
