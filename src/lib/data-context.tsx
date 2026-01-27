"use client"
import { createContext, useState, useContext, type ReactNode } from "react"
import type { Site, FieldWorker, ScheduledTask, User, Projector } from "./types"

interface DataContextType {
  currentUser: User | null
  sites: Site[]
  fieldWorkers: FieldWorker[]
  scheduledTasks: ScheduledTask[]

  // Auth
  login: (email: string, password: string) => void
  logout: () => void

  // Sites
  addSite: (site: Omit<Site, "id" | "projectors">) => void
  deleteSite: (siteId: string) => void

  // Projectors
  addProjector: (siteId: string, projector: Omit<Projector, "id">) => void
  deleteProjector: (siteId: string, projectorId: string) => void
  updateProjectorService: (siteId: string, projectorId: string, lastServiceDate: string) => void

  // Scheduled Tasks
  scheduleTask: (siteId: string, projectorId: string, fieldWorkerId: string, scheduledDate: string) => void
  completeTask: (taskId: string, notes: string) => void

  // Field Workers
  addFieldWorker: (worker: Omit<FieldWorker, "id">) => void
}

const DataContext = createContext<DataContextType | undefined>(undefined)

// Mock initial data
const mockAdminUser: User = {
  id: "1",
  name: "Admin User",
  email: "admin@example.com",
  role: "admin",
}

const mockFieldWorkers: FieldWorker[] = [
  {
    id: "fw1",
    name: "John Smith",
    email: "john@example.com",
    phone: "+1-555-0101",
    sitesCompleted: 12,
    joinDate: "2024-01-15",
    lastActiveDate: "2024-11-20",
  },
  {
    id: "fw2",
    name: "Sarah Johnson",
    email: "sarah@example.com",
    phone: "+1-555-0102",
    sitesCompleted: 8,
    joinDate: "2024-02-20",
    lastActiveDate: "2024-11-19",
  },
  {
    id: "fw3",
    name: "Michael Davis",
    email: "michael@example.com",
    phone: "+1-555-0103",
    sitesCompleted: 15,
    joinDate: "2023-12-10",
    lastActiveDate: "2024-11-21",
  },
]

const mockSites: Site[] = [
  {
    id: "site1",
    name: "Downtown Theater",
    location: "Downtown District",
    address: "123 Main St, City Center",
    createdDate: "2024-01-10",
    contactDetails: "Mr. Downtown - 1234567890",
    projectors: [
      {
        id: "proj1",
        name: "Main Hall Projector",
        model: "Sony SRX-R320P",
        serialNumber: "SRX-2024-001",
        installDate: "2023-06-15",
        lastServiceDate: "2024-05-20",
        status: "pending",
        nextServiceDue: "2024-11-20",
        serviceHistory: [
          {
            id: "svc1",
            date: "2024-05-20",
            technician: "John Smith",
            notes: "Regular maintenance, replaced lamp",
            nextDue: "2024-11-20",
          },
          {
            id: "svc2",
            date: "2023-11-15",
            technician: "Sarah Johnson",
            notes: "Annual service, cleaned filters",
            nextDue: "2024-05-20",
          },
        ],
      },
      {
        id: "proj2",
        name: "Lobby Display",
        model: "Sony SRX-R320P",
        serialNumber: "SRX-2024-002",
        installDate: "2023-08-10",
        lastServiceDate: "2024-08-15",
        status: "completed",
        nextServiceDue: "2025-02-15",
        serviceHistory: [
          {
            id: "svc3",
            date: "2024-08-15",
            technician: "Michael Davis",
            notes: "Preventive maintenance",
            nextDue: "2025-02-15",
          },
        ],
      },
    ],
  },
  {
    id: "site2",
    name: "Shopping Mall Complex",
    location: "North District",
    address: "456 Shopping Blvd, North End",
    createdDate: "2024-02-15",
    contactDetails: "Ms. Mall - 9876543210",
    projectors: [
      {
        id: "proj3",
        name: "Entertainment Zone",
        model: "Christie DHD850",
        serialNumber: "DHD-2024-001",
        installDate: "2023-09-01",
        lastServiceDate: "2024-09-05",
        status: "completed",
        nextServiceDue: "2025-03-05",
        serviceHistory: [
          {
            id: "svc4",
            date: "2024-09-05",
            technician: "John Smith",
            notes: "Quarterly checkup",
            nextDue: "2025-03-05",
          },
          {
            id: "svc5",
            date: "2024-03-01",
            technician: "Sarah Johnson",
            notes: "Initial installation service",
            nextDue: "2024-09-05",
          },
        ],
      },
    ],
  },
  {
    id: "site3",
    name: "Convention Center",
    location: "West District",
    address: "789 Convention Ln, West Side",
    createdDate: "2024-03-01",
    contactDetails: "Mr. Convention - 5555555555",
    projectors: [
      {
        id: "proj4",
        name: "Main Auditorium",
        model: "Barco HDF-W26",
        serialNumber: "HDF-2024-001",
        installDate: "2023-07-20",
        lastServiceDate: "2024-04-10",
        status: "pending",
        nextServiceDue: "2024-10-10",
        serviceHistory: [
          {
            id: "svc6",
            date: "2024-04-10",
            technician: "Michael Davis",
            notes: "Lamp replaced",
            nextDue: "2024-10-10",
          },
        ],
      },
    ],
  },
]

