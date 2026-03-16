import { NextResponse, type NextRequest } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { logAdminEvent } from "@/lib/admin-logger"

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
      .collection("sales")
      .where("user_id", "==", userId)
      .get()

    const sales = await Promise.all(
      snap.docs.map(async (d) => {
        const data = d.data()
        // Get sale items
        const saleItemsSnap = await adminDb
          .collection("sale_items")
          .where("sale_id", "==", d.id)
          .get()

        const saleItems = await Promise.all(
          saleItemsSnap.docs.map(async (si) => {
            const siData = si.data()
            // Get inventory item name
            let itemName = "Unknown Item"
            let itemSku = ""
            if (siData.item_id) {
              const itemDoc = await adminDb.collection("inventory_items").doc(siData.item_id).get()
              if (itemDoc.exists) {
                itemName = itemDoc.data()?.name || "Unknown Item"
                itemSku = itemDoc.data()?.sku || ""
              }
            }
            return {
              id: si.id,
              ...siData,
              created_at: siData.created_at?.toDate?.()?.toISOString() || null,
              inventory_items: { name: itemName, sku: itemSku },
            }
          })
        )

        return {
          id: d.id,
          ...data,
          created_at: data.created_at?.toDate?.()?.toISOString() || null,
          sale_items: saleItems,
        }
      })
    )

    return NextResponse.json({ data: sales })
  } catch (error) {
    console.error("Error fetching sales:", error)
    return NextResponse.json({ error: "Failed to fetch sales" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const userId = await getUserId(request)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json()
    const { customer_name, customer_email, payment_method, notes, items } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "At least one item is required" }, { status: 400 })
    }

    // Calculate total
    const totalAmount = items.reduce(
      (sum: number, item: { quantity: number; unit_price: number }) =>
        sum + item.quantity * item.unit_price,
      0
    )

    // Create sale
    const saleRef = await adminDb.collection("sales").add({
      user_id: userId,
      customer_name: customer_name?.trim() || "",
      customer_email: customer_email?.trim() || "",
      total_amount: totalAmount,
      payment_method: payment_method || "Cash",
      status: "completed",
      notes: notes?.trim() || "",
      created_at: FieldValue.serverTimestamp(),
    })

    // Create sale items and update inventory
    const batch = adminDb.batch()
    for (const item of items) {
      const saleItemRef = adminDb.collection("sale_items").doc()
      batch.set(saleItemRef, {
        sale_id: saleRef.id,
        item_id: item.item_id,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        total_price: Number(item.quantity) * Number(item.unit_price),
        created_at: FieldValue.serverTimestamp(),
      })

      // Update stock
      const inventoryRef = adminDb.collection("inventory_items").doc(item.item_id)
      batch.update(inventoryRef, {
        current_stock: FieldValue.increment(-Number(item.quantity)),
        updated_at: FieldValue.serverTimestamp(),
      })

      // Record stock movement
      const movementRef = adminDb.collection("stock_movements").doc()
      batch.set(movementRef, {
        user_id: userId,
        item_id: item.item_id,
        movement_type: "out",
        quantity: Number(item.quantity),
        reason: `Sale #${saleRef.id.slice(0, 8)}`,
        reference_id: saleRef.id,
        created_at: FieldValue.serverTimestamp(),
      })
    }

    await batch.commit()

    const userRecord = await adminAuth.getUser(userId)
    const userEmail = userRecord.email || "Unknown"

    await logAdminEvent(
      userId,
      userEmail,
      "SALE_RECORDED",
      `Recorded a new sale for $${totalAmount}`,
      { sale_id: saleRef.id, total_amount: totalAmount, items_count: items.length }
    )

    return NextResponse.json({ id: saleRef.id })
  } catch (error) {
    console.error("Error creating sale:", error)
    return NextResponse.json({ error: "Failed to create sale" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const userId = await getUserId(request)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json()
    const { id, status } = body

    if (!id) return NextResponse.json({ error: "Sale ID required" }, { status: 400 })

    const docRef = adminDb.collection("sales").doc(id)
    const docSnap = await docRef.get()
    if (!docSnap.exists || docSnap.data()?.user_id !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    await docRef.update({ status })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating sale:", error)
    return NextResponse.json({ error: "Failed to update sale" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const userId = await getUserId(request)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Sale ID required" }, { status: 400 })

    const docRef = adminDb.collection("sales").doc(id)
    const docSnap = await docRef.get()
    if (!docSnap.exists || docSnap.data()?.user_id !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    await docRef.delete()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting sale:", error)
    return NextResponse.json({ error: "Failed to delete sale" }, { status: 500 })
  }
}
