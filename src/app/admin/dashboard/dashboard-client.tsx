"use client"

import { useEffect, useState, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Activity,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Projector,
  CalendarIcon,
  ChevronDown,
  Eye,
  ExternalLink,
  MapPin,
  CalendarPlus,
} from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"
import ScheduleServiceModal from "@/components/admin/modals/schedule-service-modal"

type LowFlProjector = {
  id: string
  serialNo: string
  modelNo: string
  siteId: string
  siteName: string
  siteAddress: string
  flLeft: string
  flRight: string
  lastServiceDate: string | null
}

type PendingProjector = {
  id: string
  serialNo: string
  modelNo: string
  status: string
  siteId: string
  siteName: string
  siteAddress: string
  screenNumber: string | null
  lastServiceDate: string | null
}

type EngineerStat = {
  id: string
  name: string
  email: string
  completed: number
  pending: number
  inProgress: number
  total: number
}

type ServiceByDay = {
  day: string
  count: number
}

type ServiceByMonth = {
  month: string
  count: number
}

type DashboardData = {
  totals: {
    all: number
    scheduled: number
    pending: number
    packed: number
    projectors: number
    engineers: number
    completed: number
  }
  servicesByDay: ServiceByDay[]
  servicesByMonth: ServiceByMonth[]
  lowFlProjectors: LowFlProjector[]
  pendingProjectors: PendingProjector[]
  packedProjectors: PendingProjector[]
}

type EngineerStatsResponse = {
  filter: string
  dateRange: { start: string; end: string }
  totals: {
    engineers: number
    totalAssigned: number
    totalCompleted: number
    totalPending: number
    totalInProgress: number
  }
  engineers: EngineerStat[]
}

const chartConfig: ChartConfig = {
  completed: { label: "Completed", color: "#22c55e" },
  pending: { label: "Pending", color: "#ef4444" },
  inProgress: { label: "In Progress", color: "#eab308" },
  scheduled: { label: "Scheduled", color: "#3b82f6" },
}

// Color palette for pie chart segments
const PIE_COLORS = ["#000000", "#374151", "#6b7280", "#9ca3af", "#d1d5db", "#e5e7eb", "#f3f4f6"]

const MetricCard = ({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
}: {
  title: string
  value: string | number
  icon: React.ElementType
  trend?: "up" | "down" | "neutral"
  trendLabel?: string
}) => (
  <div className="border border-border rounded-lg bg-white">
    <div className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium whitespace-nowrap text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
          {trendLabel && (
            <p className={`text-xs mt-1 ${trend === "up" ? "text-green-600" : trend === "down" ? "text-red-600" : "text-muted-foreground"}`}>
              {trendLabel}
            </p>
          )}
        </div>
        <div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center">
          <Icon className="h-5 w-5 text-foreground" />
        </div>
      </div>
    </div>
  </div>
)

type DateFilterType = "today" | "7days" | "month" | "custom"

