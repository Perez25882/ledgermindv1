"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Brain, Zap, CheckCircle, AlertTriangle, Copy } from "lucide-react"
import { toast } from "sonner"

export function AISetupGuide() {
  const [apiKey, setApiKey] = useState("")
  const [testing, setTesting] = useState(false)
  const [isConfigured, setIsConfigured] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if GROQ API key is actually available at runtime
    const checkApiKey = () => {
      const hasApiKey = !!process.env.NEXT_PUBLIC_GROQ_API_KEY
      setIsConfigured(hasApiKey)
      setLoading(false)
    }
    checkApiKey()
  }, [])

  const testAPIKey = async () => {
    if (!apiKey.trim()) {
      toast.error("Please enter your GROQ API key")
      return
    }

    setTesting(true)
    try {
      const response = await fetch("https://api.groq.com/openai/v1/models", {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        toast.success("API key is valid!")
        setIsConfigured(true)
      } else {
        toast.error("Invalid API key. Please check and try again.")
      }
    } catch (error) {
      toast.error("Failed to test API key. Please check your connection.")
    } finally {
      setTesting(false)
    }
  }

  const copyEnvVar = () => {
    navigator.clipboard.writeText(`NEXT_PUBLIC_GROQ_API_KEY=${apiKey}`)
    toast.success("Environment variable copied to clipboard!")
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-16 bg-muted animate-pulse rounded"></div>
        <div className="h-32 bg-muted animate-pulse rounded"></div>
      </div>
    )
  }

  // If API is already configured, show success message
  if (isConfigured) {
    return (
      <div className="space-y-6">
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle>AI Enhanced! 🎉</AlertTitle>
          <AlertDescription>
            Your AI assistant is powered by advanced language models and can provide deeper insights about your business data.
            You can now ask complex questions and get intelligent analysis of your business metrics.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-green-600" />
              Enhanced AI Active
            </CardTitle>
            <CardDescription>
              Your AI assistant now has access to advanced capabilities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-green-600">✓ Available Features</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Natural language understanding</li>
                  <li>• Complex business analysis</li>
                  <li>• Predictive insights and forecasting</li>
                  <li>• Personalized recommendations</li>
                  <li>• Advanced pattern recognition</li>
                  <li>• Contextual business advice</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-cyan-600">💡 Try These Queries</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• "Analyze my profit margins"</li>
                  <li>• "Show me sales trends"</li>
                  <li>• "Which products should I focus on?"</li>
                  <li>• "How can I optimize inventory?"</li>
                  <li>• "Predict next month's revenue"</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show setup guide only if API is not configured
  return (
    <div className="space-y-6">
      <Alert className={isConfigured ? "border-green-500 bg-green-50 dark:bg-green-950/20" : "border-amber-500 bg-amber-50 dark:bg-amber-950/20"}>
        {isConfigured ? (
          <CheckCircle className="h-4 w-4 text-green-600" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-amber-600" />
        )}
        <AlertTitle>
          {isConfigured ? "AI Enhanced!" : "Enhance Your AI Experience"}
        </AlertTitle>
        <AlertDescription>
          {isConfigured ? (
            "Your AI assistant is powered by advanced language models and can provide deeper insights about your business data."
          ) : (
            "Currently using basic AI. Add a GROQ API key for enhanced AI capabilities including detailed analysis, predictions, and personalized recommendations."
          )}
        </AlertDescription>
      </Alert>

      {!isConfigured && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-cyan-600" />
              Setup Enhanced AI (Optional)
            </CardTitle>
            <CardDescription>
              Get access to advanced AI features with a free GROQ API key
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold">Step 1: Get Your Free GROQ API Key</h4>
                <div className="flex items-center gap-2">
                  <Button variant="outline" asChild>
                    <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Get API Key from GROQ
                    </a>
                  </Button>
                  <Badge variant="secondary">Free Tier Available</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  GROQ offers free API access with generous limits. Create an account and generate an API key.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Step 2: Test Your API Key</h4>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor="api-key">GROQ API Key</Label>
                    <Input
                      id="api-key"
                      type="password"
                      placeholder="gsk_..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                    />
                  </div>
                  <Button onClick={testAPIKey} disabled={testing} className="mt-6">
                    {testing ? "Testing..." : "Test Key"}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Step 3: Add to Environment Variables</h4>
                <p className="text-sm text-muted-foreground">
                  Add this line to your <code className="bg-muted px-1 rounded">.env.local</code> file:
                </p>
                <div className="flex items-center gap-2 p-2 bg-muted rounded font-mono text-sm">
                  <code className="flex-1">NEXT_PUBLIC_GROQ_API_KEY={apiKey || "your_api_key_here"}</code>
                  {apiKey && (
                    <Button size="sm" variant="ghost" onClick={copyEnvVar}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Restart your development server after adding the environment variable.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-600" />
            Enhanced AI Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-green-600">✓ Basic AI (Current)</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Simple keyword-based queries</li>
                <li>• Basic sales and inventory summaries</li>
                <li>• Predefined insights</li>
                <li>• Limited pattern recognition</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className={`font-semibold ${isConfigured ? "text-green-600" : "text-cyan-600"}`}>
                {isConfigured ? "✓" : "⚡"} Enhanced AI {isConfigured ? "(Active)" : "(With GROQ)"}
              </h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Natural language understanding</li>
                <li>• Complex business analysis</li>
                <li>• Predictive insights and forecasting</li>
                <li>• Personalized recommendations</li>
                <li>• Advanced pattern recognition</li>
                <li>• Contextual business advice</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center text-sm text-muted-foreground">
        <p>💡 Even without enhanced AI, LedgerMind provides powerful business insights and analytics.</p>
      </div>
    </div>
  )
}