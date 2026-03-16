import type React from "react"
import { redirect } from "next/navigation"
import { LedmiChat } from "@/components/ai-chat"
import { getServerUser, isAdmin } from "@/lib/firebase/server-auth"
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  Package,
  LayoutDashboard,
  Package2,
  ShoppingCart,
  BarChart3,
  Brain,
  Settings,
  LogOut,
  CreditCard,
  Crown,
  Shield,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getServerUser()

  if (!user) {
    redirect("/auth/login")
  }

  const profile = user.profile
  const adminMode = await isAdmin()
  const displayName = profile?.full_name || user.email || "User"
  const initial = displayName.charAt(0).toUpperCase()
  const tierLabel =
    profile?.subscription_tier === "enterprise"
      ? "Enterprise"
      : profile?.subscription_tier === "pro"
        ? "Pro"
        : "Free"

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-2">
            <Package className="h-8 w-8 text-primary" />
            <h1 className="text-xl font-bold text-foreground">LedgerMind</h1>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/dashboard" prefetch={true}>
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/dashboard/inventory" prefetch={true}>
                  <Package2 className="h-4 w-4" />
                  <span>Inventory</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/dashboard/sales" prefetch={true}>
                  <ShoppingCart className="h-4 w-4" />
                  <span>Sales</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/dashboard/reports" prefetch={true}>
                  <BarChart3 className="h-4 w-4" />
                  <span>Reports</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/dashboard/subscription" prefetch={true}>
                  <CreditCard className="h-4 w-4" />
                  <span>Subscription</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/dashboard/settings" prefetch={true}>
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          {adminMode && (
            <>
              <div className="mt-6 px-4 py-2">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Admin
                </h2>
              </div>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/dashboard/system" prefetch={true}>
                      <Shield className="h-4 w-4" />
                      <span>System Overview</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </>
          )}

        </SidebarContent>

        <SidebarFooter>
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {initial}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{displayName}</p>
              <div className="flex items-center gap-1.5">
                {profile?.company_name && (
                  <p className="text-xs text-muted-foreground truncate">
                    {profile.company_name}
                  </p>
                )}
                <Badge
                  variant={tierLabel === "Free" ? "secondary" : "default"}
                  className="text-[10px] px-1.5 py-0 h-4"
                >
                  {tierLabel === "Free" ? null : (
                    <Crown className="h-2.5 w-2.5 mr-0.5" />
                  )}
                  {tierLabel}
                </Badge>
              </div>
            </div>
            <form
              action={async () => {
                "use server"
                const { cookies } = await import("next/headers")
                const cookieStore = await cookies()
                cookieStore.set("__session", "", { maxAge: 0, path: "/" })
                redirect("/auth/login")
              }}
            >
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <LogOut className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-4">
          <SidebarTrigger className="-ml-1" />
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
        <LedmiChat />
      </SidebarInset>
    </SidebarProvider>
  )
}
