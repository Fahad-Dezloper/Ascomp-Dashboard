"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface AddProjectorModalProps {
  siteId?: string
  onClose: () => void
  onSuccess?: () => void
}

export default function AddProjectorModal({ siteId, onClose, onSuccess }: AddProjectorModalProps) {
  const [formData, setFormData] = useState({
    serialNo: "",
    modelNo: "",
    status: "COMPLETED",
    address: "",
    state: "",
    region: "",
    pvr: "",
    selectedSiteId: siteId || "",
  })
  const [sites, setSites] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSites = async () => {
      try {
        const response = await fetch("/api/admin/sites")
        if (!response.ok) return
        const result = await response.json()
        const mapped = (result.sites || []).map((s: any) => ({
          id: s.id,
          name: s.name,
        }))
        setSites(mapped)

        // If we did not get a siteId prop, default to first site
        if (!siteId && mapped.length > 0) {
          setFormData(prev => ({ ...prev, selectedSiteId: prev.selectedSiteId || mapped[0].id }))
        }
      } catch {
        // swallow, form still works but without dropdown options
      }
    }

    fetchSites()
  }, [siteId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.serialNo || !formData.modelNo || !formData.selectedSiteId) {
      setError("Serial number, model number and site are required")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/admin/projectors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          siteId: formData.selectedSiteId,
          modelNo: formData.modelNo,
          serialNo: formData.serialNo,
          status: formData.status || undefined,
          address: formData.address || undefined,
          state: formData.state || undefined,
          region: formData.region || undefined,
          pvr: formData.pvr || undefined,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to create projector")
      }

      if (onSuccess) {
        onSuccess()
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md border-border">
        <CardHeader>
          <CardTitle>Add Projector</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Select Site</label>
              <select
                value={formData.selectedSiteId}
                onChange={(e) => setFormData({ ...formData, selectedSiteId: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                required
              >
                <option value="" disabled>
                  Select a site
                </option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

<div className="flex gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">Serial Number</label>
              <input
                type="text"
                value={formData.serialNo}
                onChange={(e) => setFormData({ ...formData, serialNo: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="SRX-2024-001"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Model Number</label>
              <input
                type="text"
                value={formData.modelNo}
                onChange={(e) => setFormData({ ...formData, modelNo: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Sony SRX-R320P"
                required
              />
            </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="DRAFT">Draft</option>
                <option value="PENDING">Pending</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="PACKED">Packed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Address</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Projector address"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">State</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="State"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Region</label>
                <input
                  type="text"
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Region"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">PVR / Non PVR</label>
              <select
                value={formData.pvr}
                onChange={(e) => setFormData({ ...formData, pvr: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select</option>
                <option value="PVR">PVR</option>
                <option value="NonPVR">Non PVR</option>
              </select>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="border-border bg-transparent"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={loading}
              >
                {loading ? "Creating..." : "Add Projector"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
