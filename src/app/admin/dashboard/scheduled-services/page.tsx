"use client"

import { useEffect, useMemo, useState } from "react"
import { format, differenceInCalendarDays, parseISO, startOfDay, isSameDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addMonths, subMonths, getDay, isFuture, addDays } from "date-fns"
import { Search, CalendarClock, MapPin, Projector as ProjectorIcon, User as UserIcon, X, Ban, LayoutGrid, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Eye } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import ScheduleServiceModal from "@/components/admin/modals/schedule-service-modal"

interface ScheduledService {
  id: string
  projectorId: string
  siteId: string
  serviceNumber: string | null
  siteName: string
  siteAddress: string
  projectorModel: string | null
  projectorSerial: string | null
  screenNumber: string | null
  assignedToName: string | null
  assignedToEmail: string | null
  status: "scheduled" | "in_progress"
  scheduledDate: string | null // ISO string
}

export default function ScheduledServicesPage() {
  const [services, setServices] = useState<ScheduledService[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [refreshKey, setRefreshKey] = useState(0)
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [selectedForAssign, setSelectedForAssign] = useState<{ siteId: string; projectorId: string } | null>(null)
  const [viewMode, setViewMode] = useState<"cards" | "calendar">("cards")
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogDate, setDialogDate] = useState<Date | null>(null)
  const [selectedPerson, setSelectedPerson] = useState<string>("")

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch("/api/admin/services/scheduled?" + new URLSearchParams({ q: search }), {
          cache: "no-store",
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || "Failed to load scheduled services")
        }
        const json = await res.json()
        setServices(json.services || [])
      } catch (err) {
        console.error("Failed to load scheduled services", err)
        setError(err instanceof Error ? err.message : "Failed to load scheduled services")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [search, refreshKey])

  // Color mapping for each assigned person
  const personColors: Record<string, { bg: string; border: string; hover: string }> = {
    "Manoj kumar": {
      bg: "bg-blue-100",
      border: "border-blue-400",
      hover: "hover:bg-blue-200",
    },
    "Arun Rajkumar": {
      bg: "bg-green-100",
      border: "border-green-400",
      hover: "hover:bg-green-200",
    },
    "Satish Yadav": {
      bg: "bg-purple-100",
      border: "border-purple-400",
      hover: "hover:bg-purple-200",
    },
    "Christie": {
      bg: "bg-orange-100",
      border: "border-orange-400",
      hover: "hover:bg-orange-200",
    },
    "Ascomp": {
      bg: "bg-teal-100",
      border: "border-teal-400",
      hover: "hover:bg-teal-200",
    },
    "Challa China": {
      bg: "bg-pink-100",
      border: "border-pink-400",
      hover: "hover:bg-pink-200",
    },
    "Pramod": {
      bg: "bg-indigo-100",
      border: "border-indigo-400",
      hover: "hover:bg-indigo-200",
    },
  }

  // Get all unique assigned names (only show these specific names)
  const assignedNames = useMemo(() => {
    const validNames = ["Manoj kumar", "Arun Rajkumar", "Satish Yadav", "Christie", "Ascomp", "Challa China", "Pramod"]
    const names = new Set<string>()
    services.forEach((service) => {
      if (service.assignedToName && service.assignedToName.trim() && validNames.includes(service.assignedToName)) {
        names.add(service.assignedToName)
      }
    })
    // Sort according to the predefined order
    return validNames.filter((name) => names.has(name))
  }, [services])

  const filteredServices = useMemo(() => {
    let filtered = services

    // Apply person filter only in calendar view
    if (viewMode === "calendar" && selectedPerson) {
      filtered = filtered.filter((s) => s.assignedToName === selectedPerson)
    }
    // In cards view, show all services (no person filter)

    // Apply search filter
    const q = search.trim().toLowerCase()
    if (q) {
      filtered = filtered.filter((s) => {
        return (
          s.siteName.toLowerCase().includes(q) ||
          (s.siteAddress && s.siteAddress.toLowerCase().includes(q)) ||
          (s.projectorModel && s.projectorModel.toLowerCase().includes(q)) ||
          (s.projectorSerial && s.projectorSerial.toLowerCase().includes(q)) ||
          (s.assignedToName && s.assignedToName.toLowerCase().includes(q))
        )
      })
    }

    return filtered
  }, [services, search, selectedPerson, viewMode])

  const handleUnassign = async (id: string) => {
    if (!confirm("Unassign this field worker from the scheduled service?")) return
    try {
      const res = await fetch("/api/admin/services/scheduled/unassign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceRecordId: id }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to unassign")
      }
      setRefreshKey((k) => k + 1)
      // After unassign, service will come back as unassigned on next reload
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to unassign")
    }
  }

  const handleCancel = async (id: string) => {
    if (!confirm("Cancel this scheduled service? This will delete the schedule.")) return
    try {
      const res = await fetch("/api/admin/services/schedule", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceRecordId: id }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to cancel scheduling")
      }
      setRefreshKey((k) => k + 1)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to cancel scheduling")
    }
  }

  const isOverdueByMoreThan4Days = (dateStr: string | null) => {
    if (!dateStr) return false
    try {
      const d = parseISO(dateStr)
      const diff = differenceInCalendarDays(new Date(), d)
      return diff > 4
    } catch {
      return false
    }
  }

  // Group services by date
  const servicesByDate = useMemo(() => {
    const grouped: Record<string, ScheduledService[]> = {}
    filteredServices.forEach((service) => {
      if (service.scheduledDate) {
        try {
          const date = parseISO(service.scheduledDate)
          const dateKey = format(startOfDay(date), "yyyy-MM-dd")
          if (!grouped[dateKey]) {
            grouped[dateKey] = []
          }
          grouped[dateKey].push(service)
        } catch {
          // Ignore invalid dates
        }
      }
    })
    return grouped
  }, [filteredServices])

  // Get services for a specific date
  const getServicesForDate = (date: Date) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return []
    }
    try {
      const dateKey = format(startOfDay(date), "yyyy-MM-dd")
      return servicesByDate[dateKey] || []
    } catch {
      return []
    }
  }

  // Get calendar days for a month
  const getCalendarDays = (month: Date) => {
    if (!month || !(month instanceof Date) || isNaN(month.getTime())) {
      return []
    }
    try {
      const monthStart = startOfMonth(month)
      const monthEnd = endOfMonth(month)
      const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }) // Sunday = 0
      const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
      return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
    } catch {
      return []
    }
  }

  const currentMonthDays = useMemo(() => {
    try {
      return getCalendarDays(currentMonth)
    } catch {
      return []
    }
  }, [currentMonth])

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  // Check if there are services in previous/next months
  const hasServicesInPreviousMonth = useMemo(() => {
    const prevMonth = subMonths(currentMonth, 1)
    const prevMonthStart = startOfMonth(prevMonth)
    const prevMonthEnd = endOfMonth(prevMonth)
    
    return filteredServices.some((service) => {
      if (!service.scheduledDate) return false
      try {
        const serviceDate = parseISO(service.scheduledDate)
        return serviceDate >= prevMonthStart && serviceDate <= prevMonthEnd
      } catch {
        return false
      }
    })
  }, [filteredServices, currentMonth])

  const hasServicesInNextMonth = useMemo(() => {
    const nextMonth = addMonths(currentMonth, 1)
    const nextMonthStart = startOfMonth(nextMonth)
    const nextMonthEnd = endOfMonth(nextMonth)
    
    return filteredServices.some((service) => {
      if (!service.scheduledDate) return false
      try {
        const serviceDate = parseISO(service.scheduledDate)
        return serviceDate >= nextMonthStart && serviceDate <= nextMonthEnd
      } catch {
        return false
      }
    })
  }, [filteredServices, currentMonth])

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1))
  }

  const handleDateClick = (date: Date) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return
    }
    try {
      const services = getServicesForDate(date)
      if (services && services.length > 0) {
        setDialogDate(date)
        setDialogOpen(true)
      }
    } catch {
      // Silently fail if date is invalid
    }
  }

  // Check if a date is a working day (Sunday to Wednesday)
  const isWorkingDay = (date: Date) => {
    try {
      const dayOfWeek = getDay(date) // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      return dayOfWeek >= 0 && dayOfWeek <= 3 // Sunday (0), Monday (1), Tuesday (2), Wednesday (3)
    } catch {
      return false
    }
  }

  // Get upcoming working days based on number of filtered services (for the selected person in calendar view)
  const upcomingWorkingDays = useMemo(() => {
    // Only calculate for calendar view with filtered services
    if (viewMode !== "calendar") {
      return []
    }
    const workingDays: Date[] = []
    const today = startOfDay(new Date())
    let currentDate = addDays(today, 1) // Start from tomorrow (upcoming only)
    const maxDays = filteredServices.length // Use filtered services count (selected person's services)
    let daysChecked = 0
    
    // Find the next N working days (Sunday to Wednesday) that are in the future
    while (workingDays.length < maxDays && daysChecked < 365) { // Safety limit
      if (isWorkingDay(currentDate) && isFuture(currentDate)) {
        workingDays.push(startOfDay(currentDate))
      }
      currentDate = addDays(currentDate, 1)
      daysChecked++
    }
    
    return workingDays.slice(0, filteredServices.length) // Limit to number of filtered services
  }, [filteredServices, viewMode])

  const getDateBoxColor = (date: Date, services: ScheduledService[]) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) return ""
    if (!services || !Array.isArray(services) || services.length === 0) {
      // Check if this is an upcoming working day (only in calendar view)
      if (viewMode === "calendar" && selectedPerson && personColors[selectedPerson]) {
        const dateKey = format(startOfDay(date), "yyyy-MM-dd")
        const isUpcomingWorkingDay = upcomingWorkingDays.some((wd) => 
          format(startOfDay(wd), "yyyy-MM-dd") === dateKey
        )
        if (isUpcomingWorkingDay) {
          // Use the selected person's color for upcoming working days (lighter variant)
          const color = personColors[selectedPerson]
          return `${color.bg.replace("100", "50")} ${color.border.replace("400", "300")} ${color.hover.replace("200", "100")}`
        }
      }
      return ""
    }
    try {
      // Use the selected person's color for all services (since we're filtering by person)
      if (selectedPerson && personColors[selectedPerson]) {
        const color = personColors[selectedPerson]
        const hasOverdue = services.some((s) => s && isOverdueByMoreThan4Days(s.scheduledDate))
        
        // If overdue, use a darker variant of the person's color
        if (hasOverdue) {
          return `${color.bg.replace("100", "200")} ${color.border.replace("400", "600")} ${color.hover.replace("200", "300")}`
        }
        // Use the person's assigned color
        return `${color.bg} ${color.border} ${color.hover}`
      }
      
      // Fallback to default colors if person color not found (should not happen in calendar view)
      const hasOverdue = services.some((s) => s && isOverdueByMoreThan4Days(s.scheduledDate))
      const hasInProgress = services.some((s) => s && s.status === "in_progress")
      const count = services.length

      if (hasOverdue) return "bg-amber-100 border-amber-400 hover:bg-amber-200"
      if (hasInProgress) return "bg-yellow-100 border-yellow-400 hover:bg-yellow-200"
      if (count === 1) return "bg-blue-50 border-blue-300 hover:bg-blue-100"
      if (count === 2) return "bg-blue-100 border-blue-400 hover:bg-blue-200"
      return "bg-blue-200 border-blue-500 hover:bg-blue-300" // 3+ services
    } catch {
      return ""
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Scheduled Services
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            View and manage all scheduled and in-progress services across sites.
          </p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by site, projector, or engineer..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="py-3 text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      )}

      {/* View Mode Toggle */}
      <div className="flex gap-2">
        <Button
          variant={viewMode === "cards" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("cards")}
          className="flex items-center gap-2"
        >
          <LayoutGrid className="h-4 w-4" />
          Cards
        </Button>
        <div className="w-full flex justify-between">
        <Button
          variant={viewMode === "calendar" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("calendar")}
          className="flex items-center gap-2"
        >
          <CalendarIcon className="h-4 w-4" />
          Calendar
        </Button>
        <div className="flex gap-8 items-center">
                {/* Assigned People Tabs - Only show in calendar view */}
      {viewMode === "calendar" && assignedNames.length > 0 && (
        <div className="space-y-2">
          {/* <p className="text-sm font-medium text-foreground">View by Assigned Person</p> */}
          <div className="flex gap-2 flex-wrap">
            {assignedNames.map((name) => {
              const count = services.filter((s) => s.assignedToName === name).length
              const isSelected = selectedPerson === name
              const personColor = personColors[name]
              return (
                <button
                  key={name}
                  onClick={() => setSelectedPerson(name)}
                  className={cn(
                    "px-2 py-1 rounded-lg font-medium text-xs transition-colors border-2",
                    isSelected && personColor
                      ? `${personColor.bg} ${personColor.border} ${personColor.hover} text-foreground`
                      : "bg-muted text-foreground hover:bg-muted/80 border-transparent"
                  )}
                >
                  {name} ({count})
                </button>
              )
            })}
          </div>
        </div>
      )}
        {viewMode === "calendar" && 
          <h2 className="text-xl font-semibold text-center">
              {(() => {
                try {
                  return format(currentMonth, "MMMM yyyy")
                } catch {
                  return "Calendar"
                }
              })()}
            </h2> 
          }
        </div>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-border">
              <CardContent className="p-4 space-y-3">
                <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                <div className="h-3 w-40 bg-muted animate-pulse rounded" />
                <div className="flex gap-2 mt-2">
                  <div className="h-7 w-16 bg-muted animate-pulse rounded" />
                  <div className="h-7 w-20 bg-muted animate-pulse rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredServices.length === 0 ? (
        <Card className="border-dashed border-border">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No scheduled services found.
          </CardContent>
        </Card>
      ) : viewMode === "calendar" ? (
        <div className="space-y-6">
          {/* Month Navigation */}
          {(hasServicesInPreviousMonth || hasServicesInNextMonth) && (
            <div className="flex items-center justify-between">
              {hasServicesInPreviousMonth ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousMonth}
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous Month
                </Button>
              ) : (
                <div></div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(new Date())}
              >
                Today
              </Button>
              {hasServicesInNextMonth ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextMonth}
                  className="flex items-center gap-2"
                >
                  Next Month
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <div></div>
              )}
            </div>
          )}

          {/* Calendar Grid */}
          <div className="space-y-3">
            <div className="border rounded-lg overflow-hidden">
                {/* Weekday Headers */}
                <div className="grid grid-cols-7 bg-muted/50 border-b">
                  {weekDays.map((day) => (
                    <div key={day} className="p-2 text-center text-sm font-semibold border-r last:border-r-0">
                      {day}
                    </div>
                  ))}
                </div>
                {/* Calendar Days */}
                <div className="grid grid-cols-7">
                  {Array.isArray(currentMonthDays) && currentMonthDays.length > 0 ? currentMonthDays.map((day, idx) => {
                    if (!day || !(day instanceof Date) || isNaN(day.getTime())) {
                      return null
                    }
                    try {
                      const dayServices = getServicesForDate(day) || []
                      const isCurrentMonth = format(day, "M") === format(currentMonth, "M")
                      const isToday = isSameDay(day, new Date())

                      return (
                        <div
                          key={idx}
                          className={cn(
                            "min-h-[100px] border-r border-b last:border-r-0 p-2 cursor-pointer transition-colors",
                            !isCurrentMonth && "bg-muted/20 text-muted-foreground",
                            isCurrentMonth && getDateBoxColor(day, dayServices),
                            isToday && isCurrentMonth && "ring-2 ring-primary"
                          )}
                          onClick={() => handleDateClick(day)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className={cn(
                              "text-sm font-semibold",
                              isToday && isCurrentMonth && "text-primary"
                            )}>
                              {format(day, "d")}
                            </span>
                            {Array.isArray(dayServices) && dayServices.length > 0 && (
                              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                                {dayServices.length}
                              </Badge>
                            )}
                          </div>
                          {Array.isArray(dayServices) && dayServices.length > 0 && (
                            <div className="space-y-1">
                              {dayServices.length === 1 && dayServices[0] ? (
                                // Single service - show details
                                <div className="text-xs">
                                  <div className="font-medium line-clamp-1">{dayServices[0]?.siteName || "N/A"}</div>
                                  {dayServices[0]?.assignedToName && (
                                    <div className="text-[10px] text-muted-foreground line-clamp-1">
                                      {dayServices[0].assignedToName}
                                    </div>
                                  )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-5 px-1.5 mt-1 text-[10px]"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setDialogDate(day)
                                    setDialogOpen(true)
                                  }}
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  View
                                </Button>
                              </div>
                              ) : (
                                // Multiple services - show list
                                <div className="space-y-0.5">
                                  {Array.isArray(dayServices) && dayServices.slice(0, 2).map((service) => (
                                    service && (
                                      <div key={service.id || Math.random()} className="text-[10px] font-medium line-clamp-1">
                                        • {service.siteName || "N/A"}
                                      </div>
                                    )
                                  ))}
                                  {Array.isArray(dayServices) && dayServices.length > 2 && (
                                    <div className="text-[10px] text-muted-foreground">
                                      +{dayServices.length - 2} more
                                    </div>
                                  )}
                                {/* <Button
                                  size="sm"
                                  variant="default"
                                  className="h-5 px-1.5 mt-1 text-[10px]"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setDialogDate(day)
                                    setDialogOpen(true)
                                  }}
                                >
                                  View All
                                </Button> */}
                              </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    } catch {
                      return null
                    }
                  }).filter(Boolean) : null}
                </div>
              </div>
            </div>

          {/* Services Dialog */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  Services on {dialogDate ? format(dialogDate, "MMMM d, yyyy") : ""}
                </DialogTitle>
                <DialogDescription>
                  {dialogDate && getServicesForDate(dialogDate).length} service(s) scheduled
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 md:grid-cols-2">
                {dialogDate && (dialogDate instanceof Date) && !isNaN(dialogDate.getTime()) ? (() => {
                  try {
                    const services = getServicesForDate(dialogDate)
                    return Array.isArray(services) ? services.map((service) => {
                      if (!service) return null
                      const overdue = isOverdueByMoreThan4Days(service.scheduledDate)
                      const dateLabel = service.scheduledDate
                        ? (() => {
                            try {
                              return format(parseISO(service.scheduledDate), "dd/MM/yyyy")
                            } catch {
                              return "Invalid date"
                            }
                          })()
                        : "Not scheduled"

                      return (
                        <Card
                          key={service.id || Math.random()}
                          className={cn(
                            "border border-border bg-white",
                            overdue && "border-amber-500/70 bg-amber-50/40"
                          )}
                        >
                      <CardHeader className="pb-3 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <CardTitle className="text-sm font-semibold leading-tight">
                            {service.siteName}
                          </CardTitle>
                          <Badge
                            variant={service.status === "in_progress" ? "outline" : "secondary"}
                            className={cn(
                              "text-[11px] px-2 py-0.5 border border-border",
                              service.status === "in_progress" && "bg-yellow-50 text-yellow-800 border-yellow-300",
                              service.status === "scheduled" && "bg-blue-50 text-blue-800 border-blue-300"
                            )}
                          >
                            {service.status === "in_progress" ? "In Progress" : "Scheduled"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 flex items-start gap-1">
                          <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          {service.siteAddress}
                        </p>
                        {overdue && (
                          <p className="mt-1 text-[11px] font-medium text-amber-700">
                            Pending for more than 4 days
                          </p>
                        )}
                      </CardHeader>
                      <CardContent className="pt-0 space-y-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <CalendarClock className="h-3.5 w-3.5" />
                            <span className="font-medium text-foreground">{dateLabel}</span>
                          </div>
                          {service.serviceNumber && (
                            <span className="text-[11px]">SR #{service.serviceNumber}</span>
                          )}
                        </div>

                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-center gap-1.5">
                            <ProjectorIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-medium text-foreground">
                              {service.projectorModel || "Model N/A"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 pl-5">
                            <span className="text-muted-foreground">Serial:</span>
                            <span className="font-mono text-[11px] text-foreground">
                              {service.projectorSerial || "N/A"}
                            </span>
                          </div>
                          {service.screenNumber && (
                            <div className="flex items-center gap-1.5 pl-5">
                              <span className="text-muted-foreground">Screen:</span>
                              <span className="text-foreground">{service.screenNumber}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-1">
                          <div className="flex items-center gap-1.5 text-xs">
                            <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground">
                                {service.assignedToName || "Unassigned"}
                              </span>
                              {service.assignedToEmail && (
                                <span className="text-[11px] text-muted-foreground line-clamp-1">
                                  {service.assignedToEmail}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 justify-end mt-3">
                          {service.assignedToName ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-[11px] border-border flex items-center gap-1"
                                onClick={() => {
                                  handleUnassign(service.id)
                                  setDialogOpen(false)
                                }}
                              >
                                <X className="h-3 w-3" />
                                Unassign
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-[11px] border-destructive text-destructive flex items-center gap-1 hover:bg-destructive/10"
                                onClick={() => {
                                  handleCancel(service.id)
                                  setDialogOpen(false)
                                }}
                              >
                                <Ban className="h-3 w-3" />
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                className="h-7 px-3 text-[11px] flex items-center gap-1"
                                onClick={() => {
                                  setSelectedForAssign({ siteId: service.siteId, projectorId: service.projectorId })
                                  setAssignModalOpen(true)
                                  setDialogOpen(false)
                                }}
                              >
                                Assign
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-[11px] border-destructive text-destructive flex items-center gap-1 hover:bg-destructive/10"
                                onClick={() => {
                                  handleCancel(service.id)
                                  setDialogOpen(false)
                                }}
                              >
                                <Ban className="h-3 w-3" />
                                Cancel
                              </Button>
                            </>
                          )}
                        </div>
                        </CardContent>
                      </Card>
                      )
                    }).filter(Boolean) : []
                  } catch {
                    return []
                  }
                })() : null}
                </div>
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredServices.map((service) => {
            const overdue = isOverdueByMoreThan4Days(service.scheduledDate)
            const dateLabel = service.scheduledDate
              ? format(parseISO(service.scheduledDate), "dd/MM/yyyy")
              : "Not scheduled"

            return (
              <Card
                key={service.id}
                className={cn(
                  "border border-border bg-white flex flex-col justify-between transition-shadow hover:shadow-md",
                  overdue && "border-amber-500/70 bg-amber-50/40"
                )}
              >
                <CardHeader className="pb-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm font-semibold leading-tight">
                      {service.siteName}
                    </CardTitle>
                    <Badge
                      variant={service.status === "in_progress" ? "outline" : "secondary"}
                      className={cn(
                        "text-[11px] px-2 py-0.5 border border-border",
                        service.status === "in_progress" && "bg-yellow-50 text-yellow-800 border-yellow-300",
                        service.status === "scheduled" && "bg-blue-50 text-blue-800 border-blue-300"
                      )}
                    >
                      {service.status === "in_progress" ? "In Progress" : "Scheduled"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 flex items-start gap-1">
                    <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    {service.siteAddress}
                  </p>
                  {overdue && (
                    <p className="mt-1 text-[11px] font-medium text-amber-700">
                      Pending for more than 4 days
                    </p>
                  )}
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <CalendarClock className="h-3.5 w-3.5" />
                      <span className="font-medium text-foreground">{dateLabel}</span>
                    </div>
                    {service.serviceNumber && (
                      <span className="text-[11px]">SR #{service.serviceNumber}</span>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-1.5">
                      <ProjectorIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium text-foreground">
                        {service.projectorModel || "Model N/A"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 pl-5">
                      <span className="text-muted-foreground">Serial:</span>
                      <span className="font-mono text-[11px] text-foreground">
                        {service.projectorSerial || "N/A"}
                      </span>
                    </div>
                    {service.screenNumber && (
                      <div className="flex items-center gap-1.5 pl-5">
                        <span className="text-muted-foreground">Screen:</span>
                        <span className="text-foreground">{service.screenNumber}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-1.5 text-xs">
                      <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">
                          {service.assignedToName || "Unassigned"}
                        </span>
                        {service.assignedToEmail && (
                          <span className="text-[11px] text-muted-foreground line-clamp-1">
                            {service.assignedToEmail}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end mt-3">
                    {service.assignedToName ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-[11px] border-border flex items-center gap-1"
                          onClick={() => handleUnassign(service.id)}
                        >
                          <X className="h-3 w-3" />
                          Unassign
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-[11px] border-destructive text-destructive flex items-center gap-1 hover:bg-destructive/10"
                          onClick={() => handleCancel(service.id)}
                        >
                          <Ban className="h-3 w-3" />
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          className="h-7 px-3 text-[11px] flex items-center gap-1"
                          onClick={() => {
                            setSelectedForAssign({ siteId: service.siteId, projectorId: service.projectorId })
                            setAssignModalOpen(true)
                          }}
                        >
                          Assign
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-[11px] border-destructive text-destructive flex items-center gap-1 hover:bg-destructive/10"
                          onClick={() => handleCancel(service.id)}
                        >
                          <Ban className="h-3 w-3" />
                          Cancel
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
      {assignModalOpen && selectedForAssign && (
        <ScheduleServiceModal
          siteId={selectedForAssign.siteId}
          projectorId={selectedForAssign.projectorId}
          onClose={() => {
            setAssignModalOpen(false)
            setSelectedForAssign(null)
          }}
          onSuccess={() => {
            setRefreshKey((k) => k + 1)
            setAssignModalOpen(false)
            setSelectedForAssign(null)
          }}
        />
      )}
    </div>
  )
}
