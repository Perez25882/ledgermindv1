import { getServerUser, isAdmin } from "@/lib/firebase/server-auth"
import { adminDb, adminAuth } from "@/lib/firebase/firebase-admin"
import { redirect } from "next/navigation"
import { UserManagementTable, UserListItem } from "@/components/user-management-table"

export default async function AdminUsersPage() {
  const user = await getServerUser()
  const adminOk = await isAdmin()

  // Only admins can access this page
  if (!user || !adminOk) {
    redirect("/dashboard")
  }

  let usersList: UserListItem[] = []

  try {
    // 1. Fetch Users from Firebase Auth
    const listResult = await adminAuth.listUsers(1000)
    
    // 2. Fetch Profiles from Firestore
    const profilesSnap = await adminDb.collection("profiles").get()
    const profilesMap = new Map<string, any>()
    profilesSnap.docs.forEach(d => profilesMap.set(d.id, d.data()))

    // 3. Merge Data
    usersList = listResult.users.map((u) => {
      const profile = profilesMap.get(u.uid) || {}
      
      // Determine role from custom claims OR profile doc (favor claims)
      const isCustomClaimAdmin = u.customClaims?.role === "admin"
      const role = isCustomClaimAdmin ? "admin" : (profile.role === "admin" ? "admin" : "user")
      
      return {
        uid: u.uid,
        email: u.email || "No email",
        createdAt: u.metadata.creationTime || "",
        lastSignInTime: u.metadata.lastSignInTime || "Never",
        disabled: u.disabled,
        role: role,
        tier: profile.subscription_tier || "free"
      }
    })

    // Sort newest first
    usersList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    
  } catch (error) {
    console.error("Error fetching users:", error)
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">User Management</h1>
          <p className="text-muted-foreground mt-1">
            Provision roles, manage billing tiers, and govern platform access accounts.
          </p>
        </div>
      </div>

      <UserManagementTable users={usersList} currentUid={user.uid} />
    </div>
  )
}
