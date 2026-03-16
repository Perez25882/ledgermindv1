import { NextResponse, type NextRequest } from "next/server"
import { adminAuth } from "@/lib/firebase/firebase-admin"

/**
 * POST /api/auth/session
 * Sets Firebase ID token as a secure HTTP-only session cookie.
 */
export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json()

    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid idToken" },
        { status: 400 }
      )
    }

    // Verify the ID token
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    if (!decodedToken) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Create a session cookie (5 days expiry)
    const expiresIn = 60 * 60 * 24 * 5 * 1000 // 5 days in ms
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn,
    })

    const response = NextResponse.json({ status: "success" })

    response.cookies.set("__session", sessionCookie, {
      maxAge: expiresIn / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    })

    return response
  } catch (error) {
    console.error("Session creation error:", error)
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/auth/session
 * Clears the session cookie.
 */
export async function DELETE() {
  const response = NextResponse.json({ status: "success" })

  response.cookies.set("__session", "", {
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  })

  return response
}
