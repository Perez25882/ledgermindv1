"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Database, ExternalLink, CheckCircle } from "lucide-react"

export function SetupGuide() {
  const steps = [
    {
      title: "Create Supabase Project",
      description: "Go to supabase.com and create a free account, then create a new project.",
      action: "https://supabase.com",
      completed: false
    },
    {
      title: "Set Up Database Schema",
      description: "In your Supabase dashboard, go to SQL Editor and run the scripts from the scripts/ folder.",
      action: "/scripts/001_create_tables.sql",
      completed: false
    },
    {
      title: "Configure Environment Variables", 
      description: "Update your .env.local file with your actual Supabase project URL and keys.",
      action: "/.env.local",
      completed: false
    }
  ]

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Alert>
        <Database className="h-4 w-4" />
        <AlertTitle>Welcome to LedgerMind!</AlertTitle>
        <AlertDescription>
          Your application is running, but you need to complete the Supabase database setup to access all features.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Quick Setup Guide
          </CardTitle>
          <CardDescription>
            Follow these steps to get your inventory management system fully functional.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {steps.map((step, index) => (
            <div key={index} className="flex items-start gap-4 p-4 border rounded-lg">
              <div className="flex-shrink-0 mt-1">
                {step.completed ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Step {index + 1}: {step.title}</h3>
                <p className="text-sm text-muted-foreground mb-3">{step.description}</p>
                {step.action.startsWith('http') ? (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => window.open(step.action, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Supabase
                  </Button>
                ) : (
                  <Button size="sm" variant="outline">
                    View File: {step.action}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Features Available After Setup</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold">Core Features</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Inventory Management</li>
                <li>• Sales Tracking</li>
                <li>• Category Organization</li>
                <li>• Stock Level Monitoring</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Advanced Features</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• AI-Powered Analytics</li>
                <li>• Business Insights</li>
                <li>• Sales Forecasting</li>
                <li>• Natural Language Queries</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}