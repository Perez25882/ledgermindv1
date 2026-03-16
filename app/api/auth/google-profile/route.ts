import { NextResponse, type NextRequest } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase/firebase-admin"

/**
 * POST /api/auth/google-profile
 * Creates a Firestore profile for Google sign-in users if one doesn't exist.
 */
export async function POST(request: NextRequest) {
  try {
    const { idToken, fullName, email } = await request.json()

    if (!idToken) {
      return NextResponse.json({ error: "Missing idToken" }, { status: 400 })
    }

    // Verify the token
    const decoded = await adminAuth.verifyIdToken(idToken)
    const uid = decoded.uid

    // Check if profile already exists
    const profileDoc = await adminDb.collection("profiles").doc(uid).get()

    if (!profileDoc.exists) {
      // Create profile for first-time Google users
      await adminDb.collection("profiles").doc(uid).set({
        email: email || decoded.email || "",
        full_name: fullName || decoded.name || "",
        company_name: "",
        role: "user",
        subscription_tier: "free",
        subscription_status: "active",
        subscription_expires_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Google profile creation error:", error)
    return NextResponse.json({ error: "Failed to create profile" }, { status: 500 })
  }
}