export default function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [serviceViewMode, setServiceViewMode] = useState<"weekly" | "monthly">("weekly")

  // Engineer stats state
  const [engineerStats, setEngineerStats] = useState<EngineerStat[]>([])
  const [engineerStatsLoading, setEngineerStatsLoading] = useState(false)
  const [engineerFilter, setEngineerFilter] = useState<DateFilterType>("today")
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined)
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false)

  // Dialog state for Low fL Projector details
  const [selectedLowFlProjector, setSelectedLowFlProjector] = useState<LowFlProjector | null>(null)
  const [isLowFlDialogOpen, setIsLowFlDialogOpen] = useState(false)

  // Schedule modal state
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [selectedProjectorForSchedule, setSelectedProjectorForSchedule] = useState<PendingProjector | null>(null)

  // Load main dashboard data
  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch("/api/admin/analytics", { cache: "no-store" })
      if (!res.ok) {
        throw new Error("Failed to load analytics")
      }
      const json = (await res.json()) as DashboardData
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  // Load engineer stats based on filter
  useEffect(() => {
    const loadEngineerStats = async () => {
      setEngineerStatsLoading(true)
      try {
        let url = `/api/admin/engineer-stats?filter=${engineerFilter}`
        if (engineerFilter === "custom" && customDate) {
          url += `&date=${format(customDate, "yyyy-MM-dd")}`
        }
        const res = await fetch(url, { cache: "no-store" })
        if (res.ok) {
          const json = (await res.json()) as EngineerStatsResponse
          setEngineerStats(json.engineers)
        }
      } catch (err) {
        console.error("Failed to load engineer stats:", err)
      } finally {
        setEngineerStatsLoading(false)
      }
    }
    loadEngineerStats()
  }, [engineerFilter, customDate])

  const handleFilterSelect = (filter: DateFilterType) => {
    if (filter === "custom") {
      setIsDatePickerOpen(true)
    } else {
      setEngineerFilter(filter)
      setCustomDate(undefined)
    }
    setIsFilterDropdownOpen(false)
  }

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setCustomDate(date)
      setEngineerFilter("custom")
      setIsDatePickerOpen(false)
    }
  }

  const getFilterLabel = () => {
    switch (engineerFilter) {
      case "today":
        return "Today"
      case "7days":
        return "Last 7 Days"
      case "month":
        return "Last Month"
      case "custom":
        return customDate ? format(customDate, "dd MMM yyyy") : "Pick Date"
      default:
        return "Today"
    }
  }

  const handleViewLowFlDetails = (proj: LowFlProjector) => {
    setSelectedLowFlProjector(proj)
    setIsLowFlDialogOpen(true)
  }

  const handleScheduleClick = (proj: PendingProjector) => {
    setSelectedProjectorForSchedule(proj)
    setScheduleModalOpen(true)
  }

  const handleScheduleSuccess = () => {
    setScheduleModalOpen(false)
    setSelectedProjectorForSchedule(null)
    // Refresh dashboard data
    loadDashboardData()
  }

  // Transform service data for pie chart - memoized to prevent recalculation
  // MUST be called before any conditional returns to follow Rules of Hooks
  const servicePieData = useMemo(() => {
    if (!data) return []
    const source = serviceViewMode === "weekly" ? data.servicesByDay : data.servicesByMonth
    return source.map((item, index) => ({
      name: 'day' in item ? item.day : item.month,
      value: item.count,
      fill: PIE_COLORS[index % PIE_COLORS.length],
    }))
  }, [serviceViewMode, data])

  const totalServices = useMemo(() =>
    servicePieData.reduce((acc, item) => acc + item.value, 0),
    [servicePieData]
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-red-600">{error ?? "Unable to load analytics."}</p>
        </div>
      </div>
    )
  }

  const { totals, lowFlProjectors, packedProjectors } = data

  return (
    <div className="flex flex-col gap-6">
      {/* Low fL Projector Details Dialog */}
      <Dialog open={isLowFlDialogOpen} onOpenChange={setIsLowFlDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Low fL Projector Details
            </DialogTitle>
            <DialogDescription>
              This projector has a low light output and may need attention.
            </DialogDescription>
          </DialogHeader>

          {selectedLowFlProjector && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Serial No.</p>
                  <p className="font-semibold">{selectedLowFlProjector.serialNo}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Model No.</p>
                  <p className="font-semibold">{selectedLowFlProjector.modelNo}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">fL Before</p>
                  <p className="font-semibold text-red-600">{selectedLowFlProjector.flLeft}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">fL After</p>
                  <p className="font-semibold text-red-600">{selectedLowFlProjector.flRight}</p>
                </div>
              </div>

              <div className="border-t pt-4 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Site Name</p>
                  <p className="font-medium">{selectedLowFlProjector.siteName}</p>
                </div>
                {selectedLowFlProjector.siteAddress && (
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Site Address
                    </p>
                    <p className="text-sm text-muted-foreground">{selectedLowFlProjector.siteAddress}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Last Service Date</p>
                  <p className={`font-medium ${selectedLowFlProjector.lastServiceDate ? "text-amber-600" : "text-red-600"}`}>
                    {selectedLowFlProjector.lastServiceDate || "Never serviced"}
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsLowFlDialogOpen(false)}>
              Close
            </Button>
            {selectedLowFlProjector && (
              <Button asChild>
                <Link href={`/admin/dashboard/sites/${selectedLowFlProjector.siteId}/projectors/${selectedLowFlProjector.id}`}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Projector Page
                </Link>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Service Modal */}
      {scheduleModalOpen && selectedProjectorForSchedule && (
        <ScheduleServiceModal
          siteId={selectedProjectorForSchedule.siteId}
          projectorId={selectedProjectorForSchedule.id}
          onClose={() => {
            setScheduleModalOpen(false)
            setSelectedProjectorForSchedule(null)
          }}
          onSuccess={handleScheduleSuccess}
        />
      )}

      {/* Top Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard title="Total Services" value={totals.all} icon={Activity} />
        <MetricCard title="Completed Projectors" value={totals.completed} icon={CheckCircle2} />
        <MetricCard title="Scheduled Projectors" value={totals.scheduled} icon={Clock} />
        <MetricCard title="Packed Projectors" value={totals.packed} icon={CheckCircle2} />
        <MetricCard title="Total Projectors" value={totals.projectors} icon={Projector} />
        <MetricCard title="Engineers" value={totals.engineers} icon={Users} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Service Stats - Single Card with Toggle */}
        <div className="border border-border rounded-lg bg-white p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Service Activity</h3>
            <div className="flex items-center gap-1 bg-muted/50 rounded-md p-1">
              <button
                onClick={() => setServiceViewMode("weekly")}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${serviceViewMode === "weekly"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                Last 7 Days
              </button>
              <button
                onClick={() => setServiceViewMode("monthly")}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${serviceViewMode === "monthly"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                Monthly
              </button>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <ChartContainer config={chartConfig} className="h-[200px] flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={servicePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {servicePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>

            <div className="flex flex-col gap-2">
              <div className="text-center mb-2">
                <p className="text-2xl font-bold text-foreground">{totalServices}</p>
                <p className="text-xs text-muted-foreground">Total Services</p>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {servicePieData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2 text-xs">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.fill }} />
                    <span className="text-muted-foreground">{item.name}</span>
                    <span className="font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Packed Projectors Quick View */}
        <div className="border border-border rounded-lg bg-white">
          <div className="flex items-center justify-between p-4 pb-2">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Packed Projectors
            </h3>
            <Badge variant="outline" className="text-xs">{packedProjectors.length} Projectors</Badge>
          </div>

          {packedProjectors.length === 0 ? (
            <div className="p-6 text-center">
              <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No packed projectors</p>
            </div>
          ) : (
            <div className="max-h-[260px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs font-semibold">Serial No</TableHead>
                    <TableHead className="text-xs font-semibold">Site</TableHead>
                    <TableHead className="text-xs font-semibold">Screen</TableHead>
                    <TableHead className="text-xs font-semibold">Last Service</TableHead>
                    <TableHead className="text-xs font-semibold text-center w-24">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packedProjectors.slice(0, 10).map((proj) => (
                    <TableRow key={proj.id} className="hover:bg-muted/20">
                      <TableCell className="text-xs font-medium">{proj.serialNo}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[120px]">
                        <div className="truncate" title={proj.siteAddress || proj.siteName}>
                          {proj.siteName}
                        </div>
                        {proj.siteAddress && (
                          <div className="text-[10px] text-muted-foreground/70 truncate" title={proj.siteAddress}>
                            {proj.siteAddress}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {proj.screenNumber || "-"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {proj.lastServiceDate ? (
                          <span className="text-amber-600">{proj.lastServiceDate}</span>
                        ) : (
                          <span className="text-red-600">Never</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => handleScheduleClick(proj)}
                        >
                          <CalendarPlus className="h-3.5 w-3.5 mr-1" />
                          Schedule
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* Low fL & Pending Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Low fL Projectors */}
        <div className="border border-border rounded-lg bg-white">
          <div className="flex items-center justify-between p-4 pb-2">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Low fL Projectors (&lt;10 fL)
            </h3>
            <Badge variant="destructive" className="text-xs">{lowFlProjectors.length} Found</Badge>
          </div>

          {lowFlProjectors.length === 0 ? (
            <div className="p-6 text-center">
              <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">All projectors have healthy fL levels</p>
            </div>
          ) : (
            <div className="max-h-[260px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs font-semibold">Serial No</TableHead>
                    <TableHead className="text-xs font-semibold">Site</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Right fL</TableHead>
                    <TableHead className="text-xs font-semibold text-center w-20">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowFlProjectors.slice(0, 10).map((proj) => (
                    <TableRow key={proj.id} className="hover:bg-muted/20">
                      <TableCell className="text-xs font-medium">{proj.serialNo}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{proj.siteName}</TableCell>
                      <TableCell className="text-xs text-right">
                        <span className="text-red-600 font-semibold">{proj.flRight}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => handleViewLowFlDetails(proj)}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Engineer Performance with Date Filter */}
        <div className="border border-border rounded-lg bg-white p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Engineer Performance</h3>

            {/* Date Filter Dropdown */}
            <Popover open={isFilterDropdownOpen} onOpenChange={setIsFilterDropdownOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-2 text-xs">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {getFilterLabel()}
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-40 p-1" align="end">
                <div className="flex flex-col">
                  <button
                    onClick={() => handleFilterSelect("today")}
                    className={`text-left px-3 py-2 text-sm rounded-md hover:bg-muted ${engineerFilter === "today" ? "bg-muted font-medium" : ""}`}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => handleFilterSelect("7days")}
                    className={`text-left px-3 py-2 text-sm rounded-md hover:bg-muted ${engineerFilter === "7days" ? "bg-muted font-medium" : ""}`}
                  >
                    Last 7 Days
                  </button>
                  <button
                    onClick={() => handleFilterSelect("month")}
                    className={`text-left px-3 py-2 text-sm rounded-md hover:bg-muted ${engineerFilter === "month" ? "bg-muted font-medium" : ""}`}
                  >
                    Last Month
                  </button>
                  <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <button
                        className={`text-left px-3 py-2 text-sm rounded-md hover:bg-muted ${engineerFilter === "custom" ? "bg-muted font-medium" : ""}`}
                      >
                        Pick Date
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="single"
                        selected={customDate}
                        onSelect={handleDateSelect}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {engineerStatsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : engineerStats.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No engineer data for this period</p>
          ) : (
            <>
              <ChartContainer config={chartConfig} className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={engineerStats} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} stroke="#9ca3af" allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      stroke="#9ca3af"
                      width={80}
                      tickFormatter={(value) => value.slice(0, 10)}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="completed" stackId="a" fill="#22c55e" name="Completed" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="inProgress" stackId="a" fill="#eab308" name="In Progress" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="pending" stackId="a" fill="#ef4444" name="Pending" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
              <div className="flex justify-center gap-4 mt-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                  <span className="text-muted-foreground">Completed</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
                  <span className="text-muted-foreground">In Progress</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                  <span className="text-muted-foreground">Pending (Overdue)</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
