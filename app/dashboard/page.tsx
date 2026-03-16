import { getServerUser } from "@/lib/firebase/server-auth"
import { adminDb } from "@/lib/firebase/firebase-admin"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SimpleBarChart, SimplePieChart } from "@/components/ui/simple-charts"
import {
  Package,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  Plus,
  BarChart3,
} from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
  const user = await getServerUser()
  if (!user) redirect("/auth/login")

  const userId = user.uid

  let inventoryItems: FirebaseFirestore.DocumentData[] = []
  let salesDocs: FirebaseFirestore.DocumentData[] = []
  let lowStockCount = 0
  let categories: FirebaseFirestore.DocumentData[] = []

  try {
    // Use simple where queries without orderBy to avoid needing composite indexes
    const [inventorySnap, salesSnap, categoriesSnap] = await Promise.all([
      adminDb
        .collection("inventory_items")
        .where("user_id", "==", userId)
        .limit(200)
        .get(),
      adminDb
        .collection("sales")
        .where("user_id", "==", userId)
        .limit(100)
        .get(),
      adminDb
        .collection("categories")
        .where("user_id", "==", userId)
        .get(),
    ])

    inventoryItems = inventorySnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }))
    // Sort in JS instead of Firestore to avoid index requirement
    salesDocs = salesSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const dateA = a.created_at?.toDate?.() || new Date(a.created_at || 0)
        const dateB = b.created_at?.toDate?.() || new Date(b.created_at || 0)
        return dateB.getTime() - dateA.getTime()
      })
    categories = categoriesSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

    lowStockCount = inventoryItems.filter(
      (item) => item.current_stock <= (item.min_stock_level || 10)
    ).length
  } catch (error) {
    console.error("Failed to fetch dashboard data:", error)
  }

  // Calculate KPIs
  const inventoryCount = inventoryItems.length
  const salesCount = salesDocs.length
  const totalRevenue = salesDocs.reduce(
    (sum, sale) => sum + (sale.total_amount || 0),
    0
  )

  // Month-over-month changes
  const now = new Date()
  const thisMonth = now.getMonth()
  const thisYear = now.getFullYear()
  const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1
  const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear

  const thisMonthSales = salesDocs.filter((s) => {
    const d = s.created_at?.toDate?.() || new Date(s.created_at)
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear
  })
  const lastMonthSales = salesDocs.filter((s) => {
    const d = s.created_at?.toDate?.() || new Date(s.created_at)
    return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear
  })

  const thisMonthRevenue = thisMonthSales.reduce(
    (sum, s) => sum + (s.total_amount || 0),
    0
  )
  const lastMonthRevenue = lastMonthSales.reduce(
    (sum, s) => sum + (s.total_amount || 0),
    0
  )
  const revenueChange =
    lastMonthRevenue > 0
      ? (((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1)
      : "0.0"
  const salesChange =
    lastMonthSales.length > 0
      ? (
          ((thisMonthSales.length - lastMonthSales.length) /
            lastMonthSales.length) *
          100
        ).toFixed(1)
      : "0.0"

  // Chart data - last 6 months
  const salesChartData = Array.from({ length: 6 }, (_, i) => {
    const month = new Date()
    month.setMonth(month.getMonth() - (5 - i))
    const monthName = month.toLocaleDateString("en", { month: "short" })

    const monthSales = salesDocs.filter((sale) => {
      const saleDate = sale.created_at?.toDate?.() || new Date(sale.created_at)
      return (
        saleDate.getMonth() === month.getMonth() &&
        saleDate.getFullYear() === month.getFullYear()
      )
    })

    const total = monthSales.reduce(
      (sum, sale) => sum + (sale.total_amount || 0),
      0
    )
    return {
      month: monthName,
      sales: total,
      profit: Math.round(total * 0.3),
    }
  })

  // Category pie chart
  const categoryMap = new Map<string, string>()
  categories.forEach((c) => categoryMap.set(c.id, c.name))

  const inventoryChartData = inventoryItems.reduce(
    (acc: { name: string; value: number; color: string }[], item) => {
      const catName = item.category_id
        ? categoryMap.get(item.category_id) || "Uncategorized"
        : "Uncategorized"
      const existing = acc.find((c) => c.name === catName)
      if (existing) {
        existing.value += item.current_stock || 0
      } else {
        acc.push({
          name: catName,
          value: item.current_stock || 0,
          color: `hsl(var(--chart-${acc.length + 1}))`,
        })
      }
      return acc
    },
    []
  )

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user.profile?.full_name || "there"}! Here&apos;s what&apos;s
            happening with your inventory.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/inventory">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventoryCount}</div>
            <p className="text-xs text-muted-foreground">
              Across {categories.length} categories
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{salesCount}</div>
            <p className="text-xs text-muted-foreground">
              <span
                className={
                  Number(salesChange) >= 0
                    ? "text-primary"
                    : "text-destructive"
                }
              >
                {Number(salesChange) >= 0 ? "+" : ""}
                {salesChange}%
              </span>{" "}
              from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              <span
                className={
                  Number(revenueChange) >= 0
                    ? "text-primary"
                    : "text-destructive"
                }
              >
                {Number(revenueChange) >= 0 ? "+" : ""}
                {revenueChange}%
              </span>{" "}
              from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Low Stock Alerts
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {lowStockCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Items need restocking
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-2">
        <Card className="w-full min-h-[400px]">
          <CardHeader>
            <CardTitle>Sales Overview</CardTitle>
            <CardDescription>Monthly sales and profit trends</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            <SimpleBarChart data={salesChartData} className="h-full w-full" />
          </CardContent>
        </Card>

        <Card className="w-full min-h-[400px]">
          <CardHeader>
            <CardTitle>Inventory Distribution</CardTitle>
            <CardDescription>Items by category</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            <SimplePieChart
              data={inventoryChartData}
              className="h-full w-full"
            />
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link href="/dashboard/inventory">
              <Button
                variant="outline"
                className="w-full justify-start bg-transparent"
              >
                <Package className="h-4 w-4 mr-2" />
                Add New Item
              </Button>
            </Link>
            <Link href="/dashboard/sales">
              <Button
                variant="outline"
                className="w-full justify-start bg-transparent"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Record Sale
              </Button>
            </Link>
            <Link href="/dashboard/reports">
              <Button
                variant="outline"
                className="w-full justify-start bg-transparent"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
