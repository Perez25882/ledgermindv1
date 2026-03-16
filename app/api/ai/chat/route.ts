import { NextResponse, type NextRequest } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { aiService } from "@/lib/ai-service"
import { logAdminEvent } from "@/lib/admin-logger"

/**
 * POST /api/ai/chat
 * Ledmi AI chat endpoint. Loads user business data and sends to Kimi.
 * Also persists conversation history to Firestore for memory.
 */
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("__session")?.value
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let userId: string
    let userEmail: string = "Unknown"
    try {
      const decoded = await adminAuth.verifySessionCookie(sessionCookie, true)
      userId = decoded.uid
      const userRecord = await adminAuth.getUser(userId)
      userEmail = userRecord.email || "Unknown"
    } catch {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    const body = await request.json()
    const { query, conversationHistory } = body

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 })
    }

    if (query.length > 2000) {
      return NextResponse.json({ error: "Query too long (max 2000 characters)" }, { status: 400 })
    }

    // Load business data from Firestore — no orderBy to avoid composite index
    const [inventorySnap, salesSnap, stockMovementsSnap, categoriesSnap] =
      await Promise.all([
        adminDb
          .collection("inventory_items")
          .where("user_id", "==", userId)
          .limit(200)
          .get(),
        adminDb
          .collection("sales")
          .where("user_id", "==", userId)
          .limit(100)
          .get(),
        adminDb
          .collection("stock_movements")
          .where("user_id", "==", userId)
          .limit(50)
          .get(),
        adminDb
          .collection("categories")
          .where("user_id", "==", userId)
          .get(),
      ])

    const businessData = {
      inventory: inventorySnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      sales: salesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      stockMovements: stockMovementsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      categories: categoriesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    }

    let aiResponse = await aiService.analyze({
      query: query.trim(),
      businessData,
      conversationHistory: Array.isArray(conversationHistory)
        ? conversationHistory.slice(-10)
        : undefined,
    })

    let dataRefresh = false

    // Handle tool calls (Function Calling)
    if (aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
      const toolMessages: any[] = []

      for (const toolCall of aiResponse.toolCalls) {
        let resultString = ""
        try {
          const args = JSON.parse(toolCall.function.arguments)

          if (toolCall.function.name === "add_inventory_item") {
            // Find or create category
            let categoryId = ""
            if (args.category_name && args.category_name !== "Uncategorized") {
              const catObj = businessData.categories.find((c) => (c.name as string).toLowerCase() === args.category_name.toLowerCase())
              if (catObj) {
                categoryId = catObj.id as string
              } else {
                const catRef = await adminDb.collection("categories").add({
                  name: args.category_name,
                  user_id: userId,
                  created_at: new Date().toISOString()
                })
                categoryId = catRef.id
              }
            }

            const docRef = await adminDb.collection("inventory_items").add({
              name: args.name,
              current_stock: Number(args.current_stock),
              unit_price: Number(args.unit_price),
              min_stock_level: Number(args.min_stock_level || 10),
              category_id: categoryId,
              user_id: userId,
              status: "active",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            resultString = `Success: Item "${args.name}" added to inventory with ID ${docRef.id}.`
            dataRefresh = true

            await logAdminEvent(
              userId,
              userEmail,
              "AI_TOOL_CALL",
              `Ledmi added new item: ${args.name}`,
              { item_id: docRef.id, tool: "add_inventory_item", args }
            )

          } else if (toolCall.function.name === "update_stock_quantity") {
            const itemMatch = businessData.inventory.find(i => 
              (i.name as string).toLowerCase().includes(args.item_name.toLowerCase())
            )

            if (itemMatch) {
              const qtyChange = Number(args.quantity_change)
              await adminDb.collection("inventory_items").doc(itemMatch.id as string).update({
                current_stock: FieldValue.increment(qtyChange),
                updated_at: new Date().toISOString()
              })

              await adminDb.collection("stock_movements").add({
                item_id: itemMatch.id,
                user_id: userId,
                quantity: Math.abs(qtyChange),
                type: qtyChange > 0 ? "in" : "out",
                reason: "AI Assistant Update",
                created_at: new Date().toISOString()
              })
              resultString = `Success: Updated stock for "${itemMatch.name}". Changed by ${qtyChange}.`
              dataRefresh = true

              await logAdminEvent(
                userId,
                userEmail,
                "AI_TOOL_CALL",
                `Ledmi updated stock for: ${itemMatch.name}`,
                { item_id: itemMatch.id, delta: qtyChange, tool: "update_stock_quantity", args }
              )
            } else {
              resultString = `Error: Could not find any item matching "${args.item_name}" in inventory.`
            }
          } else {
            resultString = `Error: Unknown function ${toolCall.function.name}`
          }
        } catch (e: any) {
          resultString = `Error executing tool: ${e.message}`
        }

        toolMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          content: resultString
        })
      }

      // Call Kimi again with the tool results
      const newHistory = [
        ...(Array.isArray(conversationHistory) ? conversationHistory.slice(-10) : []),
        { role: "user", content: query.trim() },
        aiResponse.assistantMessage,
        ...toolMessages
      ]

      aiResponse = await aiService.analyze({
        query: "",
        businessData,
        conversationHistory: newHistory
      })
    }

    const finalAnswer = aiResponse.answer || "I completed the action but didn't generate a response."

    // Save conversation to Firestore for memory (fire-and-forget)
    const conversationRef = adminDb.collection("ledmi_conversations").doc(userId)
    conversationRef.set({
      user_id: userId,
      messages: [
        ...(Array.isArray(conversationHistory) ? conversationHistory.slice(-18) : []),
        { role: "user", content: query.trim(), timestamp: new Date().toISOString() },
        { role: "assistant", content: finalAnswer, timestamp: new Date().toISOString() },
      ],
      updated_at: new Date(),
    }).catch((err) => console.error("Failed to save conversation:", err))

    return NextResponse.json({ answer: finalAnswer, dataRefresh })
  } catch (error) {
    console.error("Ledmi chat API error:", error)
    return NextResponse.json(
      {
        answer:
          "Oops, I ran into an issue trying to get your data. Could you try again? If this keeps happening, let the team know! 🛠️",
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/ai/chat
 * Load previous conversation history for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("__session")?.value
    if (!sessionCookie) {
      return NextResponse.json({ messages: [] })
    }

    let userId: string
    try {
      const decoded = await adminAuth.verifySessionCookie(sessionCookie, true)
      userId = decoded.uid
    } catch {
      return NextResponse.json({ messages: [] })
    }

    const doc = await adminDb.collection("ledmi_conversations").doc(userId).get()
    if (!doc.exists) {
      return NextResponse.json({ messages: [] })
    }

    return NextResponse.json({ messages: doc.data()?.messages || [] })
  } catch {
    return NextResponse.json({ messages: [] })
  }
}
