"use server"

import { getServerUser, isAdmin } from "@/lib/firebase/server-auth"
import { adminAuth, adminDb } from "@/lib/firebase/firebase-admin"
import { logAdminEvent } from "@/lib/admin-logger"
import { revalidatePath } from "next/cache"

async function verifyAdmin() {
  const user = await getServerUser()
  const isUserAdmin = await isAdmin()
  if (!user || !isUserAdmin) {
    throw new Error("Unauthorized")
  }
  return user
}

export async function toggleUserStatus(targetUid: string, disabled: boolean) {
  try {
    const adminUser = await verifyAdmin()
    if (adminUser.uid === targetUid) throw new Error("Cannot disable your own account.")

    await adminAuth.updateUser(targetUid, { disabled })
    const targetInfo = await adminAuth.getUser(targetUid)
    
    await logAdminEvent(
      adminUser.uid,
      adminUser.email || "System",
      "ADMIN_ACTION",
      `${disabled ? 'Disabled' : 'Enabled'} user account: ${targetInfo.email}`,
      { targetUid, action: disabled ? "disable" : "enable" }
    )

    revalidatePath("/dashboard/users")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateUserRole(targetUid: string, makeAdmin: boolean) {
  try {
    const adminUser = await verifyAdmin()
    if (adminUser.uid === targetUid) throw new Error("Cannot change your own role.")

    // Update custom claims
    await adminAuth.setCustomUserClaims(targetUid, { role: makeAdmin ? "admin" : "user" })
    
    // Also update profile doc if it exists
    await adminDb.collection("profiles").doc(targetUid).set({
      role: makeAdmin ? "admin" : "user"
    }, { merge: true })

    const targetInfo = await adminAuth.getUser(targetUid)

    await logAdminEvent(
      adminUser.uid,
      adminUser.email || "System",
      "ADMIN_ACTION",
      `Changed user role to ${makeAdmin ? 'Admin' : 'User'}: ${targetInfo.email}`,
      { targetUid, makeAdmin }
    )

    revalidatePath("/dashboard/users")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateUserTier(targetUid: string, tier: "free" | "pro" | "enterprise") {
  try {
    const adminUser = await verifyAdmin()

    await adminDb.collection("profiles").doc(targetUid).set({
      subscription_tier: tier
    }, { merge: true })

    const targetInfo = await adminAuth.getUser(targetUid)

    await logAdminEvent(
      adminUser.uid,
      adminUser.email || "System",
      "ADMIN_ACTION",
      `Updated subscription tier to ${tier.toUpperCase()}: ${targetInfo.email}`,
      { targetUid, tier }
    )

    revalidatePath("/dashboard/users")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteUserAccount(targetUid: string) {
  try {
    const adminUser = await verifyAdmin()
    if (adminUser.uid === targetUid) throw new Error("Cannot delete your own account.")

    const targetInfo = await adminAuth.getUser(targetUid)

    // Delete Auth User
    await adminAuth.deleteUser(targetUid)
    
    // Cleanup Profile
    await adminDb.collection("profiles").doc(targetUid).delete()

    await logAdminEvent(
      adminUser.uid,
      adminUser.email || "System",
      "ADMIN_ACTION",
      `Deleted user account: ${targetInfo.email}`,
      { targetUid }
    )

    revalidatePath("/dashboard/users")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
