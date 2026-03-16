import { getServerUser, isAdmin } from "@/lib/firebase/server-auth"
import { adminDb, adminAuth } from "@/lib/firebase/firebase-admin"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  DollarSign,
  Package,
  Activity,
  ShoppingCart,
  TrendingUp,
  Crown,
} from "lucide-react"
import { redirect } from "next/navigation"

export default async function AdminDashboard() {
  const user = await getServerUser()
  const adminOk = await isAdmin()
  if (!user || !adminOk) redirect("/dashboard")

  // Fetch global stats
  let totalUsers = 0
  let totalItems = 0
  let totalSales = 0
  let totalRevenue = 0
  let recentSignups: Array<{ email: string; uid: string; createdAt: string }> = []
  let subscriptionBreakdown = { free: 0, pro: 0, enterprise: 0 }

  try {
    // Get total users from Firebase Auth
    const listResult = await adminAuth.listUsers(100)
    totalUsers = listResult.users.length
    recentSignups = listResult.users
      .sort(
        (a, b) =>
          new Date(b.metadata.creationTime || "").getTime() -
          new Date(a.metadata.creationTime || "").getTime()
      )
      .slice(0, 5)
      .map((u) => ({
        email: u.email || "No email",
        uid: u.uid,
        createdAt: u.metadata.creationTime || "",
      }))

    // Get all profiles for subscription breakdown
    const profilesSnap = await adminDb.collection("profiles").get()
    profilesSnap.docs.forEach((doc) => {
      const tier = doc.data().subscription_tier || "free"
      if (tier === "pro") subscriptionBreakdown.pro++
      else if (tier === "enterprise") subscriptionBreakdown.enterprise++
      else subscriptionBreakdown.free++
    })

    // Get global inventory and sales count
    const [inventoryCount, salesSnap] = await Promise.all([
      adminDb.collection("inventory_items").count().get(),
      adminDb.collection("sales").count().get(),
    ])

    totalItems = inventoryCount.data().count
    totalSales = salesSnap.data().count

    // Get total revenue (sample last 500)
    const revenueSnap = await adminDb
      .collection("sales")
      .limit(500)
      .get()
    totalRevenue = revenueSnap.docs.reduce(
      (sum, d) => sum + (d.data().total_amount || 0),
      0
    )
  } catch (error) {
    console.error("Admin dashboard error:", error)
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Platform overview and key performance indicators
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">Registered accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Platform Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">From all users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
            <p className="text-xs text-muted-foreground">
              Across all accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Sales
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSales}</div>
            <p className="text-xs text-muted-foreground">
              Platform-wide transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Breakdown & Recent Signups */}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              Subscription Breakdown
            </CardTitle>
            <CardDescription>
              Active subscription tiers across all users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Free</Badge>
                  <span className="text-sm">Free Tier</span>
                </div>
                <span className="font-bold">{subscriptionBreakdown.free}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Badge>Pro</Badge>
                  <span className="text-sm">Pro Tier</span>
                </div>
                <span className="font-bold">{subscriptionBreakdown.pro}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">Enterprise</Badge>
                  <span className="text-sm">Enterprise Tier</span>
                </div>
                <span className="font-bold">
                  {subscriptionBreakdown.enterprise}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Recent Sign-ups
            </CardTitle>
            <CardDescription>
              Latest users who joined the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentSignups.length > 0 ? (
              <div className="space-y-3">
                {recentSignups.map((signup) => (
                  <div
                    key={signup.uid}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium">{signup.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(signup.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {signup.uid.slice(0, 8)}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No signups yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
