"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { SimpleBarChart, SimplePieChart } from "@/components/ui/simple-charts"
import { TrendingUp, AlertTriangle, Brain, Search, Zap, Target, Calendar, Sparkles } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import {
  generateAdvancedAnalytics,
  processNLPQuery,
  type AnalyticsData,
  type NLPResponse,
} from "@/lib/advanced-analytics"
import { aiService } from "@/lib/ai-service"

const COLORS = ["#0891b2", "#06b6d4", "#67e8f9", "#a5f3fc", "#cffafe"]

export function ReportsContent() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [nlpQuery, setNlpQuery] = useState("")
  const [nlpResponse, setNlpResponse] = useState<NLPResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [nlpLoading, setNlpLoading] = useState(false)

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const analyticsData = await generateAdvancedAnalytics(user.id)
        setAnalytics(analyticsData)
      }
    } catch (error) {
      console.error("Error loading analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleNLPQuery = async () => {
    if (!nlpQuery.trim()) return

    setNlpLoading(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        // Try enhanced AI service first
        try {
          const businessData = await aiService.getBusinessContext(user.id)
          const aiResponse = await aiService.analyzeWithGroq({
            query: nlpQuery,
            businessData,
            context: "reports_analysis"
          })
          
          setNlpResponse({
            question: nlpQuery,
            answer: aiResponse.answer,
            data: aiResponse.data?.map(item => ({
              label: item.label,
              value: item.value.toString()
            }))
          })
        } catch (aiError) {
          console.log("AI service failed, using fallback:", aiError)
          // Fallback to original NLP processing
          const response = await processNLPQuery(user.id, nlpQuery)
          setNlpResponse(response)
        }
      }
    } catch (error) {
      console.error("Error processing NLP query:", error)
      setNlpResponse({
        question: nlpQuery,
        answer: "I'm having trouble analyzing your query. Please ensure your database is connected and try a simpler question."
      })
    } finally {
      setNlpLoading(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading analytics...</div>
  }

  if (!analytics) {
    return <div className="text-center text-muted-foreground">No analytics data available</div>
  }

  return (
    <div className="space-y-6">
      {/* AI Query Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-cyan-600" />
            AI Assistant
          </CardTitle>
          <CardDescription>Ask questions about your business data in natural language</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="e.g., 'What are my profit margins?' or 'Show me seasonal trends'"
              value={nlpQuery}
              onChange={(e) => setNlpQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleNLPQuery()}
            />
            <Button onClick={handleNLPQuery} disabled={nlpLoading}>
              {nlpLoading ? <Brain className="h-4 w-4 animate-pulse" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
          
          {/* Enhanced Query Suggestions */}
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              "Analyze my profit margins",
              "Show me sales trends",
              "Which products are most profitable?",
              "What's my inventory turnover rate?",
              "Predict next month's revenue"
            ].map((suggestion, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                onClick={() => {
                  setNlpQuery(suggestion)
                  handleNLPQuery()
                }}
                disabled={nlpLoading}
                className="text-xs h-7"
              >
                <Sparkles className="h-3 w-3 mr-1" />
                {suggestion}
              </Button>
            ))}
          </div>

          {nlpResponse && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">{nlpResponse.question}</h4>
              <p className="text-sm text-muted-foreground mb-3">{nlpResponse.answer}</p>
              {nlpResponse.data && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {nlpResponse.data.map((item, index) => (
                    <div key={index} className="bg-background p-3 rounded border">
                      <div className="font-medium">{item.label}</div>
                      <div className="text-lg font-bold text-cyan-600">{item.value}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="forecasting">AI Forecasting</TabsTrigger>
          <TabsTrigger value="anomalies">Anomaly Detection</TabsTrigger>
          <TabsTrigger value="insights">Smart Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue Forecast</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${analytics.forecasts.revenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">+{analytics.forecasts.confidence}% confidence</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Anomalies Detected</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.anomalies.length}</div>
                <p className="text-xs text-muted-foreground">Requires attention</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">AI Insights</CardTitle>
                <Brain className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.insights.length}</div>
                <p className="text-xs text-muted-foreground">New recommendations</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Optimization Score</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.optimizationScore}%</div>
                <p className="text-xs text-muted-foreground">Business efficiency</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <SimpleBarChart 
                  data={analytics.trends.revenue.map(item => ({
                    month: item.period,
                    sales: item.actual,
                    profit: item.predicted
                  }))}
                  className="h-[300px] w-full" 
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Product Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <SimplePieChart 
                  data={analytics.productPerformance.map((item, index) => ({
                    name: item.name,
                    value: item.value,
                    color: COLORS[index % COLORS.length]
                  }))}
                  className="h-[300px] w-full" 
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="forecasting" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                AI-Powered Forecasting
              </CardTitle>
              <CardDescription>Machine learning predictions for the next 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-cyan-600">
                    ${analytics.forecasts.revenue.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Predicted Revenue</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-cyan-600">{analytics.forecasts.sales}</div>
                  <div className="text-sm text-muted-foreground">Expected Sales</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-cyan-600">{analytics.forecasts.confidence}%</div>
                  <div className="text-sm text-muted-foreground">Confidence Level</div>
                </div>
              </div>

              <SimpleBarChart 
                data={analytics.trends.revenue.map(item => ({
                  month: item.period,
                  sales: item.actual,
                  profit: item.predicted
                }))}
                className="h-[400px] w-full" 
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="anomalies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Anomaly Detection
              </CardTitle>
              <CardDescription>AI-detected unusual patterns in your business data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.anomalies.map((anomaly, index) => (
                  <div key={index} className="flex items-start gap-4 p-4 border rounded-lg">
                    <div
                      className={`p-2 rounded-full ${
                        anomaly.severity === "high"
                          ? "bg-red-100 text-red-600"
                          : anomaly.severity === "medium"
                            ? "bg-yellow-100 text-yellow-600"
                            : "bg-blue-100 text-blue-600"
                      }`}
                    >
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{anomaly.title}</h4>
                        <Badge variant={anomaly.severity === "high" ? "destructive" : "secondary"}>
                          {anomaly.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{anomaly.description}</p>
                      <div className="text-xs text-muted-foreground">
                        Confidence: {(anomaly.confidence * 100).toFixed(0)}% • Detected: {anomaly.detectedAt}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Smart Business Insights
              </CardTitle>
              <CardDescription>AI-generated recommendations to optimize your business</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.insights.map((insight, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="h-4 w-4 text-cyan-600" />
                      <h4 className="font-semibold">{insight.title}</h4>
                      <Badge variant="outline">{insight.category}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{insight.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        Impact: {insight.impact} • Confidence: {(insight.confidence * 100).toFixed(0)}%
                      </div>
                      <Button size="sm" variant="outline">
                        Apply Recommendation
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
