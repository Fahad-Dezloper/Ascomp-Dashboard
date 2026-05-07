"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { toast } from "sonner"
import type { Service } from "@/components/services/service-detail-view"
import { useAuth } from "@/lib/auth-context"

type Props = {
  services: Service[]
}

/** Read-only tabular layout (admin-style columns subset); actions limited to PDF download — no email. */
export function CompletedServicesTable({ services }: Props) {
  const { user } = useAuth()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const downloadPdf = async (service: Service) => {
    try {
      setLoadingId(service.id)
      const { constructAndGeneratePDF } = await import("@/lib/pdf-helper")
      const isDraft = user?.role === "FIELD_WORKER"
      const pdfBytes = await constructAndGeneratePDF(service.id, isDraft)
      const blob = new Blob([pdfBytes as BlobPart], { type: "application/pdf" })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9-_#]/g, "_")
      const siteCode = sanitize(String(service?.site?.siteCode || "NA"))
      const address = sanitize(String(service?.address || service?.site?.address || "NA"))
      const screenNo = sanitize(String(service?.site?.screenNo || service?.screenNumber || "NA"))
      const serialNo = sanitize(String(service?.projector?.serialNo || "NA"))
      const serviceVisit = sanitize(String(service?.serviceNumber ?? "NA"))
      link.download = `${siteCode}_${address}_SC#${screenNo}_${serialNo}_${serviceVisit}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success("PDF downloaded")
    } catch (e) {
      console.error(e)
      toast.error("Could not generate PDF")
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="w-full overflow-x-auto border-2 border-black rounded-sm">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b-2 border-black bg-gray-50">
            <th className="p-3 font-semibold text-black whitespace-nowrap">Site</th>
            <th className="p-3 font-semibold text-black whitespace-nowrap">Site address</th>
            <th className="p-3 font-semibold text-black whitespace-nowrap">Screen</th>
            <th className="p-3 font-semibold text-black whitespace-nowrap">Serial</th>
            <th className="p-3 font-semibold text-black whitespace-nowrap">Model</th>
            <th className="p-3 font-semibold text-black whitespace-nowrap">Service #</th>
            <th className="p-3 font-semibold text-black whitespace-nowrap">Completed</th>
            <th className="p-3 font-semibold text-black whitespace-nowrap w-[120px]">Report</th>
          </tr>
        </thead>
        <tbody>
          {services.map((s) => {
            const completed = s.completedAt || s.date || "—"
            const completedLabel =
              completed !== "—"
                ? new Date(completed).toLocaleString(undefined, { dateStyle: "medium" })
                : "—"
            const siteAddress =
              [s.site?.address, s.address, s.location].find(
                (v) => v != null && String(v).trim() !== "",
              ) ?? null
            const addressCell = siteAddress?.trim() || s.cinemaName || "—"
            return (
              <tr key={s.id} className="border-b border-gray-200 hover:bg-gray-50/80">
                <td className="p-3 align-top text-gray-900 max-w-[200px]">{s.site?.name ?? "—"}</td>
                <td className="p-3 align-top text-gray-700 max-w-[280px]">{addressCell}</td>
                <td className="p-3 align-top">{s.screenNumber ?? s.site?.screenNo ?? "—"}</td>
                <td className="p-3 align-top font-mono text-xs">{s.projector?.serialNo ?? "—"}</td>
                <td className="p-3 align-top">{s.projector?.model ?? "—"}</td>
                <td className="p-3 align-top">{String(s.serviceNumber ?? "—")}</td>
                <td className="p-3 align-top whitespace-nowrap text-gray-600">{completedLabel}</td>
                <td className="p-3 align-top">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-2 border-black"
                    disabled={loadingId === s.id}
                    onClick={() => downloadPdf(s)}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    {loadingId === s.id ? "…" : "PDF"}
                  </Button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="text-xs text-gray-500 p-3 bg-gray-50 border-t border-gray-200">
        Read-only — download your report PDFs here. Sending reports by email is only available from the admin
        dashboard.
      </p>
    </div>
  )
}
