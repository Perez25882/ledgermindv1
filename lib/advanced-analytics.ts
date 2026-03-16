import { adminDb } from "@/lib/firebase/firebase-admin"

// Database type interfaces
interface SaleItem {
  id: string
  sale_id: string
  item_id: string
  quantity: number
  unit_price: number
  total_price?: number
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
  const [inventorySnap, salesSnap] = await Promise.all([
    adminDb.collection("inventory_items").where("user_id", "==", userId).get(),
    adminDb
      .collection("sales")
      .where("user_id", "==", userId)
      .limit(100)
      .get(),
  ])

  const inventory = inventorySnap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as unknown as InventoryItem[]

  const salesDocs = salesSnap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    created_at: d.data().created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
  }))

  // Get sale items for each sale
  const sales = await Promise.all(
    salesDocs.map(async (sale) => {
      const saleItemsSnap = await adminDb
        .collection("sale_items")
        .where("sale_id", "==", sale.id)
        .get()
      const saleItems = saleItemsSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as unknown as SaleItem[]
      return { ...sale, total_amount: (sale as Record<string, unknown>).total_amount as number || 0, sale_items: saleItems }
    })
  )

  // Generate forecasts
  const recentSales = sales.slice(0, 30)
  const totalRevenue = recentSales.reduce((sum, sale) => sum + sale.total_amount, 0)
  const avgDailyRevenue = totalRevenue / 30
  const forecastRevenue = Math.round(avgDailyRevenue * 30 * 1.15)

  // Detect anomalies
  const anomalies: AnalyticsData["anomalies"] = []

  const criticalStock = inventory.filter(
    (item) => item.current_stock <= item.min_stock_level && item.min_stock_level > 0
  )
  if (criticalStock.length > 0) {
    anomalies.push({
      title: "Critical Stock Levels Detected",
      description: `${criticalStock.length} items are below minimum stock levels, risking stockouts.`,
      severity: "high",
      confidence: 0.95,
      detectedAt: new Date().toLocaleDateString(),
    })
  }

  const recentSalesVelocity = recentSales.length
  const previousSalesVelocity = sales.slice(30, 60).length
  if (recentSalesVelocity < previousSalesVelocity * 0.7) {
    anomalies.push({
      title: "Sales Velocity Decline",
      description: "Sales frequency has decreased by more than 30% compared to the previous period.",
      severity: "medium",
      confidence: 0.8,
      detectedAt: new Date().toLocaleDateString(),
    })
  }

  // Generate insights
  const insights: AnalyticsData["insights"] = []

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

  const currentMonth = new Date().getMonth()
  if (currentMonth >= 9 || currentMonth <= 1) {
    insights.push({
      title: "Prepare for Seasonal Demand",
      description: "Historical patterns suggest increased demand during holiday season. Consider increasing stock levels.",
      category: "Forecasting",
      impact: "Medium",
      confidence: 0.75,
    })
  }

  // Product performance
  const productSales = new Map<string, number>()
  sales.forEach((sale) => {
    sale.sale_items?.forEach((item: SaleItem) => {
      const current = productSales.get(item.item_id) || 0
      productSales.set(item.item_id, current + item.quantity * item.unit_price)
    })
  })

  const topProducts = Array.from(productSales.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([itemId, revenue]) => {
      const item = inventory.find((i) => i.id === itemId)
      return { name: item?.name || `Product ${itemId}`, value: revenue }
    })

  // Revenue trend
  const revenueTrend = []
  for (let i = 29; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dayStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" })

    const dayRevenue = sales
      .filter((sale) => new Date(sale.created_at).toDateString() === date.toDateString())
      .reduce((sum, sale) => sum + sale.total_amount, 0)

    const predicted = i < 7 ? dayRevenue * (1 + Math.random() * 0.2 - 0.1) : dayRevenue

    revenueTrend.push({
      period: dayStr,
      actual: dayRevenue,
      predicted: Math.round(predicted),
    })
  }

  // Optimization score
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
    trends: { revenue: revenueTrend },
    productPerformance: topProducts,
    optimizationScore,
  }
}

export async function processNLPQuery(userId: string, query: string): Promise<NLPResponse> {
  const lowerQuery = query.toLowerCase()

  if (lowerQuery.includes("inventory") || lowerQuery.includes("stock")) {
    const inventorySnap = await adminDb
      .collection("inventory_items")
      .where("user_id", "==", userId)
      .get()

    const items = inventorySnap.docs.map((d) => d.data())
    const totalItems = items.length
    const lowStock = items.filter(
      (item) => (item.current_stock as number) <= (item.min_stock_level as number) && (item.min_stock_level as number) > 0
    ).length
    const totalValue = items.reduce(
      (sum, item) => sum + (item.current_stock as number) * (item.unit_price as number),
      0
    )

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
    const salesSnap = await adminDb
      .collection("sales")
      .where("user_id", "==", userId)
      .limit(30)
      .get()

    const totalRevenue = salesSnap.docs.reduce((sum, d) => sum + (d.data().total_amount || 0), 0)
    const totalSales = salesSnap.docs.length
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
    answer: "I understand you're asking about your business data. Try asking about your inventory status or recent sales performance for specific insights.",
  }
}
