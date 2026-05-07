"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import EngineerSitesScheduleView from "@/components/user/engineer-sites-schedule-view"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function ScheduleVisitPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && !user) router.push("/login")
  }, [isLoading, user, router])

  useEffect(() => {
    if (!isLoading && user && user.role !== "FIELD_WORKER") {
      router.replace("/user/workflow")
    }
  }, [isLoading, user, router])

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-black" />
      </div>
    )
  }

  if (user.role !== "FIELD_WORKER") {
    return null
  }

  return (
    <div className="min-h-screen bg-white w-full">
      <div className="border-b-2 border-black p-4 sm:p-6">
        <div className="max-w-7xl mx-auto flex items-start gap-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/user/workflow")}
            className="shrink-0 border-2 border-transparent hover:border-black -ml-3"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Workflow
          </Button>
        </div>
      </div>
      <div className="p-4 sm:p-6">
        <EngineerSitesScheduleView />
      </div>
    </div>
  )
}
