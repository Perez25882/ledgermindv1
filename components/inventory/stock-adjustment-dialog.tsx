"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Minus } from "lucide-react"

interface InventoryItem {
  id: string
  name: string
  current_stock: number
}

interface StockAdjustmentDialogProps {
  item: InventoryItem
  action: "in" | "out"
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function StockAdjustmentDialog({ item, action, open, onOpenChange }: StockAdjustmentDialogProps) {
  const [quantity, setQuantity] = useState("")
  const [reason, setReason] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quantity || Number.parseInt(quantity) <= 0) return

    setIsLoading(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error("Not authenticated")

      const adjustmentQuantity = Number.parseInt(quantity)
      const newStock =
        action === "in" ? item.current_stock + adjustmentQuantity : Math.max(0, item.current_stock - adjustmentQuantity)

      // Update inventory item stock
      const { error: updateError } = await supabase
        .from("inventory_items")
        .update({
          current_stock: newStock,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id)

      if (updateError) throw updateError

      // Create stock movement record
      const { error: movementError } = await supabase.from("stock_movements").insert({
        user_id: user.id,
        item_id: item.id,
        movement_type: action,
        quantity: adjustmentQuantity,
        reason: reason || (action === "in" ? "Stock added" : "Stock removed"),
      })

      if (movementError) throw movementError

      onOpenChange(false)
      setQuantity("")
      setReason("")
      router.refresh()
    } catch (error) {
      console.error("Error adjusting stock:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const maxQuantity = action === "out" ? item.current_stock : undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {action === "in" ? (
              <Plus className="h-5 w-5 text-primary" />
            ) : (
              <Minus className="h-5 w-5 text-destructive" />
            )}
            {action === "in" ? "Add Stock" : "Remove Stock"}
          </DialogTitle>
          <DialogDescription>
            {action === "in"
              ? `Add stock to "${item.name}". Current stock: ${item.current_stock}`
              : `Remove stock from "${item.name}". Current stock: ${item.current_stock}`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={maxQuantity}
              placeholder="Enter quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
            {action === "out" && <p className="text-xs text-muted-foreground">Maximum: {item.current_stock} units</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              id="reason"
              placeholder="Enter reason for stock adjustment"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="bg-transparent">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !quantity}>
              {isLoading ? "Processing..." : `${action === "in" ? "Add" : "Remove"} Stock`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
