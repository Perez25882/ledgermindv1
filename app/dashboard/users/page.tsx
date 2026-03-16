import { getServerUser, isAdmin } from "@/lib/firebase/server-auth"
import { adminDb, adminAuth } from "@/lib/firebase/firebase-admin"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { redirect } from "next/navigation"

export default async function AdminUsersPage() {
  const user = await getServerUser()
  const adminOk = await isAdmin()

  // Only admins can access this page
  if (!user || !adminOk) {
    redirect("/dashboard")
  }

  let usersList: any[] = []

  try {
    const listResult = await adminAuth.listUsers(100)
    usersList = listResult.users.map((u) => ({
      uid: u.uid,
      email: u.email || "No email",
      createdAt: u.metadata.creationTime || "",
      lastSignInTime: u.metadata.lastSignInTime || "Never",
    }))
  } catch (error) {
    console.error("Error fetching users:", error)
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground">User Management</h1>
        <p className="text-muted-foreground">
          View and manage registered accounts on the platform
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {usersList.map((usr) => (
          <Card key={usr.uid} className="overflow-hidden">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <div className="flex justify-between items-start">
                <CardTitle className="text-base truncate pr-2">{usr.email}</CardTitle>
                {usr.uid === user.uid ? (
                  <Badge variant="default" className="shrink-0 bg-primary/20 text-primary border-0">You</Badge>
                ) : (
                  <Badge variant="outline" className="shrink-0">User</Badge>
                )}
              </div>
              <CardDescription className="text-xs truncate font-mono mt-1">
                ID: {usr.uid}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created:</span>
                <span className="font-medium text-right">{new Date(usr.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Login:</span>
                <span className="font-medium text-right">
                  {usr.lastSignInTime !== "Never" ? new Date(usr.lastSignInTime).toLocaleDateString() : "Never"}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
