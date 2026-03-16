import { cookies } from "next/headers"
import { adminAuth, adminDb } from "./firebase-admin"
import type { Profile } from "./firestore"

export interface SessionUser {
  uid: string
  email: string
  role: string
  profile: Profile | null
}

/**
 * Server-side: Get the current user from the session cookie.
 * Use this in server components and server actions.
 */
export async function getServerUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("__session")?.value

    if (!sessionCookie) return null

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true)
    const userRecord = await adminAuth.getUser(decoded.uid)
    const role = (userRecord.customClaims?.role as string) || "user"

    // Get profile from Firestore via Admin SDK
    const profileDoc = await adminDb
      .collection("profiles")
      .doc(decoded.uid)
      .get()

    let profile: Profile | null = null
    if (profileDoc.exists) {
      const data = profileDoc.data()!
      profile = {
        id: profileDoc.id,
        email: data.email || userRecord.email || "",
        full_name: data.full_name || "",
        company_name: data.company_name || "",
        role: data.role || "user",
        subscription_tier: data.subscription_tier || "free",
        subscription_status: data.subscription_status || "active",
        subscription_expires_at: data.subscription_expires_at || null,
        created_at: data.created_at?.toDate?.()?.toISOString() || "",
        updated_at: data.updated_at?.toDate?.()?.toISOString() || "",
      }
    }

    return {
      uid: decoded.uid,
      email: userRecord.email || "",
      role,
      profile,
    }
  } catch {
    return null
  }
}

/**
 * Server-side: Check if the current user is an admin.
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getServerUser()
  return user?.role === "admin" || user?.profile?.role === "admin"
}
