"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { 
  Brain, 
  Send, 
  TrendingUp, 
  Lightbulb, 
  Target, 
  BarChart3,
  MessageSquare,
  Sparkles,
  Loader2
} from "lucide-react"
import { aiService } from "@/lib/ai-service"
import { createClient } from "@/lib/supabase/client"

interface ChatMessage {
  id: string
  type: "user" | "ai"
  content: string
  timestamp: Date
  insights?: string[]
  recommendations?: string[]
  data?: Array<{ label: string; value: string | number }>
  confidence?: number
}

interface QuickQuery {
  label: string
  query: string
  icon: React.ElementType
  category: string
}

const quickQueries: QuickQuery[] = [
  { label: "Analyze Profit Margins", query: "What are my profit margins and how can I improve them?", icon: TrendingUp, category: "Financial" },
  { label: "Sales Trends", query: "Show me my sales trends and forecast next month", icon: BarChart3, category: "Analytics" },
  { label: "Inventory Optimization", query: "How can I optimize my inventory levels?", icon: Target, category: "Operations" },
  { label: "Top Products", query: "Which are my best-performing products and why?", icon: Sparkles, category: "Products" },
  { label: "Low Stock Alert", query: "What items need restocking urgently?", icon: Brain, category: "Alerts" },
  { label: "Business Insights", query: "Give me actionable insights to grow my business", icon: Lightbulb, category: "Strategy" },
]

export function AIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSendMessage = async (query: string = input) => {
    if (!query.trim() || loading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: query,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput("")
    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error("User not authenticated")
      }

      // Get business context
      const businessData = await aiService.getBusinessContext(user.id)
      
      // Analyze with AI
      const aiResponse = await aiService.analyzeWithGroq({
        query,
        businessData,
        context: "business_analysis"
      })

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: aiResponse.answer,
        timestamp: new Date(),
        insights: aiResponse.insights,
        recommendations: aiResponse.recommendations,
        data: aiResponse.data,
        confidence: aiResponse.confidence,
      }

      setMessages(prev => [...prev, aiMessage])
    } catch (error) {
      console.error("AI Chat error:", error)
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: "I'm having trouble analyzing your data right now. Please ensure your database is set up and try again.",
        timestamp: new Date(),
        confidence: 0,
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleQuickQuery = (query: string) => {
    handleSendMessage(query)
  }

  return (
    <div className="space-y-6">
      {/* Quick Queries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-cyan-600" />
            Quick AI Insights
          </CardTitle>
          <CardDescription>
            Get instant insights about your business with these common queries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {quickQueries.map((item, index) => (
              <Button
                key={index}
                variant="outline"
                onClick={() => handleQuickQuery(item.query)}
                disabled={loading}
                className="flex items-center gap-2 h-auto p-3 text-left justify-start"
              >
                <item.icon className="h-4 w-4 text-cyan-600 shrink-0" />
                <div className="flex flex-col items-start">
                  <span className="font-medium text-sm">{item.label}</span>
                  <span className="text-xs text-muted-foreground">{item.category}</span>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Chat Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-cyan-600" />
            AI Business Assistant
          </CardTitle>
          <CardDescription>
            Ask detailed questions about your business data and get AI-powered insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Messages */}
          <ScrollArea className="h-96 w-full border rounded-lg p-4 mb-4">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 text-cyan-600" />
                  <p className="text-sm">Start a conversation with your AI business assistant</p>
                  <p className="text-xs mt-1">Ask about sales, inventory, trends, or any business metrics</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] ${message.type === "user" ? "bg-primary text-primary-foreground" : "bg-muted"} rounded-lg p-3`}>
                      <div className="flex items-center gap-2 mb-1">
                        {message.type === "ai" && <Brain className="h-4 w-4 text-cyan-600" />}
                        <span className="text-xs text-muted-foreground">
                          {message.timestamp.toLocaleTimeString()}
                        </span>
                        {message.confidence !== undefined && (
                          <Badge variant="secondary" className="text-xs">
                            {message.confidence}% confidence
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm">{message.content}</p>
                      
                      {/* AI Insights */}
                      {message.insights && message.insights.length > 0 && (
                        <div className="mt-3 p-2 bg-cyan-50 dark:bg-cyan-950/20 rounded">
                          <h5 className="text-xs font-semibold text-cyan-700 dark:text-cyan-300 mb-1 flex items-center gap-1">
                            <Lightbulb className="h-3 w-3" />
                            Key Insights
                          </h5>
                          <ul className="text-xs space-y-1">
                            {message.insights.map((insight, idx) => (
                              <li key={idx} className="text-cyan-600 dark:text-cyan-400">• {insight}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* AI Recommendations */}
                      {message.recommendations && message.recommendations.length > 0 && (
                        <div className="mt-2 p-2 bg-green-50 dark:bg-green-950/20 rounded">
                          <h5 className="text-xs font-semibold text-green-700 dark:text-green-300 mb-1 flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            Recommendations
                          </h5>
                          <ul className="text-xs space-y-1">
                            {message.recommendations.map((rec, idx) => (
                              <li key={idx} className="text-green-600 dark:text-green-400">• {rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* Data Points */}
                      {message.data && message.data.length > 0 && (
                        <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded">
                          <h5 className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1 flex items-center gap-1">
                            <BarChart3 className="h-3 w-3" />
                            Key Metrics
                          </h5>
                          <div className="grid grid-cols-2 gap-2">
                            {message.data.map((item, idx) => (
                              <div key={idx} className="text-xs">
                                <div className="text-blue-600 dark:text-blue-400 font-medium">{item.label}</div>
                                <div className="text-blue-700 dark:text-blue-300">{item.value}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg p-3 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-cyan-600" />
                      <span className="text-sm text-muted-foreground">Analyzing your business data...</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="flex gap-2">
            <Textarea
              placeholder="Ask me anything about your business... e.g., 'How can I increase profit margins?' or 'Which products should I focus on?'"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              className="flex-1 min-h-[60px] resize-none"
              disabled={loading}
            />
            <Button onClick={() => handleSendMessage()} disabled={loading || !input.trim()}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground mt-2">
            💡 Pro tip: Be specific with your questions for better insights. Try asking about trends, comparisons, or specific time periods.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}