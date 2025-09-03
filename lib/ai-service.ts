import { createClient } from "@/lib/supabase/client"

interface BusinessData {
  inventory: any[]
  sales: any[]
  stockMovements: any[]
  categories: any[]
}

interface AIAnalysisRequest {
  query: string
  businessData: BusinessData
  context?: string
}

interface AIResponse {
  answer: string
  insights: string[]
  recommendations: string[]
  data?: Array<{
    label: string
    value: string | number
  }>
  confidence: number
  sources: string[]
}

export class AIService {
  private groqApiKey: string
  private supabase: ReturnType<typeof createClient>

  constructor() {
    this.groqApiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY || ""
    this.supabase = createClient()
  }

  async getBusinessContext(userId: string): Promise<BusinessData> {
    const [inventoryResult, salesResult, stockMovementsResult, categoriesResult] = await Promise.all([
      this.supabase.from("inventory_items").select("*").eq("user_id", userId).limit(100),
      this.supabase
        .from("sales")
        .select("*, sale_items(*)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100),
      this.supabase
        .from("stock_movements")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),
      this.supabase.from("categories").select("*").eq("user_id", userId),
    ])

    return {
      inventory: inventoryResult.data || [],
      sales: salesResult.data || [],
      stockMovements: stockMovementsResult.data || [],
      categories: categoriesResult.data || [],
    }
  }

