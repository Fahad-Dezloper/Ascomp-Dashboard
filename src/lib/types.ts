export type UserRole = "admin" | "fieldworker"

export interface FieldWorker {
  id: string
  name: string
  email: string
  phone: string
  sitesCompleted: number
  joinDate: string
  lastActiveDate: string
}

export interface Service {
  id: string
  date: string
  technician: string
  notes: string
  nextDue: string
}

export interface Projector {
  id: string
  name: string
  model: string
  serialNumber: string
  installDate: string
  lastServiceDate: string
  status: "completed" | "pending" | "scheduled" | "packed"
  nextServiceDue: string
  serviceHistory: Service[]
  address?: string | null
  state?: string | null
  region?: string | null
  pvr?: string | null
}

export interface Site {
  id: string
  name: string
  location: string
  address: string
  createdDate: string
  projectors: Projector[]
  contactDetails: string
  siteCode?: string | null
  email?: string | null
}

export interface ScheduledTask {
  id: string
  siteId: string
  projectorId: string
  fieldWorkerId: string
  scheduledDate: string
  status: "pending" | "completed"
  completedDate?: string
  notes?: string
}

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
}
