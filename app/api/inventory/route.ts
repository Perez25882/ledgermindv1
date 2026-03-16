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

/**
 * GET /api/inventory — List all inventory items
 */
export async function GET(request: NextRequest) {
  const userId = await getUserId(request)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const snap = await adminDb
      .collection("inventory_items")
      .where("user_id", "==", userId)
      .get()

    const categoriesSnap = await adminDb
      .collection("categories")
      .where("user_id", "==", userId)
      .get()

    const categoryMap = new Map<string, string>()
    categoriesSnap.docs.forEach((d) => categoryMap.set(d.id, d.data().name))

    const items = snap.docs.map((d) => {
      const data = d.data()
      return {
        id: d.id,
        ...data,
        created_at: data.created_at?.toDate?.()?.toISOString() || null,
        updated_at: data.updated_at?.toDate?.()?.toISOString() || null,
        categories: data.category_id
          ? { id: data.category_id, name: categoryMap.get(data.category_id) || "Uncategorized" }
          : null,
      }
    })

    return NextResponse.json({ data: items })
  } catch (error) {
    console.error("Error fetching inventory:", error)
    return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 })
  }
}

/**
 * POST /api/inventory — Create a new inventory item
 */
export async function POST(request: NextRequest) {
  const userId = await getUserId(request)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json()
    const { name, description, sku, category_id, current_stock, min_stock_level, unit_price, cost_price, supplier } = body

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const ref = await adminDb.collection("inventory_items").add({
      user_id: userId,
      name: name.trim(),
      description: description?.trim() || "",
      sku: sku?.trim() || "",
      category_id: category_id || null,
      current_stock: Number(current_stock) || 0,
      min_stock_level: Number(min_stock_level) || 0,
      unit_price: Number(unit_price) || 0,
      cost_price: Number(cost_price) || 0,
      supplier: supplier?.trim() || "",
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ id: ref.id })
  } catch (error) {
    console.error("Error creating inventory item:", error)
    return NextResponse.json({ error: "Failed to create item" }, { status: 500 })
  }
}

/**
 * PUT /api/inventory — Update an inventory item
 */
export async function PUT(request: NextRequest) {
  const userId = await getUserId(request)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) return NextResponse.json({ error: "Item ID is required" }, { status: 400 })

    // Check ownership
    const docRef = adminDb.collection("inventory_items").doc(id)
    const docSnap = await docRef.get()
    if (!docSnap.exists || docSnap.data()?.user_id !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    await docRef.update({ ...updates, updated_at: FieldValue.serverTimestamp() })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating inventory item:", error)
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 })
  }
}

/**
 * DELETE /api/inventory — Delete an inventory item
 */
export async function DELETE(request: NextRequest) {
  const userId = await getUserId(request)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Item ID is required" }, { status: 400 })

    const docRef = adminDb.collection("inventory_items").doc(id)
    const docSnap = await docRef.get()
    if (!docSnap.exists || docSnap.data()?.user_id !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    await docRef.delete()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting inventory item:", error)
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 })
  }
}
