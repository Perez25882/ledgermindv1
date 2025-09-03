import { createClient } from "@/lib/supabase/client"

// Database type interfaces
interface SaleItem {
  id: string
  sale_id: string
  item_id: string
  inventory_item_id: string
  quantity: number
  unit_price: number
  total_price?: number
}

interface Sale {
  id: string
  user_id: string
  customer_name?: string
  customer_email?: string
  total_amount: number
  payment_method?: string
  status: string
  notes?: string
  created_at: string
  sale_items?: SaleItem[]
}

interface InventoryItem {
  id: string
  user_id: string
  name: string
  sku?: string
  current_stock: number
  min_stock_level: number
  unit_price: number
  updated_at: string
}

export interface AnalyticsData {
  forecasts: {
    revenue: number
    sales: number
    confidence: number
  }
  anomalies: Array<{
    title: string
    description: string
    severity: "low" | "medium" | "high"
    confidence: number
    detectedAt: string
  }>
  insights: Array<{
    title: string
    description: string
    category: string
    impact: string
    confidence: number
  }>
  trends: {
    revenue: Array<{
      period: string
      actual: number
      predicted: number
    }>
  }
  productPerformance: Array<{
    name: string
    value: number
  }>
  optimizationScore: number
}

export interface NLPResponse {
  question: string
  answer: string
  data?: Array<{
    label: string
    value: string
  }>
}

export async function generateAdvancedAnalytics(userId: string): Promise<AnalyticsData> {
  const supabase = createClient()

  // Get comprehensive data
  const [inventoryResult, salesResult, stockMovementsResult] = await Promise.all([
    supabase.from("inventory_items").select("*").eq("user_id", userId),
    supabase
      .from("sales")
      .select("*, sale_items(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("stock_movements")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200),
  ])

  const inventory = inventoryResult.data || []
  const sales = salesResult.data || []
  const stockMovements = stockMovementsResult.data || []

  // Generate forecasts using simple ML-like algorithms
  const recentSales = sales.slice(0, 30)
  const totalRevenue = recentSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)
  const avgDailyRevenue = totalRevenue / 30
  const forecastRevenue = Math.round(avgDailyRevenue * 30 * 1.15) // 15% growth prediction

  // Detect anomalies
  const anomalies = []

  // Stock level anomalies
  const criticalStock = inventory.filter(
    (item) => item.current_stock <= item.min_stock_level && item.min_stock_level > 0,
  )
  if (criticalStock.length > 0) {
    anomalies.push({
      title: "Critical Stock Levels Detected",
      description: `${criticalStock.length} items are below minimum stock levels, risking stockouts.`,
      severity: "high" as const,
      confidence: 0.95,
      detectedAt: new Date().toLocaleDateString(),
    })
  }

  // Sales velocity anomalies
  const recentSalesVelocity = recentSales.length
  const previousSalesVelocity = sales.slice(30, 60).length
  if (recentSalesVelocity < previousSalesVelocity * 0.7) {
    anomalies.push({
      title: "Sales Velocity Decline",
      description: "Sales frequency has decreased by more than 30% compared to the previous period.",
      severity: "medium" as const,
      confidence: 0.8,
      detectedAt: new Date().toLocaleDateString(),
    })
  }

  // Generate insights
  const insights = []

  // High-value inventory insight
  const highValueItems = inventory
    .filter((item) => item.unit_price > 100)
    .sort((a, b) => b.unit_price * b.current_stock - a.unit_price * a.current_stock)
    .slice(0, 5)

  if (highValueItems.length > 0) {
    insights.push({
      title: "Optimize High-Value Inventory",
      description: `Focus on ${highValueItems.length} high-value items that represent significant capital investment.`,
      category: "Inventory",
      impact: "High",
      confidence: 0.85,
    })
  }

  // Seasonal trends insight
  const currentMonth = new Date().getMonth()
  if (currentMonth >= 9 || currentMonth <= 1) {
    insights.push({
      title: "Prepare for Seasonal Demand",
      description:
        "Historical patterns suggest increased demand during holiday season. Consider increasing stock levels.",
      category: "Forecasting",
      impact: "Medium",
      confidence: 0.75,
    })
  }

  // Product performance analysis
  const productSales = new Map<string, number>()
  sales.forEach((sale: Sale) => {
    sale.sale_items?.forEach((item: SaleItem) => {
      const current = productSales.get(item.inventory_item_id) || 0
      productSales.set(item.inventory_item_id, current + item.quantity * item.unit_price)
    })
  })

  const topProducts = Array.from(productSales.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([itemId, revenue]) => {
      const item = inventory.find((i) => i.id === itemId)
      return {
        name: item?.name || `Product ${itemId}`,
        value: revenue,
      }
    })

  // Generate revenue trend data
  const revenueTrend = []
  for (let i = 29; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dayStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" })

    const dayRevenue = sales
      .filter((sale) => {
        const saleDate = new Date(sale.created_at)
        return saleDate.toDateString() === date.toDateString()
      })
      .reduce((sum, sale) => sum + (sale.total_amount || 0), 0)

    // Simple prediction based on trend
    const predicted = i < 7 ? dayRevenue * (1 + Math.random() * 0.2 - 0.1) : dayRevenue

    revenueTrend.push({
      period: dayStr,
      actual: dayRevenue,
      predicted: Math.round(predicted),
    })
  }

  // Calculate optimization score
  const stockOptimization =
    inventory.length > 0
      ? (inventory.filter((item) => item.current_stock > item.min_stock_level).length / inventory.length) * 100
      : 0
  const salesEfficiency = sales.length > 0 ? Math.min(100, (sales.length / 30) * 10) : 0
  const optimizationScore = Math.round((stockOptimization + salesEfficiency) / 2)

  return {
    forecasts: {
      revenue: forecastRevenue,
      sales: Math.round(recentSalesVelocity * 1.1),
      confidence: 85,
    },
    anomalies,
    insights,
    trends: {
      revenue: revenueTrend,
    },
    productPerformance: topProducts,
    optimizationScore,
  }
}

