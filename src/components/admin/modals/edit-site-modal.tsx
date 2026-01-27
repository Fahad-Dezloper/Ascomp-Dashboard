"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface EditSiteModalProps {
    site: {
        id: string
        name: string
        address: string
        contactDetails: string
        siteCode?: string | null
        email?: string | null
    }
    onClose: () => void
    onSuccess?: () => void
}

export default function EditSiteModal({ site, onClose, onSuccess }: EditSiteModalProps) {
    const [formData, setFormData] = useState({
        siteName: site.name,
        address: site.address,
        contactDetails: site.contactDetails,
        siteCode: site.siteCode || "",
        email: site.email || "",
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.siteName || !formData.address || !formData.contactDetails) {
            setError("Site name, address and contact details are required")
            return
        }

        setLoading(true)
        setError(null)

        try {
            const response = await fetch(`/api/admin/sites/${site.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    siteName: formData.siteName,
                    address: formData.address,
                    contactDetails: formData.contactDetails,
                    siteCode: formData.siteCode || null,
                    email: formData.email || null,
                }),
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || "Failed to update site")
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
                    <CardTitle>Edit Site</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-foreground">Site Name</label>
                            <input
                                type="text"
                                value={formData.siteName}
                                onChange={(e) => setFormData({ ...formData, siteName: e.target.value })}
                                className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-foreground">Address</label>
                            <textarea
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                rows={2}
                                required
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-foreground">Contact Details</label>
                            <input
                                type="text"
                                value={formData.contactDetails}
                                onChange={(e) => setFormData({ ...formData, contactDetails: e.target.value })}
                                className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-foreground">Site Code</label>
                            <input
                                type="text"
                                value={formData.siteCode}
                                onChange={(e) => setFormData({ ...formData, siteCode: e.target.value })}
                                className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-foreground">Email</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            />
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
