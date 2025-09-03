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
import { MoreHorizontal, Eye, Edit, Trash2, RefreshCw, X } from "lucide-react"
import { SaleDetailsDialog } from "./sale-details-dialog"

interface Sale {
  id: string
  customer_name?: string
  total_amount: number
  status: string
  created_at: string
  sale_items?: any[]
}

interface SalesActionsProps {
  sale: Sale
}

export function SalesActions({ sale }: SalesActionsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleStatusUpdate = async (newStatus: string) => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("sales").update({ status: newStatus }).eq("id", sale.id)

      if (error) throw error

      router.refresh()
    } catch (error) {
      console.error("Error updating sale status:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()

      // Delete sale items first (due to foreign key constraint)
      await supabase.from("sale_items").delete().eq("sale_id", sale.id)

      // Then delete the sale
      const { error } = await supabase.from("sales").delete().eq("id", sale.id)

      if (error) throw error

      router.refresh()
    } catch (error) {
      console.error("Error deleting sale:", error)
    } finally {
      setIsLoading(false)
      setShowDeleteDialog(false)
    }
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
          <DropdownMenuItem onClick={() => setShowDetailsDialog(true)}>
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {sale.status !== "completed" && (
            <DropdownMenuItem onClick={() => handleStatusUpdate("completed")}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Mark Completed
            </DropdownMenuItem>
          )}
          {sale.status !== "cancelled" && (
            <DropdownMenuItem onClick={() => handleStatusUpdate("cancelled")}>
              <X className="mr-2 h-4 w-4" />
              Cancel Sale
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Edit className="mr-2 h-4 w-4" />
            Edit Sale
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Sale
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SaleDetailsDialog sale={sale} open={showDetailsDialog} onOpenChange={setShowDetailsDialog} />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the sale and all associated data. Note: This
              will not restore inventory levels.
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
