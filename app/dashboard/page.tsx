import { getServerUser, isAdmin } from "@/lib/firebase/server-auth"
import { redirect } from "next/navigation"
import { UserDashboardPage } from "@/components/user-dashboard"
import { AdminDashboardPage } from "@/components/admin-dashboard"

export default async function DashboardRootPage() {
  const user = await getServerUser()
  if (!user) {
    redirect("/auth/login")
  }

  const adminMode = await isAdmin()

  if (adminMode) {
    return <AdminDashboardPage />
  }

  return <UserDashboardPage />
}
