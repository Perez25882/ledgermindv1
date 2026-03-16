import type React from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  Shield,
  LayoutDashboard,
  Users,
  Activity,
  Settings,
  LogOut,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { SessionUser } from "@/lib/firebase/server-auth"

export function AdminSidebar({ user }: { user: SessionUser }) {
  const initial = user.email ? user.email.charAt(0).toUpperCase() : "A"

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-foreground">Admin Panel</h1>
            <p className="text-xs text-muted-foreground">LedgerMind Enterprise</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/dashboard" prefetch={true}>
                <LayoutDashboard className="h-4 w-4" />
                <span>System Overview</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/dashboard/users" prefetch={true}>
                <Users className="h-4 w-4" />
                <span>User Management</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/dashboard/logs" prefetch={true}>
                <Activity className="h-4 w-4" />
                <span>Audit Logs</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/dashboard/settings" prefetch={true}>
                <Settings className="h-4 w-4" />
                <span>Admin Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {initial}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.email}</p>
            <Badge className="text-[10px] px-1.5 py-0 h-4 bg-destructive text-destructive-foreground">
              Administrator
            </Badge>
          </div>
          <form
            action={async () => {
              "use server"
              const { cookies } = await import("next/headers")
              const cookieStore = await cookies()
              cookieStore.set("__session", "", { maxAge: 0, path: "/" })
            }}
          >
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Logout">
              <LogOut className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
