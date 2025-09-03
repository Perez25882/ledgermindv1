import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { SimpleBarChart, SimplePieChart } from "@/components/ui/simple-charts"
import { Package, ShoppingCart, TrendingUp, AlertTriangle, Brain, Plus, ArrowUpRight, BarChart3, Database } from "lucide-react"
import Link from "next/link"

type Sale = {
  total_amount: number
  created_at: string
}

type AIInsight = {
  id: string
  title: string
  description: string
  insight_type: 'forecast' | 'anomaly' | 'recommendation' | 'trend'
  confidence_score?: number
}

type InventoryItem = {
  category_id: string
  categories: { name: string } | { name: string }[] | null
  current_stock: number
}

type DashboardData = {
  inventoryCount: { count: number }
  salesCount: { count: number }
  lowStockCount: { count: number }
  recentInsights: { data: AIInsight[] }
  recentSales: { data: Sale[] }
  inventoryByCategory: { data: InventoryItem[] }
}

export default async function DashboardPage() {
  const supabase = await createClient()

  let user = null
  let dashboardData: DashboardData = {
    inventoryCount: { count: 0 },
    salesCount: { count: 0 },
    lowStockCount: { count: 0 },
    recentInsights: { data: [] },
    recentSales: { data: [] },
    inventoryByCategory: { data: [] },
  }

  try {
    const { data } = await supabase.auth.getUser()
    user = data?.user
  } catch (error) {
    console.error("Failed to get user:", error)
    // Continue with demo data when Supabase is not available
  }

  try {
    if (user) {
      const [inventoryCount, salesCount, lowStockCount, recentInsights, recentSales, inventoryByCategory] =
        await Promise.all([
          supabase.from("inventory_items").select("id", { count: "exact" }).eq("user_id", user.id),
          supabase.from("sales").select("id", { count: "exact" }).eq("user_id", user.id),
          supabase
            .from("inventory_items")
            .select("id", { count: "exact" })
            .eq("user_id", user.id)
            .lt("current_stock", 10),
          supabase
            .from("ai_insights")
            .select("*")
            .eq("user_id", user.id)
            .eq("is_read", false)
            .order("created_at", { ascending: false })
            .limit(3),
          supabase
            .from("sales")
            .select("total_amount, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(100),
          supabase
            .from("inventory_items")
            .select("category_id, categories(name), current_stock")
            .eq("user_id", user.id)
            .not("categories", "is", null),
        ])

      dashboardData = {
        inventoryCount: { count: inventoryCount?.count || 0 },
        salesCount: { count: salesCount?.count || 0 },
        lowStockCount: { count: lowStockCount?.count || 0 },
        recentInsights: { data: recentInsights?.data || [] },
        recentSales: { data: recentSales?.data || [] },
        inventoryByCategory: { data: inventoryByCategory?.data || [] },
      }
    } else {
      // Provide demo data when no user is logged in
      dashboardData = {
        inventoryCount: { count: 15 },
        salesCount: { count: 8 },
        lowStockCount: { count: 3 },
        recentInsights: { data: [] },
        recentSales: { data: [
          { total_amount: 150.00, created_at: new Date().toISOString() },
          { total_amount: 89.99, created_at: new Date(Date.now() - 86400000).toISOString() },
        ] as Sale[]},
        inventoryByCategory: { data: [] },
      }
    }
  } catch (error) {
    console.error("Failed to fetch dashboard data:", error)
    // Continue with default/demo data when database is not available
    dashboardData = {
      inventoryCount: { count: 0 },
      salesCount: { count: 0 },
      lowStockCount: { count: 0 },
      recentInsights: { data: [] },
      recentSales: { data: [] },
      inventoryByCategory: { data: [] },
    }
  }

  const salesData = dashboardData.recentSales.data
    ? Array.from({ length: 6 }, (_, i) => {
        const month = new Date()
        month.setMonth(month.getMonth() - (5 - i))
        const monthName = month.toLocaleDateString("en", { month: "short" })

        const monthSales = dashboardData.recentSales.data.filter((sale) => {
          const saleDate = new Date(sale.created_at)
          return saleDate.getMonth() === month.getMonth() && saleDate.getFullYear() === month.getFullYear()
        })

        const totalSales = monthSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)
        return {
          month: monthName,
          sales: totalSales,
          profit: Math.round(totalSales * 0.3), // Assume 30% profit margin
        }
      })
    : []

  const inventoryData = dashboardData.inventoryByCategory.data
    ? dashboardData.inventoryByCategory.data.reduce((acc: any[], item) => {
        const categoryName = 
          Array.isArray(item.categories) 
            ? item.categories[0]?.name || "Uncategorized"
            : item.categories?.name || "Uncategorized"
        const existing = acc.find((cat) => cat.name === categoryName)
        if (existing) {
          existing.value += item.current_stock || 0
        } else {
          acc.push({
            name: categoryName,
            value: item.current_stock || 0,
            color: `hsl(var(--chart-${acc.length + 1}))`,
          })
        }
        return acc
      }, [])
    : []

  // Calculate total revenue from real data
  const totalRevenue = dashboardData.recentSales.data?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Database Setup Alert */}
      {!user && (
        <Alert>
          <Database className="h-4 w-4" />
          <AlertTitle>Database Setup Required</AlertTitle>
          <AlertDescription>
            To use all features, please set up your Supabase database using the SQL scripts in the <code>scripts/</code> folder.
            See <code>SETUP.md</code> for detailed instructions.
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's what's happening with your inventory.</p>
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
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.inventoryCount.count || 0}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-primary">+2.1%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.salesCount.count || 0}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-primary">+12.5%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-primary">+8.2%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{dashboardData.lowStockCount.count || 0}</div>
            <p className="text-xs text-muted-foreground">Items need restocking</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-2">
        <Card className="w-full min-h-[400px]">
          <CardHeader>
            <CardTitle>Sales Overview</CardTitle>
            <CardDescription>Monthly sales and profit trends</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            <SimpleBarChart data={salesData} className="h-full w-full" />
          </CardContent>
        </Card>

        <Card className="w-full min-h-[400px]">
          <CardHeader>
            <CardTitle>Inventory Distribution</CardTitle>
            <CardDescription>Items by category</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            <SimplePieChart data={inventoryData} className="h-full w-full" />
          </CardContent>
        </Card>
      </div>

      {/* AI Insights and Quick Actions */}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              AI Insights
            </CardTitle>
            <CardDescription>Latest AI-powered recommendations and alerts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {dashboardData.recentInsights.data && dashboardData.recentInsights.data.length > 0 ? (
              dashboardData.recentInsights.data.map((insight) => (
                <div key={insight.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="flex-shrink-0 mt-1">
                    {insight.insight_type === "forecast" && <TrendingUp className="h-4 w-4 text-primary" />}
                    {insight.insight_type === "anomaly" && <AlertTriangle className="h-4 w-4 text-destructive" />}
                    {insight.insight_type === "recommendation" && <Brain className="h-4 w-4 text-primary" />}
                    {insight.insight_type === "trend" && <ArrowUpRight className="h-4 w-4 text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-foreground">{insight.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                    {insight.confidence_score && (
                      <Badge variant="secondary" className="mt-2 text-xs">
                        {Math.round(insight.confidence_score * 100)}% confidence
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">No AI insights available yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Add some inventory items to get started!</p>
              </div>
            )}
            <Link href="/dashboard/ai-insights">
              <Button variant="outline" className="w-full bg-transparent">
                View All Insights
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/dashboard/inventory">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                <Package className="h-4 w-4 mr-2" />
                Add New Item
              </Button>
            </Link>
            <Link href="/dashboard/sales">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Record Sale
              </Button>
            </Link>
            <Link href="/dashboard/reports">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                <BarChart3 className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
            </Link>
            <Link href="/dashboard/ai-insights">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                <Brain className="h-4 w-4 mr-2" />
                AI Analysis
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
