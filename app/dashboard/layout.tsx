import type React from "react"
import { redirect } from "next/navigation"
import { LedmiChat } from "@/components/ai-chat"
import { getServerUser, isAdmin } from "@/lib/firebase/server-auth"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AdminSidebar } from "@/components/admin-sidebar"
import { UserSidebar } from "@/components/user-sidebar"
import { Badge } from "@/components/ui/badge"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getServerUser()

  if (!user) {
    redirect("/auth/login")
  }

  const adminMode = await isAdmin()

  async function handleLogout() {
    "use server"
    const { cookies } = await import("next/headers")
    const cookieStore = await cookies()
    cookieStore.set("__session", "", { maxAge: 0, path: "/" })
    redirect("/auth/login")
  }

  return (
    <SidebarProvider>
      {adminMode ? (
        <AdminSidebar user={user} />
      ) : (
        <UserSidebar user={user} onLogout={handleLogout} />
      )}

      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-4 justify-between">
          <SidebarTrigger className="-ml-1" />
          {adminMode && (
            <Badge variant="destructive" className="animate-pulse">ADMIN SECURE SESSION</Badge>
          )}
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
        
        {/* Only normal users get the AI Chat widget, admins don't need inventory chatting */}
        {!adminMode && <LedmiChat />}
      </SidebarInset>
    </SidebarProvider>
  )
}
