"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { MoreHorizontal, Edit, Trash2, Plus, Minus } from "lucide-react"
import { StockAdjustmentDialog } from "./stock-adjustment-dialog"

interface InventoryItem {
  id: string
  name: string
  current_stock: number
  unit_price: number
}

interface InventoryActionsProps {
  item: InventoryItem
}

export function InventoryActions({ item }: InventoryActionsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showStockDialog, setShowStockDialog] = useState(false)
  const [stockAction, setStockAction] = useState<"in" | "out">("in")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("inventory_items").delete().eq("id", item.id)

      if (error) throw error

      router.refresh()
    } catch (error) {
      console.error("Error deleting item:", error)
    } finally {
      setIsLoading(false)
      setShowDeleteDialog(false)
    }
  }

  const handleStockAdjustment = (type: "in" | "out") => {
    setStockAction(type)
    setShowStockDialog(true)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleStockAdjustment("in")}>
            <Plus className="mr-2 h-4 w-4" />
            Add Stock
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleStockAdjustment("out")}>
            <Minus className="mr-2 h-4 w-4" />
            Remove Stock
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Edit className="mr-2 h-4 w-4" />
            Edit Item
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Item
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <StockAdjustmentDialog
        item={item}
        action={stockAction}
        open={showStockDialog}
        onOpenChange={setShowStockDialog}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the item "{item.name}" and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
