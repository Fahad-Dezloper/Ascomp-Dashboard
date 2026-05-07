"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface SelfScheduleModalProps {
  siteId: string
  projectorId: string
  onClose: () => void
  onSuccess?: () => void
}

/** Same inputs as admin Schedule Service (site + projector + date); assignee is always the signed-in engineer. */
export default function SelfScheduleModal({
  siteId,
  projectorId,
  onClose,
  onSuccess,
}: SelfScheduleModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scheduledDate, setScheduledDate] = useState(() => {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${y}-${m}-${day}`
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch("/api/user/services/self-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          siteId,
          projectorId,
          scheduledDate,
        }),
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || "Failed to schedule")
      }

      onSuccess?.()
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
          <CardTitle>Assign visit to me</CardTitle>
          <p className="text-sm text-muted-foreground font-normal pt-1">
            Same as admin “Schedule Service”: creates or updates the open visit for this projector and sets you as
            the assignee.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Visit date</label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
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
              <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={submitting}>
                {submitting ? "Saving..." : "Confirm"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
