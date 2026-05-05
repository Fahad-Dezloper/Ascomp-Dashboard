"use client"

import { ChevronRight } from "lucide-react"

interface ServiceCardProps {
  service: any
  onClick: () => void
  viewMode: "completed" | "allCompleted"
}

export function ServiceCard({ service, onClick, viewMode }: ServiceCardProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div
      className="border-2 border-black hover:bg-gray-50 cursor-pointer transition-colors rounded-sm p-4 sm:p-6 bg-white"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-xl font-bold text-black">
              Service #{service.serviceNumber} - <span className="text-base text-gray-800">{service.engineerName}</span>
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Site</p>
              <p className="font-semibold text-black">{service.site.name}</p>
              {service.site.address && (
                <p className="text-gray-600 text-xs mt-1 truncate">{service.site.address}</p>
              )}
            </div>
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Projector</p>
              <p className="font-semibold text-black">
                {service.projector.model} <span className="text-gray-400 font-normal">|</span> {service.projector.serialNo}
              </p>
            </div>
            {(service.screenNumber || service.site?.screenNo) && (
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Screen</p>
                <p className="font-semibold text-black">
                  {service.screenNumber ?? service.site?.screenNo}
                </p>
              </div>
            )}
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Service Date</p>
              <p className="font-semibold text-black">{formatDate(service.date)}</p>
            </div>
            {(viewMode === "completed" || viewMode === "allCompleted") && (
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Completed</p>
                <p className="font-semibold text-black">{formatDateTime(service.completedAt || service.date)}</p>
              </div>
            )}
          </div>
        </div>
        <div className="h-full flex items-center justify-center">
          <ChevronRight className="h-6 w-6 text-gray-400" />
        </div>
      </div>
    </div>
  )
}
