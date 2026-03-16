"use client"

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
  Package,
  LayoutDashboard,
  Package2,
  ShoppingCart,
  BarChart3,
  Settings,
  CreditCard,
  Crown,
  LogOut,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { type SessionUser } from "@/lib/firebase/server-auth"

export function UserSidebar({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const profile = user.profile
  const displayName = profile?.full_name || user.email || "User"
  const initial = displayName.charAt(0).toUpperCase()
  const tierLabel =
    profile?.subscription_tier === "enterprise"
      ? "Enterprise"
      : profile?.subscription_tier === "pro"
      ? "Pro"
      : "Free"

  return (
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
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
