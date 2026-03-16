"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SimpleBarChart, SimplePieChart } from "@/components/ui/simple-charts"
import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Package,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from "lucide-react"

interface ReportData {
  inventoryItems: Array<Record<string, unknown>>
  sales: Array<Record<string, unknown>>
  categories: Array<Record<string, unknown>>
}

export function ReportsContent() {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [invRes, salesRes, catRes] = await Promise.all([
          fetch("/api/inventory"),
          fetch("/api/sales"),
          fetch("/api/categories"),
        ])

        const invData = await invRes.json()
        const salesData = await salesRes.json()
        const catData = await catRes.json()

        setData({
          inventoryItems: invData.data || [],
          sales: salesData.data || [],
          categories: catData.data || [],
        })
      } catch (error) {
        console.error("Error fetching report data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading reports...</span>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Failed to load report data. Please try again.
      </div>
    )
  }

  const { inventoryItems, sales, categories } = data

  // KPIs
  const totalRevenue = sales.reduce((sum, s) => sum + ((s.total_amount as number) || 0), 0)
  const totalInventoryValue = inventoryItems.reduce(
    (sum, i) => sum + ((i.current_stock as number) || 0) * ((i.unit_price as number) || 0),
    0
  )
  const totalCostValue = inventoryItems.reduce(
    (sum, i) => sum + ((i.current_stock as number) || 0) * ((i.cost_price as number) || 0),
    0
  )
  const grossProfit = totalRevenue - totalCostValue * 0.6 // Simplified estimate
  const profitMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : "0"
  const lowStock = inventoryItems.filter(
    (i) => (i.current_stock as number) <= ((i.min_stock_level as number) || 10)
  ).length
  const avgOrderValue = sales.length > 0 ? totalRevenue / sales.length : 0

  // Monthly sales data for chart
  const monthlySalesData = Array.from({ length: 6 }, (_, i) => {
    const date = new Date()
    date.setMonth(date.getMonth() - (5 - i))
    const monthName = date.toLocaleDateString("en", { month: "short" })
    const monthSales = sales.filter((s) => {
      const saleDate = new Date(s.created_at as string)
      return saleDate.getMonth() === date.getMonth() && saleDate.getFullYear() === date.getFullYear()
    })
    const revenue = monthSales.reduce((sum, s) => sum + ((s.total_amount as number) || 0), 0)
    return { month: monthName, sales: revenue, profit: Math.round(revenue * 0.3) }
  })

  // Category breakdown for pie chart
  const categoryMap = new Map<string, string>()
  categories.forEach((c) => categoryMap.set(c.id as string, c.name as string))

  const categoryData = inventoryItems.reduce(
    (acc: Array<{ name: string; value: number; color: string }>, item) => {
      const catName = item.category_id
        ? categoryMap.get(item.category_id as string) || "Uncategorized"
        : "Uncategorized"
      const existing = acc.find((c) => c.name === catName)
      if (existing) {
        existing.value += (item.current_stock as number) || 0
      } else {
        acc.push({
          name: catName,
          value: (item.current_stock as number) || 0,
          color: `hsl(var(--chart-${acc.length + 1}))`,
        })
      }
      return acc
    },
    []
  )

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
            <div className="flex items-center text-xs text-primary">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              All time
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalInventoryValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{inventoryItems.length} items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${avgOrderValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{sales.length} orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{lowStock}</div>
            <p className="text-xs text-muted-foreground">Items need attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="min-h-[400px]">
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Monthly revenue and estimated profit</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            <SimpleBarChart data={monthlySalesData} className="h-full w-full" />
          </CardContent>
        </Card>

        <Card className="min-h-[400px]">
          <CardHeader>
            <CardTitle>Category Distribution</CardTitle>
            <CardDescription>Inventory units by category</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            <SimplePieChart data={categoryData} className="h-full w-full" />
          </CardContent>
        </Card>
      </div>

      {/* Key Metrics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Summary</CardTitle>
          <CardDescription>Key business metrics at a glance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">{profitMargin}%</div>
              <div className="text-xs text-muted-foreground">Est. Profit Margin</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">{inventoryItems.length}</div>
              <div className="text-xs text-muted-foreground">Total Products</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">{categories.length}</div>
              <div className="text-xs text-muted-foreground">Categories</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">{sales.length}</div>
              <div className="text-xs text-muted-foreground">Total Orders</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
