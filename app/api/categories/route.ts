import { NextResponse, type NextRequest } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

async function getUserId(request: NextRequest): Promise<string | null> {
  const sessionCookie = request.cookies.get("__session")?.value
  if (!sessionCookie) return null
  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true)
    return decoded.uid
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const userId = await getUserId(request)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const snap = await adminDb
      .collection("categories")
      .where("user_id", "==", userId)
      .get()

    const categories = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      created_at: d.data().created_at?.toDate?.()?.toISOString() || null,
    }))

    return NextResponse.json({ data: categories })
  } catch (error) {
    console.error("Error fetching categories:", error)
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const userId = await getUserId(request)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { name, description } = await request.json()
    if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 })

    const ref = await adminDb.collection("categories").add({
      user_id: userId,
      name: name.trim(),
      description: description?.trim() || "",
      created_at: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ id: ref.id })
  } catch (error) {
    console.error("Error creating category:", error)
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const userId = await getUserId(request)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Category ID required" }, { status: 400 })

    const docRef = adminDb.collection("categories").doc(id)
    const docSnap = await docRef.get()
    if (!docSnap.exists || docSnap.data()?.user_id !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    await docRef.delete()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting category:", error)
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 })
  }
}
