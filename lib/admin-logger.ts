import { adminDb } from "@/lib/firebase/firebase-admin"

export type LogAction = 
  | "USER_SIGNUP" 
  | "USER_LOGIN" 
  | "AI_TOOL_CALL" 
  | "INVENTORY_CREATED" 
  | "INVENTORY_UPDATED" 
  | "INVENTORY_DELETED" 
  | "SALE_RECORDED"
  | "ADMIN_ACTION"

export interface AdminLog {
  userId: string
  userEmail: string
  action: LogAction
  details: string
  metadata?: Record<string, any>
  createdAt: string
}

export async function logAdminEvent(
  userId: string,
  userEmail: string,
  action: LogAction,
  details: string,
  metadata?: Record<string, any>
) {
  try {
    const logEntry: AdminLog = {
      userId,
      userEmail,
      action,
      details,
      metadata: metadata || {},
      createdAt: new Date().toISOString(),
    }
    await adminDb.collection("admin_logs").add(logEntry)
  } catch (error) {
    console.error("Failed to write to admin_logs:", error)
  }
}
