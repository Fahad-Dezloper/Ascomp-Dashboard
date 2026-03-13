"use client"

import { LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

export function NavUser({
  user,
  onLogout,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
  onLogout?: () => void
}) {
  const router = useRouter()

  const handleLogout = () => {
    if (onLogout) {
      // Call the provided logout function (from auth-context)
      // which handles all cleanup and redirect
      onLogout()
    } else {
      // Fallback: just navigate to home
      router.push('/')
    }
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 rounded-lg">
          <AvatarImage src={user.avatar} alt={user.name} />
          <AvatarFallback className="rounded-lg">
            {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col text-left text-sm leading-tight">
          <span className="truncate font-medium">{user.name}</span>
          <span
            title={user.email}
            className="text-xs text-muted-foreground break-all"
          >
            {user.email}
          </span>
        </div>
      </div>
      <Button
        onClick={handleLogout}
        variant="outline"
        className="w-full justify-start gap-2"
      >
        <LogOut className="size-4" />
        Log out
      </Button>
    </div>
  )
}
