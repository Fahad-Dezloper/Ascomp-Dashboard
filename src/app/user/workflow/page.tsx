"use client"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useAuth } from "@/lib/auth-context"
import SelectServiceStep from "@/components/workflow/select-service-step"
import StartServiceStep from "@/components/workflow/start-service-step"
import RecordWorkStep from "@/components/workflow/record-work-step"
import SignatureStep from "@/components/workflow/signature-step"
import GenerateReportStep from "@/components/workflow/generate-report-step"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"

export default function WorkflowPage() {
  const router = useRouter()
  const { user, isLoading, logout } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [workflowData, setWorkflowData] = useState<any>({})
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/')
        return
      }

      const savedData = localStorage.getItem("workflowData")
      const savedStep = localStorage.getItem("workflowStep")

      if (savedData) {
        console.log("saved data", savedData)
        setWorkflowData(JSON.parse(savedData))
      }
      if (savedStep) {
        const parsed = parseInt(savedStep, 10)
        const clamped = Math.max(0, Math.min(parsed, steps.length - 1))
        setCurrentStep(clamped)
        if (clamped !== parsed) {
          localStorage.setItem("workflowStep", String(clamped))
        }
      }

      setIsLoaded(true)
    }
  }, [user, isLoading, router])

  const steps = [
    { name: 'Select Service', component: SelectServiceStep },
    { name: 'Start Service', component: StartServiceStep },
    { name: 'Record Work', component: RecordWorkStep },
    { name: 'Signatures', component: SignatureStep },
    { name: 'Generate Report', component: GenerateReportStep },
  ]

  const safeStepIndex = Math.max(0, Math.min(currentStep, steps.length - 1))
  const currentStepData = steps[safeStepIndex]

  if (!currentStepData) return null
  const CurrentStepComponent = currentStepData.component

  const handleNext = (payload: any) => {
    const newData = { ...workflowData, ...payload }
    setWorkflowData(newData)
    localStorage.setItem("workflowData", JSON.stringify(newData))
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
      localStorage.setItem("workflowStep", String(currentStep + 1))
      window.scrollTo(0, 0)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
      localStorage.setItem("workflowStep", String(currentStep - 1))
      window.scrollTo(0, 0)
    }
  }

  // Called from GenerateReportStep when engineer wants to re-edit within the 10-min window
  const handleEditReport = (_serviceRecordId: string) => {
    const RECORD_WORK_STEP = 2
    setCurrentStep(RECORD_WORK_STEP)
    localStorage.setItem("workflowStep", String(RECORD_WORK_STEP))
    window.scrollTo(0, 0)
  }

  const handleLogout = () => {
    // The logout function in auth-context handles everything:
    // - Clears all localStorage
    // - Signs out (removes cookies)
    // - Redirects to login page
    logout()
  }

  const navigateTo = (path: string) => {
    router.push(path as any)
  }

  const handleRedirect = () => {
    router.push("/admin/dashboard")
  }

  const userInitials = useMemo(() => {
    if (!user) return "U"
    const base = user.name || user.email || "U"
    return base
      .split(" ")
      .map((part) => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join("")
  }, [user])

  if (!isLoaded || !currentStepData) {
    return (
      <div className="min-h-screen w-full bg-white">
        <div className="border-b-2 border-black p-3 sm:p-4 sticky top-0 bg-white/95 backdrop-blur z-50 w-full">
          <div className="flex justify-between gap-3 lg:flex-row lg:items-center lg:justify-between mb-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div className="space-y-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="flex-1 h-8" />
            ))}
          </div>
        </div>
        <div className="p-3 sm:p-4 md:p-6 w-full">
          <Skeleton className="h-[600px] w-full rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-white">
      <div className="border-b-2 border-black p-3 sm:p-4 sticky top-0 bg-white/95 backdrop-blur z-50 w-full transition-all">
        <div className="flex justify-between gap-3 lg:flex-row lg:items-center lg:justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 sm:h-12 sm:w-12 border-2 border-black rounded-xl overflow-hidden bg-white hidden sm:flex shadow-sm">
              <Image src="/LOGO/Ascomp.png" alt="Ascomp INC" fill className="object-contain p-1.5" sizes="48px" />
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.3em] text-gray-500 font-semibold">Ascomp INC</p>
              <p className="text-sm font-bold text-black">Service Workflow</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="border-2 border-black rounded-full py-2 px-2 sm:px-4 focus:outline-none hover:bg-gray-100 transition-colors flex items-center gap-2">
                  <span className="uppercase font-bold text-sm bg-black text-white rounded-full w-8 h-8 flex items-center justify-center">{userInitials}</span>
                  <span className="text-sm font-semibold hidden sm:inline">{user?.name?.split(" ")[0]}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="text-sm font-bold text-black">{user?.name || "Field Worker"}</div>
                  <p className="text-xs text-gray-500 truncate font-normal">{user?.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {/* <DropdownMenuItem onClick={() => navigateTo("/user/profile")} className="cursor-pointer">
                   User Profile
                </DropdownMenuItem> */}
                <DropdownMenuItem onClick={() => navigateTo("/user/schedule-visit")} className="cursor-pointer">
                  Schedule a visit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigateTo("/user/claim")} className="cursor-pointer">
                  Claim a visit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigateTo("/user/assignment-requests")}
                  className="cursor-pointer"
                >
                  Assignment requests
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigateTo("/user/services")} className="cursor-pointer">
                  History / Services
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {user?.role == "ADMIN" ? (
                  <DropdownMenuItem onClick={handleRedirect} className="cursor-pointer font-medium">
                    Admin Dashboard
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 cursor-pointer font-medium">
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Progress indicator - responsive */}
        <div className="flex flex-nowrap overflow-x-auto gap-1 sm:gap-2 pb-1 sm:pb-0 scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0">
          {steps.map((step, index) => {
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;

            return (
              <div
                key={index}
                className={`flex-none min-w-[100px] sm:min-w-[110px] sm:flex-1 py-2 px-2 sm:px-3 border-2 text-center font-bold text-xs sm:text-sm transition-all duration-300 rounded-sm whitespace-nowrap ${isActive
                  ? 'bg-black text-white border-black shadow-md transform scale-105 z-10'
                  : isCompleted
                    ? 'bg-gray-100 text-gray-800 border-gray-200'
                    : 'bg-white text-gray-400 border-gray-100'
                  }`}
              >
                {step.name}
              </div>
            )
          })}
        </div>
      </div>

      <div className="p-3 sm:p-4 md:p-6 w-full">
        <div className="max-w-full md:max-w-5xl mx-auto fade-in-up">
          <CurrentStepComponent
            data={workflowData}
            onNext={handleNext}
            onBack={handleBack}
            onEditReport={handleEditReport}
            user={user}
          />
        </div>
      </div>
    </div>
  )
}
