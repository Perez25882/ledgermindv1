import { Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { ReportsContent } from "@/components/reports/reports-content"

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Analytics & Reports</h1>
          <p className="text-muted-foreground">Advanced insights and forecasting powered by artificial intelligence</p>
        </div>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Export Reports
        </Button>
      </div>

      <Suspense fallback={<div>Loading reports...</div>}>
        <ReportsContent />
      </Suspense>
    </div>
  )
}
