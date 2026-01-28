"use client"

import { useEffect, useMemo, useState } from "react"
import { format, differenceInCalendarDays, parseISO, startOfDay, isSameDay, startOfMonth, startOfWeek, addMonths, subMonths, getDay, addDays } from "date-fns"
import { Search, CalendarClock, MapPin, User as UserIcon, LayoutGrid, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
        const res = await fetch("/api/admin/services/scheduled?" + new URLSearchParams({ q: search }), {
          cache: "no-store",
        })
        if (!res.ok) throw new Error("Failed to load scheduled services")
        const json = await res.json()
        setServices(json.services || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [search, refreshKey])

  const personColors: Record<string, { bg: string; border: string; hover: string }> = {
    "Manoj kumar": { bg: "bg-blue-100", border: "border-blue-400", hover: "hover:bg-blue-200" },
    "Arun Rajkumar": { bg: "bg-green-100", border: "border-green-400", hover: "hover:bg-green-200" },
    "Satish Yadav": { bg: "bg-purple-100", border: "border-purple-400", hover: "hover:bg-purple-200" },
    "Christie": { bg: "bg-orange-100", border: "border-orange-400", hover: "hover:bg-orange-200" },
    "Ascomp": { bg: "bg-teal-100", border: "border-teal-400", hover: "hover:bg-teal-200" },
    "Challa China": { bg: "bg-pink-100", border: "border-pink-400", hover: "hover:bg-pink-200" },
    "Pramod": { bg: "bg-indigo-100", border: "border-indigo-400", hover: "hover:bg-indigo-200" },
  }

  const assignedNames = useMemo(() => {
    const validNames = Object.keys(personColors)
    const names = new Set<string>()
    services.forEach((s) => s.assignedToName && validNames.includes(s.assignedToName) && names.add(s.assignedToName))
    return validNames.filter((name) => names.has(name))
  }, [services])

  const filteredServices = useMemo(() => {
    let filtered = services
    if (viewMode === "calendar" && selectedPerson) {
      filtered = filtered.filter((s) => s.assignedToName === selectedPerson)
    }
    const q = search.trim().toLowerCase()
    if (q) {
      filtered = filtered.filter((s) =>
        s.siteName.toLowerCase().includes(q) ||
        s.assignedToName?.toLowerCase().includes(q) ||
        s.projectorSerial?.toLowerCase().includes(q)
      )
    }
    return filtered
  }, [services, search, selectedPerson, viewMode])

  const handleUnassign = async (id: string) => {
    if (!confirm("Unassign this service?")) return
    try {
      const res = await fetch("/api/admin/services/scheduled/unassign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceRecordId: id }),
      })
      if (res.ok) setRefreshKey(k => k + 1)
    } catch (err) { alert("Action failed") }
  }

  const handleCancel = async (id: string) => {
    if (!confirm("Cancel this service?")) return
    try {
      const res = await fetch("/api/admin/services/schedule", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceRecordId: id }),
      })
      if (res.ok) setRefreshKey(k => k + 1)
    } catch (err) { alert("Action failed") }
  }

  const isOverdue = (dateStr: string | null) => dateStr ? differenceInCalendarDays(new Date(), parseISO(dateStr)) > 4 : false

  const servicesByDate = useMemo(() => {
    const grouped: Record<string, ScheduledService[]> = {}
    filteredServices.forEach((s) => {
      if (s.scheduledDate) {
        const key = format(parseISO(s.scheduledDate), "yyyy-MM-dd")
        if (!grouped[key]) grouped[key] = []
        grouped[key].push(s)
      }
    })
    return grouped
  }, [filteredServices])

  const getServicesForDate = (date: Date) => servicesByDate[format(date, "yyyy-MM-dd")] || []

  const currentMonthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 })
    return Array.from({ length: 42 }).map((_, i) => addDays(start, i))
  }, [currentMonth])

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  // --- LOGIC: Find the next N available working days (Sunday to Wednesday) ---
  const allocatedWorkingDays = useMemo(() => {
    const dates: string[] = []
    const count = filteredServices.length
    if (count === 0) return dates

    const today = startOfDay(new Date())
    let current = addDays(today, 1) // Start from tomorrow

    // Find next N working days
    while (dates.length < count && dates.length < 60) { // Safety cap
      const dayIdx = getDay(current)
      if (dayIdx >= 0 && dayIdx <= 3) { // Sun-Wed
        dates.push(format(current, "yyyy-MM-dd"))
      }
      current = addDays(current, 1)
    }
    return dates
  }, [filteredServices.length])

  const getDateBoxStyles = (date: Date, dayServices: ScheduledService[]) => {
    const dateKey = format(date, "yyyy-MM-dd")
    const isCurrentMonth = format(date, "M") === format(currentMonth, "M")

    // 1. Actual Scheduled Services (Jan 28 etc)
    if (dayServices.length > 0) {
      if (selectedPerson && personColors[selectedPerson]) {
        const c = personColors[selectedPerson]
        return isCurrentMonth ? `${c.bg} ${c.border} border shadow-sm` : "bg-muted/50 opacity-40"
      }
      const overdue = dayServices.some(s => isOverdue(s.scheduledDate))
      return isCurrentMonth ? (overdue ? "bg-amber-100 border-amber-400 border shadow-sm" : "bg-blue-100 border-blue-300 border shadow-sm") : "bg-muted/50 opacity-40"
    }

    // 2. Allocated Working Slots (Green Card Style)
    if (allocatedWorkingDays.includes(dateKey)) {
      return isCurrentMonth
        ? "bg-emerald-50/80 border border-emerald-100 shadow-sm"
        : "bg-emerald-50/20 opacity-40 border border-emerald-100/30"
    }

    if (!isCurrentMonth) return "bg-muted/10 opacity-40"
    return ""
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <CalendarClock className="h-5 w-5" /> Scheduled Services
        </h1>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant={viewMode === "cards" ? "default" : "outline"} size="sm" onClick={() => setViewMode("cards")}><LayoutGrid className="h-4 w-4 mr-2" /> Cards</Button>
        <div className="w-full flex justify-between">
          <Button variant={viewMode === "calendar" ? "default" : "outline"} size="sm" onClick={() => setViewMode("calendar")}><CalendarIcon className="h-4 w-4 mr-2" /> Calendar</Button>
          <div className="flex gap-4 items-center">
            {viewMode === "calendar" && (
              <div className="flex gap-1">
                {assignedNames.map(n => (
                  <button
                    key={n}
                    onClick={() => setSelectedPerson(n === selectedPerson ? "" : n)}
                    className={cn(
                      "px-2 py-1 rounded text-xs border transition-all",
                      selectedPerson === n
                        ? `${personColors[n]?.bg || ""} ${personColors[n]?.border || ""}`
                        : "bg-muted"
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}
            <h2 className="text-lg font-bold">{format(currentMonth, "MMMM yyyy")}</h2>
          </div>
        </div>
      </div>

      {loading ? <div className="h-40 bg-muted animate-pulse rounded-lg" /> : viewMode === "calendar" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className="h-4 w-4" /> Prev</Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>Today</Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>Next <ChevronRight className="h-4 w-4" /></Button>
          </div>

          <div className="border rounded-lg overflow-hidden bg-white">
            <div className="grid grid-cols-7  bg-muted/30 border-b">
              {weekDays.map((day, idx) => (
                <div key={day} className={cn("p-2 text-center text-xs font-bold border-r last:border-r-0", idx <= 3 && "bg-emerald-50/50 text-emerald-700")}>
                  {day} {idx <= 3 && <div className="text-[8px] font-normal opacity-60">WORK</div>}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {currentMonthDays.map((day, idx) => {
                const dayServices = getServicesForDate(day)
                const isToday = isSameDay(day, new Date())
                const dateKey = format(day, "yyyy-MM-dd")
                const isCurrentMonth = format(day, "M") === format(currentMonth, "M")

                if (!isCurrentMonth) {
                  return (
                    <div
                      key={idx}
                      className="min-h-[110px] border-r border-b last:border-r-0 bg-gray-800/40"
                    />
                  )
                }

                return (
                  <div
                    key={idx}
                    className={cn(
                      "min-h-[110px] border-r border-b last:border-r-0 p-1 relative cursor-pointer group transition-all",
                      isToday && "bg-primary/5"
                    )}
                    onClick={() => dayServices.length > 0 && (setDialogDate(day), setDialogOpen(true))}
                  >
                    <div className={cn(
                      "h-full w-full rounded p-1.5 transition-all flex flex-col gap-1",
                      getDateBoxStyles(day, dayServices),
                      isToday && !getDateBoxStyles(day, dayServices) && "border-primary/20 bg-primary/5"
                    )}>
                      <div className="flex justify-between items-center">
                        <span className={cn(
                          "text-sm font-bold transition-transform group-hover:scale-110",
                          isToday && isCurrentMonth ? "text-primary" : "opacity-60",
                          !dayServices.length && allocatedWorkingDays.includes(dateKey) && "text-emerald-700 opacity-100"
                        )}>
                          {format(day, "d")}
                        </span>

                        {dayServices.length > 0 ? (
                          <Badge variant="secondary" className="h-4 px-1 text-[9px] font-bold">
                            {dayServices.length}
                          </Badge>
                        ) : (
                          allocatedWorkingDays.includes(dateKey) && isCurrentMonth && (
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                          )
                        )}
                      </div>

                      <div className="flex-1 space-y-0.5">
                        {dayServices.length > 0 ? (
                          <>
                            {dayServices.slice(0, 3).map(s => s && (
                              <div key={s.id} className="text-[10px] font-medium line-clamp-1 truncate opacity-90 leading-tight">
                                • {s.siteName || "Unnamed Site"}
                              </div>
                            ))}
                            {dayServices.length > 3 && (
                              <div className="text-[9px] font-semibold opacity-60 pl-2">
                                +{dayServices.length - 3} more
                              </div>
                            )}
                          </>
                        ) : (
                          allocatedWorkingDays.includes(dateKey) && isCurrentMonth && (
                            <div className="mt-2 space-y-0.5">
                              <div className="text-base text-emerald-600 font-bold mt-4 uppercase tracking-wider">Reserved</div>
                            </div>
                          )
                        )}
                      </div>

                      {isToday && isCurrentMonth && (
                        <div className="absolute top-0 right-0 p-1">
                          <div className="w-1 h-1 rounded-full bg-primary" />
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredServices.map(s => (
            <Card key={s.id} className={cn("flex flex-col justify-between", isOverdue(s.scheduledDate) && "border-amber-400 bg-amber-50/20")}>
              <CardHeader className="p-4 pb-2 flex-row justify-between items-start space-y-0">
                <CardTitle className="text-sm font-bold truncate pr-2">{s.siteName}</CardTitle>
                <Badge variant={s.status === "in_progress" ? "outline" : "secondary"}>{s.status}</Badge>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3 pb-4">
                <p className="text-[11px] text-muted-foreground line-clamp-1"><MapPin className="h-3 w-3 inline mr-1" />{s.siteAddress}</p>
                <div className="flex justify-between text-xs font-medium">
                  <span>{s.scheduledDate ? format(parseISO(s.scheduledDate), "dd MMM yyyy") : "No Date"}</span>
                  {s.serviceNumber && <span className="opacity-60">#{s.serviceNumber}</span>}
                </div>
                <div className="border-t pt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs truncate">
                    <UserIcon className="h-3 w-3" /> <span className="truncate">{s.assignedToName || "Unassigned"}</span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {s.assignedToName ? (
                      <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => handleUnassign(s.id)}>Unassign</Button>
                    ) : (
                      <Button size="sm" className="h-7 px-2" onClick={() => { setSelectedForAssign({ siteId: s.siteId, projectorId: s.projectorId }); setAssignModalOpen(true); }}>Assign</Button>
                    )}
                    <Button size="sm" variant="outline" className="h-7 px-2 text-destructive" onClick={() => handleCancel(s.id)}>Cancel</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Services: {dialogDate && format(dialogDate, "dd MMMM yyyy")}</DialogTitle></DialogHeader>
          <div className="grid gap-2">
            {dialogDate && getServicesForDate(dialogDate).map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                <div className="text-sm font-medium">{s.siteName} <span className="text-xs opacity-60 ml-2">({s.assignedToName})</span></div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="h-8" onClick={() => { handleUnassign(s.id); setDialogOpen(false); }}>Unassign</Button>
                  <Button size="sm" variant="outline" className="h-8 text-destructive" onClick={() => { handleCancel(s.id); setDialogOpen(false); }}>Cancel</Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {assignModalOpen && selectedForAssign && (
        <ScheduleServiceModal siteId={selectedForAssign.siteId} projectorId={selectedForAssign.projectorId} onClose={() => setAssignModalOpen(false)} onSuccess={() => { setRefreshKey(k => k + 1); setAssignModalOpen(false); }} />
      )}
    </div>
  )
}
