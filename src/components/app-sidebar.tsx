import * as React from "react"
import { Command, Home, Projector, User, FileEdit, Database, CalendarClock } from "lucide-react"
import type { Route } from "next"

import { NavMain, type NavMainItem } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { useAuth } from "@/lib/auth-context"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const navMainData: NavMainItem[] = [
  {
    title: "Home",
    url: "/admin/dashboard" as Route,
    icon: Home,
    for: "christie"
  },
  {
    title: "Database",
    url: "/admin/dashboard/overview" as Route,
    icon: Database,
    for: "christie"
  },
  {
    title: "Sites & Projectors",
    url: "/admin/dashboard/sites" as Route,
    icon: Projector,
    for: "christie"
  },
  {
    title: "Scheduled Services",
    url: "/admin/dashboard/scheduled-services" as Route,
    icon: CalendarClock,
  },
  {
    title: "Field Workers",
    url: "/admin/dashboard/field-workers" as Route,
    icon: User,
  },
  {
    title: "Update Form",
    url: "/admin/dashboard/form" as Route,
    icon: FileEdit,
  },
]

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { user, logout } = useAuth()

  if (!user) {
    return null
  }

  const userData = {
    name: user.name || (user.role === "ADMIN" ? "Admin" : "Field Worker"),
    email: user.email,
    avatar: user.image || "/avatars/shadcn.jpg",
  }

  // Filter navigation items based on user email
  const filteredNavItems = user.email === "contact@ascompinc.in"
    ? navMainData.filter(item => item.for === "christie")
    : navMainData

  return (
    <Sidebar className="h-[calc(100svh-var(--header-height))]!" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Ascomp Inc</span>
                  <span className="truncate text-xs">Enterprise</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={filteredNavItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} onLogout={logout} />
      </SidebarFooter>
    </Sidebar>
  )
}