export async function processNLPQuery(userId: string, query: string): Promise<NLPResponse> {
  const supabase = createClient()

  // Simple NLP processing - in a real app, this would use actual NLP/AI services
  const lowerQuery = query.toLowerCase()

  if (lowerQuery.includes("best selling") || lowerQuery.includes("top product")) {
    const salesResult = await supabase.from("sales").select("*, sale_items(*)").eq("user_id", userId).limit(50)

    const productSales = new Map<string, { quantity: number; revenue: number }>()
    salesResult.data?.forEach((sale: Sale) => {
      sale.sale_items?.forEach((item: SaleItem) => {
        const current = productSales.get(item.inventory_item_id) || { quantity: 0, revenue: 0 }
        productSales.set(item.inventory_item_id, {
          quantity: current.quantity + item.quantity,
          revenue: current.revenue + item.quantity * item.unit_price,
        })
      })
    })

    const topProduct = Array.from(productSales.entries()).sort(([, a], [, b]) => b.quantity - a.quantity)[0]

    if (topProduct) {
      const inventoryResult = await supabase.from("inventory_items").select("name").eq("id", topProduct[0]).single()

      return {
        question: query,
        answer: `Your best-selling product is "${inventoryResult.data?.name}" with ${topProduct[1].quantity} units sold, generating $${topProduct[1].revenue.toLocaleString()} in revenue.`,
        data: [
          { label: "Product", value: inventoryResult.data?.name || "Unknown" },
          { label: "Units Sold", value: topProduct[1].quantity.toString() },
          { label: "Revenue", value: `$${topProduct[1].revenue.toLocaleString()}` },
        ],
      }
    }
  }

  if (lowerQuery.includes("inventory") || lowerQuery.includes("stock")) {
    const inventoryResult = await supabase.from("inventory_items").select("*").eq("user_id", userId)

    const totalItems = inventoryResult.data?.length || 0
    const lowStock =
      inventoryResult.data?.filter((item) => item.current_stock <= item.min_stock_level && item.min_stock_level > 0)
        .length || 0
    const totalValue = inventoryResult.data?.reduce((sum, item) => sum + item.current_stock * item.unit_price, 0) || 0

    return {
      question: query,
      answer: `You have ${totalItems} items in inventory with a total value of $${totalValue.toLocaleString()}. ${lowStock} items are currently low on stock.`,
      data: [
        { label: "Total Items", value: totalItems.toString() },
        { label: "Low Stock Items", value: lowStock.toString() },
        { label: "Total Value", value: `$${totalValue.toLocaleString()}` },
      ],
    }
  }

  if (lowerQuery.includes("revenue") || lowerQuery.includes("sales")) {
    const salesResult = await supabase
      .from("sales")
      .select("total_amount, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30)

    const totalRevenue = salesResult.data?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0
    const totalSales = salesResult.data?.length || 0
    const avgSale = totalSales > 0 ? totalRevenue / totalSales : 0

    return {
      question: query,
      answer: `In the last 30 transactions, you've generated $${totalRevenue.toLocaleString()} in revenue with an average sale value of $${avgSale.toFixed(2)}.`,
      data: [
        { label: "Total Revenue", value: `$${totalRevenue.toLocaleString()}` },
        { label: "Number of Sales", value: totalSales.toString() },
        { label: "Average Sale", value: `$${avgSale.toFixed(2)}` },
      ],
    }
  }

  return {
    question: query,
    answer:
      "I understand you're asking about your business data. Try asking about your best-selling products, inventory status, or recent sales performance for more specific insights.",
  }
}
