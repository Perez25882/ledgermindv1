import { createClient } from "@/lib/supabase/server"

export interface AIInsightData {
  insight_type: "forecast" | "anomaly" | "recommendation" | "trend"
  title: string
  description: string
  confidence_score?: number
  data?: any
}

export async function generateAIInsights(userId: string): Promise<AIInsightData[]> {
  const supabase = await createClient()

  // Get user's inventory and sales data
  const [inventoryResult, salesResult, stockMovementsResult] = await Promise.all([
    supabase.from("inventory_items").select("*").eq("user_id", userId),
    supabase
      .from("sales")
      .select("*, sale_items(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("stock_movements")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100),
  ])

  const insights: AIInsightData[] = []

  // Low stock analysis
  if (inventoryResult.data) {
    const lowStockItems = inventoryResult.data.filter(
      (item) => item.current_stock <= item.min_stock_level && item.min_stock_level > 0,
    )

    if (lowStockItems.length > 0) {
      insights.push({
        insight_type: "anomaly",
        title: `${lowStockItems.length} items are running low on stock`,
        description: `Items like "${lowStockItems[0].name}" need immediate restocking to avoid stockouts.`,
        confidence_score: 0.95,
        data: { low_stock_items: lowStockItems.map((item) => item.id) },
      })
    }
  }

  // Sales trend analysis
  if (salesResult.data && salesResult.data.length >= 5) {
    const recentSales = salesResult.data.slice(0, 10)
    const olderSales = salesResult.data.slice(10, 20)

    const recentTotal = recentSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)
    const olderTotal = olderSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)

    if (recentTotal > olderTotal * 1.2) {
      insights.push({
        insight_type: "trend",
        title: "Sales are trending upward",
        description: `Your recent sales have increased by ${Math.round(((recentTotal - olderTotal) / olderTotal) * 100)}% compared to the previous period.`,
        confidence_score: 0.85,
        data: { recent_total: recentTotal, previous_total: olderTotal },
      })
    } else if (recentTotal < olderTotal * 0.8) {
      insights.push({
        insight_type: "anomaly",
        title: "Sales have declined recently",
        description: `Your recent sales have decreased by ${Math.round(((olderTotal - recentTotal) / olderTotal) * 100)}%. Consider reviewing your inventory or marketing strategy.`,
        confidence_score: 0.8,
        data: { recent_total: recentTotal, previous_total: olderTotal },
      })
    }
  }

  // Inventory optimization recommendations
  if (inventoryResult.data && salesResult.data) {
    const highValueItems = inventoryResult.data
      .filter((item) => item.unit_price > 100)
      .sort((a, b) => b.unit_price - a.unit_price)
      .slice(0, 3)

    if (highValueItems.length > 0) {
      insights.push({
        insight_type: "recommendation",
        title: "Focus on high-value inventory management",
        description: `Your top-value items like "${highValueItems[0].name}" represent significant capital. Consider implementing tighter stock controls.`,
        confidence_score: 0.75,
        data: { high_value_items: highValueItems.map((item) => item.id) },
      })
    }
  }

  // Seasonal forecast (mock implementation)
  const currentMonth = new Date().getMonth()
  if (currentMonth >= 9 || currentMonth <= 1) {
    // Oct-Jan (holiday season)
    insights.push({
      insight_type: "forecast",
      title: "Prepare for seasonal demand increase",
      description: "Historical data suggests inventory demand typically increases by 30-40% during the holiday season.",
      confidence_score: 0.7,
      data: { season: "holiday", expected_increase: 0.35 },
    })
  }

  return insights
}

export async function saveAIInsights(userId: string, insights: AIInsightData[]) {
  const supabase = await createClient()

  const insightsToSave = insights.map((insight) => ({
    user_id: userId,
    ...insight,
  }))

  const { error } = await supabase.from("ai_insights").insert(insightsToSave)

  if (error) {
    console.error("Error saving AI insights:", error)
    throw error
  }
}
