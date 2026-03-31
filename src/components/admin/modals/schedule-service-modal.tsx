"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface FieldWorker {
  id: string
  name: string
  email: string
}

interface ScheduleServiceModalProps {
  siteId: string
  projectorId: string
  onClose: () => void
  onSuccess?: () => void
}

export default function ScheduleServiceModal({ siteId, projectorId, onClose, onSuccess }: ScheduleServiceModalProps) {
  const [fieldWorkers, setFieldWorkers] = useState<FieldWorker[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    fieldWorkerId: "",
    scheduledDate: new Date().toISOString().split("T")[0],
    serviceVisitType: "regular" as "regular" | "special",
  })

  useEffect(() => {
    const fetchFieldWorkers = async () => {
      try {
        setLoading(true)
        const response = await fetch("/api/admin/field-workers")
        if (!response.ok) {
          throw new Error("Failed to fetch field workers")
        }
        const result = await response.json()
        setFieldWorkers(result.workers || [])
        if (result.workers && result.workers.length > 0) {
          setFormData((prev) => ({ ...prev, fieldWorkerId: result.workers[0].id }))
        }
      } catch (error) {
        console.error("Error fetching field workers:", error)
        setError("Failed to load field workers")
      } finally {
        setLoading(false)
      }
    }

    fetchFieldWorkers()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.fieldWorkerId || !formData.scheduledDate) {
      setError("Please select a field worker and scheduled date")
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch("/api/admin/services/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          siteId,
          projectorId,
          fieldWorkerId: formData.fieldWorkerId,
          scheduledDate: formData.scheduledDate,
          serviceVisitType: formData.serviceVisitType,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to schedule service")
      }

      if (onSuccess) {
        onSuccess()
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md border-border">
        <CardHeader>
          <CardTitle>Schedule Service</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <div className="h-10 bg-muted animate-pulse rounded" />
              <div className="h-10 bg-muted animate-pulse rounded" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Field Worker</label>
                {fieldWorkers.length === 0 ? (
                  <p className="text-sm text-muted-foreground mt-1">No field workers available</p>
                ) : (
                  <select
                    value={formData.fieldWorkerId}
                    onChange={(e) => setFormData({ ...formData, fieldWorkerId: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  >
                    {fieldWorkers.map((worker) => (
                      <option key={worker.id} value={worker.id}>
                        {worker.name} ({worker.email})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Service Visit Type</label>
                <select
                  value={formData.serviceVisitType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      serviceVisitType: e.target.value as "regular" | "special",
                    })
                  }
                  className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                >
                  <option value="regular">Regular (next service)</option>
                  <option value="special">Special service</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Scheduled Date</label>
                <input
                  type="date"
                  value={formData.scheduledDate}
                  onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                  min={new Date().toISOString().split("T")[0]}
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
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={submitting || fieldWorkers.length === 0}
                >
                  {submitting ? "Scheduling..." : "Schedule"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