export function DataProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(mockAdminUser)
  const [sites, setSites] = useState<Site[]>(mockSites)
  const [fieldWorkers, setFieldWorkers] = useState<FieldWorker[]>(mockFieldWorkers)
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([])

  const login = (email: string) => {
    if (email.includes("fieldworker")) {
      setCurrentUser({
        id: "fw-current",
        name: "Field Worker",
        email,
        role: "fieldworker",
      })
    } else {
      setCurrentUser(mockAdminUser)
    }
  }

  const logout = () => {
    setCurrentUser(null)
  }

  const addSite = (site: Omit<Site, "id" | "projectors">) => {
    const newSite: Site = {
      ...site,
      id: `site${Date.now()}`,
      projectors: [],
    }
    setSites([...sites, newSite])
  }

  const deleteSite = (siteId: string) => {
    setSites(sites.filter((s) => s.id !== siteId))
  }

  const addProjector = (siteId: string, projector: Omit<Projector, "id">) => {
    setSites(
      sites.map((site) =>
        site.id === siteId
          ? {
            ...site,
            projectors: [...site.projectors, { ...projector, id: `proj${Date.now()}` }],
          }
          : site,
      ),
    )
  }

  const deleteProjector = (siteId: string, projectorId: string) => {
    setSites(
      sites.map((site) =>
        site.id === siteId
          ? {
            ...site,
            projectors: site.projectors.filter((p) => p.id !== projectorId),
          }
          : site,
      ),
    )
  }

  const updateProjectorService = (siteId: string, projectorId: string, lastServiceDate: string) => {
    setSites(
      sites.map((site) =>
        site.id === siteId
          ? {
            ...site,
            projectors: site.projectors.map((p) =>
              p.id === projectorId
                ? {
                  ...p,
                  lastServiceDate,
                  status: "completed" as const,
                  nextServiceDue:
                    new Date(new Date(lastServiceDate).getTime() + 180 * 24 * 60 * 60 * 1000)
                      .toISOString()
                      .split("T")[0] || "",
                }
                : p,
            ),
          }
          : site,
      ),
    )
  }

  const scheduleTask = (siteId: string, projectorId: string, fieldWorkerId: string, scheduledDate: string) => {
    const newTask: ScheduledTask = {
      id: `task${Date.now()}`,
      siteId,
      projectorId,
      fieldWorkerId,
      scheduledDate,
      status: "pending",
    }
    setScheduledTasks([...scheduledTasks, newTask])
  }

  const completeTask = (taskId: string, notes: string) => {
    setScheduledTasks(
      scheduledTasks.map((task) =>
        task.id === taskId
          ? {
            ...task,
            status: "completed",
            completedDate: new Date().toISOString().split("T")[0],
            notes,
          }
          : task,
      ),
    )

    const task = scheduledTasks.find((t) => t.id === taskId)
    if (task) {
      updateProjectorService(task.siteId, task.projectorId, new Date().toISOString().split("T")[0] || new Date().toISOString())
    }
  }

  const addFieldWorker = (worker: Omit<FieldWorker, "id">) => {
    const newWorker: FieldWorker = {
      ...worker,
      id: `fw${Date.now()}`,
    }
    setFieldWorkers([...fieldWorkers, newWorker])
  }

  return (
    <DataContext.Provider
      value={{
        currentUser,
        sites,
        fieldWorkers,
        scheduledTasks,
        login,
        logout,
        addSite,
        deleteSite,
        addProjector,
        deleteProjector,
        updateProjectorService,
        scheduleTask,
        completeTask,
        addFieldWorker,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error("useData must be used within DataProvider")
  }
  return context
}
