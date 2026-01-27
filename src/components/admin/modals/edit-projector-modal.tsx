"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface EditProjectorModalProps {
    projector: {
        id: string
        serialNo: string
        modelNo: string
        status: string
        address?: string | null
        state?: string | null
        region?: string | null
        pvr?: string | null
        siteId: string
    }
    onClose: () => void
    onSuccess?: () => void
}

export default function EditProjectorModal({ projector, onClose, onSuccess }: EditProjectorModalProps) {
    const [formData, setFormData] = useState({
        serialNo: projector.serialNo,
        modelNo: projector.modelNo,
        status: projector.status,
        address: projector.address || "",
        state: projector.state || "",
        region: projector.region || "",
        pvr: projector.pvr || "",
        selectedSiteId: projector.siteId,
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
            } catch {
                // swallow
            }
        }

        fetchSites()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.serialNo || !formData.modelNo || !formData.selectedSiteId) {
            setError("Serial number, model number and site are required")
            return
        }

        setLoading(true)
        setError(null)

        try {
            const response = await fetch(`/api/admin/projectors/${projector.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    siteId: formData.selectedSiteId,
                    modelNo: formData.modelNo,
                    serialNo: formData.serialNo,
                    status: formData.status,
                    address: formData.address || null,
                    state: formData.state || null,
                    region: formData.region || null,
                    pvr: formData.pvr || null,
                }),
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || "Failed to update projector")
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
                    <CardTitle>Edit Projector</CardTitle>
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
                            <div className="flex-1">
                                <label className="text-sm font-medium text-foreground">Serial Number</label>
                                <input
                                    type="text"
                                    value={formData.serialNo}
                                    onChange={(e) => setFormData({ ...formData, serialNo: e.target.value })}
                                    className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                    required
                                />
                            </div>

                            <div className="flex-1">
                                <label className="text-sm font-medium text-foreground">Model Number</label>
                                <input
                                    type="text"
                                    value={formData.modelNo}
                                    onChange={(e) => setFormData({ ...formData, modelNo: e.target.value })}
                                    className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-foreground">Region</label>
                                <input
                                    type="text"
                                    value={formData.region}
                                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                                    className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
                                {loading ? "Updating..." : "Save Changes"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
