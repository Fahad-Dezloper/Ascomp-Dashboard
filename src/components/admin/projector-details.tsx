"use client"

import type { Site, Projector } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface ProjectorDetailsProps {
  site: Site
  projector: Projector
  onSchedule: () => void
  onEdit?: () => void
  onViewDetails?: () => void
}

export default function ProjectorDetails({ site: _site, projector, onSchedule, onEdit, onViewDetails }: ProjectorDetailsProps) {
  const statusColor =
    projector.status.toLowerCase() === "pending"
      ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
      : projector.status.toLowerCase() === "completed"
        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
        : projector.status.toLowerCase() === "packed"
          ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100"
          : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"

  const formattedLastService =
    projector.lastServiceDate ? new Date(projector.lastServiceDate).toLocaleDateString() : "—"

  // const serviceHistoryCount = Array.isArray(projector.serviceHistory) ? projector.serviceHistory.length : 0

  return (
    <div
      className="flex h-full flex-col rounded-2xl border border-border bg-background/80 shadow-sm hover:shadow-md hover:bg-muted/40 transition-colors cursor-pointer"
      onClick={onViewDetails}
    >
      {/* Header + body */}
      <div className="flex flex-col px-5 pt-5 pb-4 gap-4">
        {/* Header: Name and Status Badge */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h4 className="text-base font-semibold text-foreground truncate mb-1">{projector.name}</h4>
          </div>
          <Badge
            className={`${statusColor} text-[11px] px-2.5 py-0.5 rounded-full shrink-0 whitespace-nowrap`}
          >
            {projector.status.charAt(0).toUpperCase() + projector.status.slice(1)}
          </Badge>
        </div>

        {/* Serial and Model aligned in a neat row */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 mt-0.5">
          <div className="flex items-center min-w-0">
            <span className="text-xs text-muted-foreground font-medium">Serial:</span>
            <span className="ml-1.5 text-xs font-medium text-foreground truncate">{projector.serialNumber}</span>
          </div>
          <div className="flex items-center min-w-0">
            <span className="text-xs text-muted-foreground font-medium">Model:</span>
            <span className="ml-1.5 text-xs font-medium text-foreground truncate">{projector.model}</span>
          </div>
        </div>

        {/* Metrics Row: only Last Service and Completed Services */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <div className="flex flex-col items-start">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground/90 font-medium mb-0.5">Last Service</span>
            <span className="text-sm font-semibold text-foreground">{formattedLastService}</span>
          </div>
          {/* <div className="flex flex-col items-start">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground/90 font-medium mb-0.5">Completed Services</span>
            <span className="text-sm font-semibold text-foreground">{serviceHistoryCount}</span>
          </div> */}
        </div>
      </div>

      {/* Footer actions */}
      <div
        className="flex items-center justify-between gap-3 border-t border-border px-4 py-3"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          size="sm"
          onClick={onSchedule}
          className="bg-black text-white hover:bg-gray-800 px-4"
        >
          Schedule
        </Button>
        {onEdit && (
          <Button
            size="sm"
            variant="outline"
            onClick={onEdit}
            className="border-border px-4"
          >
            Edit
          </Button>
        )}
      </div>
    </div>
  )
}
