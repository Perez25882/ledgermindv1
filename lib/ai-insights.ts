import { adminDb } from "@/lib/firebase/firebase-admin"

export interface AIInsightData {
  insight_type: "forecast" | "anomaly" | "recommendation" | "trend"
  title: string
  description: string
  confidence_score?: number
  data?: Record<string, unknown>
}

export async function generateAIInsights(userId: string): Promise<AIInsightData[]> {
  const [inventorySnap, salesSnap] = await Promise.all([
    adminDb.collection("inventory_items").where("user_id", "==", userId).get(),
    adminDb
      .collection("sales")
      .where("user_id", "==", userId)
      .limit(50)
      .get(),
  ])

  const inventory = inventorySnap.docs.map((d) => ({ id: d.id, ...d.data() }))
  const sales = salesSnap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    total_amount: d.data().total_amount || 0,
  }))

  const insights: AIInsightData[] = []

  // Low stock analysis
  const lowStockItems = inventory.filter(
    (item: Record<string, unknown>) =>
      (item.current_stock as number) <= (item.min_stock_level as number) &&
      (item.min_stock_level as number) > 0
  )

  if (lowStockItems.length > 0) {
    insights.push({
      insight_type: "anomaly",
      title: `${lowStockItems.length} items are running low on stock`,
      description: `Items like "${(lowStockItems[0] as Record<string, unknown>).name}" need immediate restocking to avoid stockouts.`,
      confidence_score: 0.95,
      data: { low_stock_items: lowStockItems.map((item: Record<string, unknown>) => item.id) },
    })
  }

  // Sales trend analysis
  if (sales.length >= 5) {
    const recentSales = sales.slice(0, 10)
    const olderSales = sales.slice(10, 20)
    const recentTotal = recentSales.reduce((sum, sale) => sum + (sale.total_amount as number), 0)
    const olderTotal = olderSales.reduce((sum, sale) => sum + (sale.total_amount as number), 0)

    if (olderTotal > 0 && recentTotal > olderTotal * 1.2) {
      insights.push({
        insight_type: "trend",
        title: "Sales are trending upward",
        description: `Your recent sales have increased by ${Math.round(((recentTotal - olderTotal) / olderTotal) * 100)}% compared to the previous period.`,
        confidence_score: 0.85,
        data: { recent_total: recentTotal, previous_total: olderTotal },
      })
    } else if (olderTotal > 0 && recentTotal < olderTotal * 0.8) {
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
  const highValueItems = inventory
    .filter((item: Record<string, unknown>) => (item.unit_price as number) > 100)
    .sort((a: Record<string, unknown>, b: Record<string, unknown>) => (b.unit_price as number) - (a.unit_price as number))
    .slice(0, 3)

  if (highValueItems.length > 0) {
    insights.push({
      insight_type: "recommendation",
      title: "Focus on high-value inventory management",
      description: `Your top-value items like "${(highValueItems[0] as Record<string, unknown>).name}" represent significant capital. Consider implementing tighter stock controls.`,
      confidence_score: 0.75,
      data: { high_value_items: highValueItems.map((item: Record<string, unknown>) => item.id) },
    })
  }

  // Seasonal forecast
  const currentMonth = new Date().getMonth()
  if (currentMonth >= 9 || currentMonth <= 1) {
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
  const batch = adminDb.batch()

  insights.forEach((insight) => {
    const ref = adminDb.collection("ai_insights").doc()
    batch.set(ref, {
      user_id: userId,
      ...insight,
      is_read: false,
      created_at: new Date(),
    })
  })

  await batch.commit()
}
