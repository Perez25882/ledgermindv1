import { getServerUser, isAdmin } from "@/lib/firebase/server-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { redirect } from "next/navigation"

export default async function AdminLogsPage() {
  const user = await getServerUser()
  const adminOk = await isAdmin()

  if (!user || !adminOk) {
    redirect("/dashboard")
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Audit Logs</h1>
        <p className="text-muted-foreground">
          System-wide activity, security events, and data changes
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Activity</CardTitle>
          <CardDescription>Recent events across the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 border rounded-lg border-dashed text-center p-8 bg-muted/10">
            <h3 className="font-semibold text-lg text-muted-foreground mb-2">No logs recorded</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Event logging is currently not tracking client-side operations. This module is reserved for backend Cloud Function audit trails.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
