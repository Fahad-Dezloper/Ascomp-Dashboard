"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { ArrowLeft, Search, CalendarIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

import { ServiceDetailView, type Service } from "@/components/services/service-detail-view"
import { ServiceCard } from "@/components/services/service-card"
import { ServiceListSkeleton } from "@/components/services/service-list-skeleton"

type ViewMode = "completed" | "allCompleted"

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])
  return debouncedValue
}

export default function ServicesPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>("completed")

  const [searchQuery, setSearchQuery] = useState("")
  const [dateFilter, setDateFilter] = useState<Date>()

  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  useEffect(() => {
    setSelectedService(null)
  }, [viewMode])

  useEffect(() => {
    if (isLoading) return

    if (!user) {
      router.push("/login")
      return
    }

    const ac = new AbortController()

    ;(async () => {
      try {
        setLoading(true)
        const endpoint =
          viewMode === "completed"
            ? "/api/user/services/completed"
            : "/api/user/services/all-completed"

        const response = await fetch(endpoint, {
          credentials: "include",
          signal: ac.signal,
        })

        if (response.ok) {
          const data = await response.json()
          setServices(Array.isArray(data.services) ? data.services : [])
        } else {
          console.error(`Failed to fetch ${viewMode} services:`, response.statusText)
          setServices([])
          if (viewMode === "allCompleted") {
            toast.error(
              response.status === 401
                ? "Not authorized to load all completed services."
                : "Could not load all completed services.",
            )
          }
        }
      } catch (error: unknown) {
        if (
          typeof error === "object" &&
          error !== null &&
          (error as Error).name === "AbortError"
        ) {
          return
        }
        console.error("Failed to fetch services:", error)
        setServices([])
        toast.error(
          viewMode === "allCompleted"
            ? "Network error loading all completed services."
            : "Network error loading services.",
        )
      } finally {
        if (!ac.signal.aborted) {
          setLoading(false)
        }
      }
    })()

    return () => ac.abort()
  }, [user, isLoading, router, viewMode])

  async function openServiceDetail(service: Service) {
    if (viewMode === "completed" && service.workDetails != null) {
      setSelectedService(service)
      return
    }

    setDetailLoading(true)
    try {
      const res = await fetch(`/api/admin/service-records/${service.id}`, {
        credentials: "include",
      })
      if (!res.ok) {
        toast.error(
          res.status === 401 ? "Not authorized." : "Could not load full service record.",
        )
        return
      }
      const data = await res.json()
      const full = data.service as Service | undefined
      if (!full?.id) {
        toast.error("Invalid response when loading details.")
        return
      }
      setSelectedService(full)
    } catch {
      toast.error("Could not load full service record.")
    } finally {
      setDetailLoading(false)
    }
  }

  const filteredServices = services.filter((service) => {
    const query = debouncedSearchQuery.trim().toLowerCase()

    const fieldMatches = (value: string | number | null | undefined) => {
      if (value === null || value === undefined) return false
      return String(value).toLowerCase().includes(query)
    }

    const matchesSearch =
      !query ||
      fieldMatches(service.site?.name) ||
      fieldMatches(service.projector?.model) ||
      fieldMatches(service.projector?.serialNo) ||
      fieldMatches(service.serviceNumber) ||
      fieldMatches(service.cinemaName) ||
      fieldMatches(service.site?.address) ||
      fieldMatches(service.address) ||
      fieldMatches(service.location) ||
      fieldMatches(service.remarks) ||
      fieldMatches(service.contactDetails) ||
      fieldMatches(service.site?.contactDetails) ||
      fieldMatches(service.screenNumber) ||
      fieldMatches(service.engineerName)

    const matchesDate = dateFilter
      ? service.date?.startsWith(format(dateFilter, "yyyy-MM-dd"))
      : true

    return matchesSearch && matchesDate
  }).sort((a, b) => {
    const aDate = a.completedAt || a.date
    const bDate = b.completedAt || b.date
    return new Date(bDate || "").getTime() - new Date(aDate || "").getTime()
  })

  if (detailLoading || (loading && !selectedService)) {
    return (
      <div className="min-h-screen bg-white w-full">
        <div className="border-b-2 border-black p-4 sm:p-6">
          <div className="max-w-6xl mx-auto">
            <div className="h-10 w-20 bg-gray-100 animate-pulse rounded mb-4" />
            <div className="h-10 w-48 bg-gray-100 animate-pulse rounded" />
          </div>
        </div>
        <div className="max-w-6xl mx-auto p-4 sm:p-6 w-full">
          <ServiceListSkeleton />
        </div>
      </div>
    )
  }

  if (selectedService) {
    return (
      <ServiceDetailView
        service={selectedService}
        onBack={() => setSelectedService(null)}
      />
    )
  }

  return (
    <div className="min-h-screen bg-white w-full">
      <div className="border-b-2 border-black p-4 sm:p-6 sticky top-0 bg-white z-10 transition-all">
        <div className="max-w-6xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4 border-2 border-transparent hover:border-black hover:bg-transparent -ml-3"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-black tracking-tight">
                {viewMode === "completed" ? "Completed Services" : "All Completed Services"}
              </h1>
              <p className="text-gray-600 mt-2 text-sm font-medium">
                {filteredServices.length} service{filteredServices.length !== 1 ? "s" : ""} found
                {services.length !== filteredServices.length && ` (filtered from ${services.length})`}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-64 group">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 group-focus-within:text-black transition-colors" />
                <Input
                  placeholder="Search site, cinema, model, serial, address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 border-2 border-gray-200 focus-visible:border-black focus-visible:ring-0 transition-colors"
                />
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full sm:w-[200px] justify-start text-left font-normal border-2 border-gray-200 hover:border-black hover:bg-white",
                      !dateFilter && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFilter ? format(dateFilter, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFilter}
                    onSelect={setDateFilter}
                    initialFocus
                    captionLayout="dropdown"
                    className="rounded-md border shadow-sm"
                  />
                </PopoverContent>
              </Popover>
              <div className="flex rounded-md border-2 border-black overflow-hidden shadow-sm">
                <Button
                  type="button"
                  variant={viewMode === "completed" ? "default" : "ghost"}
                  className={`flex-1 rounded-none font-semibold ${viewMode === "completed" ? "bg-black text-white" : "text-black hover:bg-gray-100"}`}
                  onClick={() => {
                    if (viewMode !== "completed") {
                      setLoading(true)
                      setViewMode("completed")
                      setSearchQuery("")
                    }
                  }}
                >
                  Completed
                </Button>
                <Button
                  type="button"
                  variant={viewMode === "allCompleted" ? "default" : "ghost"}
                  className={`flex-1 rounded-none font-semibold ${viewMode === "allCompleted" ? "bg-black text-white" : "text-black hover:bg-gray-100"}`}
                  onClick={() => {
                    if (viewMode !== "allCompleted") {
                      setLoading(true)
                      setViewMode("allCompleted")
                      setSearchQuery("")
                    }
                  }}
                >
                  All Completed
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-6 w-full fade-in-up">
        {filteredServices.length === 0 ? (
          <Card className="border-2 border-dashed border-gray-300 shadow-none">
            <CardContent className="p-12 text-center">
              <div className="rounded-full bg-gray-100 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-lg font-semibold text-gray-900">
                No services found
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {services.length === 0
                  ? viewMode === "completed"
                    ? "You don't have any completed services yet."
                    : "No completed services found."
                  : "Try adjusting your search or date filter."}
              </p>
              {services.length > 0 && (
                <Button
                  variant="link"
                  onClick={() => {
                    setSearchQuery("")
                    setDateFilter(undefined)
                  }}
                  className="mt-4 text-black underline"
                >
                  Clear all filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredServices.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onClick={() => openServiceDetail(service)}
                viewMode={viewMode}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
