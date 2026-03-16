import { getServerUser, isAdmin } from "@/lib/firebase/server-auth"
import { adminDb } from "@/lib/firebase/firebase-admin"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { redirect } from "next/navigation"

export default async function AdminLogsPage() {
  const user = await getServerUser()
  const adminOk = await isAdmin()

  if (!user || !adminOk) {
    redirect("/dashboard")
  }

  let logs: any[] = []

  try {
    const logsSnap = await adminDb
      .collection("admin_logs")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get()

    logs = logsSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }))
  } catch (error) {
    console.error("Failed to fetch admin logs:", error)
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
          <CardDescription>Recent events across the platform (showing last 100)</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length > 0 ? (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] font-mono whitespace-nowrap">
                        {log.action}
                      </Badge>
                      <span className="text-sm font-medium">{log.userEmail}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{log.details}</p>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <pre className="text-[10px] text-muted-foreground bg-muted p-2 rounded mt-2 overflow-x-auto max-w-full">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0 sm:text-right">
                    {new Date(log.createdAt).toLocaleString()}
                    <br />
                    <span className="font-mono text-[10px] opacity-70">UID: {log.userId.slice(0, 8)}...</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 border rounded-lg border-dashed text-center p-8 bg-muted/10">
              <h3 className="font-semibold text-lg text-muted-foreground mb-2">No logs recorded</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                No system events have been recorded yet. Activity will appear here automatically.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
