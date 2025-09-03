import { AISetupGuide } from "@/components/ai-setup-guide"
import { AIChat } from "@/components/ai-chat"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Brain, Settings } from "lucide-react"

export default function AIInsightsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Brain className="h-8 w-8 text-primary" />
          AI Business Assistant
        </h1>
        <p className="text-muted-foreground">
          Get intelligent insights, recommendations, and answers about your business using advanced AI
        </p>
      </div>

      {/* Tabs for AI Chat and Setup */}
      <Tabs defaultValue="chat" className="space-y-4">
        <TabsList>
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Assistant
          </TabsTrigger>
          <TabsTrigger value="setup" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            AI Configuration
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat">
          <AIChat />
        </TabsContent>

        <TabsContent value="setup">
          <AISetupGuide />
        </TabsContent>
      </Tabs>
    </div>
  )
}