  async analyzeWithGroq(request: AIAnalysisRequest): Promise<AIResponse> {
    if (!this.groqApiKey) {
      return this.fallbackAnalysis(request)
    }

    try {
      const businessSummary = this.createBusinessSummary(request.businessData)
      
      const prompt = `
You are an expert business analyst specializing in inventory management and retail analytics. Analyze the following business data and user query.

BUSINESS DATA SUMMARY:
${businessSummary}

USER QUERY: "${request.query}"

Please provide a comprehensive analysis with:
1. A clear, actionable answer to the user's question
2. 2-3 key insights based on the data
3. 2-3 specific recommendations for improvement
4. Relevant data points that support your analysis
5. A confidence score (0-100) for your analysis

Respond in JSON format:
{
  "answer": "Direct answer to the user's question",
  "insights": ["insight1", "insight2", "insight3"],
  "recommendations": ["recommendation1", "recommendation2"],
  "data": [{"label": "Metric Name", "value": "metric_value"}],
  "confidence": 85,
  "sources": ["data source used for analysis"]
}

Be specific, actionable, and focus on business impact. Use actual numbers from the provided data.
`

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.groqApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            {
              role: "system",
              content: "You are an expert business analyst. Always respond with valid JSON format only."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 1000,
        }),
      })

      if (!response.ok) {
        throw new Error(`GROQ API error: ${response.status}`)
      }

      const result = await response.json()
      const aiResponse = JSON.parse(result.choices[0].message.content)

      return {
        answer: aiResponse.answer || "I'll analyze your business data to provide insights.",
        insights: aiResponse.insights || [],
        recommendations: aiResponse.recommendations || [],
        data: aiResponse.data || [],
        confidence: aiResponse.confidence || 75,
        sources: aiResponse.sources || ["business_data"],
      }
    } catch (error) {
      console.error("GROQ AI analysis failed:", error)
      return this.fallbackAnalysis(request)
    }
  }

  private createBusinessSummary(data: BusinessData): string {
    const inventoryCount = data.inventory.length
    const totalInventoryValue = data.inventory.reduce((sum, item) => sum + (item.current_stock * item.unit_price), 0)
    const lowStockItems = data.inventory.filter(item => item.current_stock <= item.min_stock_level).length
    
    const recentSales = data.sales.slice(0, 30)
    const totalRevenue = recentSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)
    const avgOrderValue = recentSales.length > 0 ? totalRevenue / recentSales.length : 0
    
    const topProducts = this.getTopProducts(data.sales, data.inventory)
    const categoryBreakdown = this.getCategoryBreakdown(data.inventory, data.categories)

    return `
INVENTORY OVERVIEW:
- Total Items: ${inventoryCount}
- Total Inventory Value: $${totalInventoryValue.toLocaleString()}
- Low Stock Items: ${lowStockItems}
- Categories: ${data.categories.length}

SALES PERFORMANCE (Last 30 transactions):
- Total Revenue: $${totalRevenue.toLocaleString()}
- Number of Sales: ${recentSales.length}
- Average Order Value: $${avgOrderValue.toFixed(2)}

TOP PERFORMING PRODUCTS:
${topProducts.map(p => `- ${p.name}: ${p.quantity} units, $${p.revenue}`).join('\n')}

CATEGORY BREAKDOWN:
${categoryBreakdown.map(c => `- ${c.name}: ${c.items} items, $${c.value} value`).join('\n')}

RECENT STOCK MOVEMENTS: ${data.stockMovements.length} movements tracked
`
  }

  private getTopProducts(sales: any[], inventory: any[]): Array<{name: string, quantity: number, revenue: number}> {
    const productSales = new Map()
    
    sales.forEach(sale => {
      sale.sale_items?.forEach((item: any) => {
        const current = productSales.get(item.inventory_item_id) || { quantity: 0, revenue: 0 }
        productSales.set(item.inventory_item_id, {
          quantity: current.quantity + item.quantity,
          revenue: current.revenue + (item.quantity * item.unit_price)
        })
      })
    })

    return Array.from(productSales.entries())
      .sort(([,a], [,b]) => b.revenue - a.revenue)
      .slice(0, 5)
      .map(([itemId, stats]) => {
        const item = inventory.find(i => i.id === itemId)
        return {
          name: item?.name || `Product ${itemId}`,
          quantity: stats.quantity,
          revenue: stats.revenue
        }
      })
  }

  private getCategoryBreakdown(inventory: any[], categories: any[]): Array<{name: string, items: number, value: number}> {
    const categoryMap = new Map()
    
    inventory.forEach(item => {
      const category = categories.find(c => c.id === item.category_id)
      const categoryName = category?.name || "Uncategorized"
      const current = categoryMap.get(categoryName) || { items: 0, value: 0 }
      
      categoryMap.set(categoryName, {
        items: current.items + 1,
        value: current.value + (item.current_stock * item.unit_price)
      })
    })

    return Array.from(categoryMap.entries()).map(([name, stats]) => ({
      name,
      items: stats.items,
      value: stats.value
    }))
  }

  private fallbackAnalysis(request: AIAnalysisRequest): AIResponse {
    const { businessData, query } = request
    const lowerQuery = query.toLowerCase()

    // Enhanced fallback logic
    if (lowerQuery.includes("profit") || lowerQuery.includes("margin")) {
      const totalRevenue = businessData.sales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)
      const totalCost = businessData.inventory.reduce((sum, item) => sum + (item.current_stock * (item.unit_price * 0.6)), 0)
      const estimatedProfit = totalRevenue - totalCost

      return {
        answer: `Based on your sales data, estimated profit margins show revenue of $${totalRevenue.toLocaleString()} with an estimated profit of $${estimatedProfit.toLocaleString()}.`,
        insights: [
          "Profit analysis requires cost data for accuracy",
          "Revenue trends show business performance patterns",
          "Inventory value represents capital investment"
        ],
        recommendations: [
          "Track cost of goods sold for accurate profit calculations",
          "Monitor profit margins per product category",
          "Optimize inventory levels to improve cash flow"
        ],
        data: [
          { label: "Total Revenue", value: `$${totalRevenue.toLocaleString()}` },
          { label: "Estimated Profit", value: `$${estimatedProfit.toLocaleString()}` },
          { label: "Profit Margin", value: `${((estimatedProfit / totalRevenue) * 100).toFixed(1)}%` }
        ],
        confidence: 70,
        sources: ["sales_data", "inventory_data"]
      }
    }

    if (lowerQuery.includes("trend") || lowerQuery.includes("forecast")) {
      const recentSales = businessData.sales.slice(0, 30)
      const previousSales = businessData.sales.slice(30, 60)
      const recentRevenue = recentSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)
      const previousRevenue = previousSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)
      const growthRate = ((recentRevenue - previousRevenue) / previousRevenue) * 100

      return {
        answer: `Sales trends show a ${growthRate.toFixed(1)}% change compared to the previous period. Recent 30-day revenue: $${recentRevenue.toLocaleString()}.`,
        insights: [
          `${growthRate > 0 ? 'Positive' : 'Negative'} revenue trend detected`,
          "Sales velocity impacts cash flow and growth potential",
          "Trend analysis helps predict future performance"
        ],
        recommendations: [
          growthRate > 0 ? "Capitalize on positive momentum with increased marketing" : "Investigate causes of revenue decline",
          "Analyze seasonal patterns for better forecasting",
          "Monitor key performance indicators regularly"
        ],
        data: [
          { label: "Growth Rate", value: `${growthRate.toFixed(1)}%` },
          { label: "Recent Revenue", value: `$${recentRevenue.toLocaleString()}` },
          { label: "Previous Revenue", value: `$${previousRevenue.toLocaleString()}` }
        ],
        confidence: 80,
        sources: ["sales_trends", "revenue_analysis"]
      }
    }

    // Default enhanced response
    return {
      answer: "I can help you analyze your business data. Try asking about profits, trends, inventory optimization, or specific product performance.",
      insights: [
        "Your business has valuable data that can drive decisions",
        "AI analysis can uncover hidden patterns and opportunities",
        "Regular data review leads to better business outcomes"
      ],
      recommendations: [
        "Ask specific questions about your business metrics",
        "Try queries like 'analyze my profit margins' or 'show me sales trends'",
        "Use AI insights to guide strategic decisions"
      ],
      data: [
        { label: "Available Products", value: businessData.inventory.length },
        { label: "Total Sales Records", value: businessData.sales.length },
        { label: "Categories", value: businessData.categories.length }
      ],
      confidence: 60,
      sources: ["general_business_data"]
    }
  }
}

export const aiService = new AIService()