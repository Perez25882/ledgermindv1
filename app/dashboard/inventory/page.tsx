import { redirect } from "next/navigation"
import { getServerUser } from "@/lib/firebase/server-auth"
import { adminDb } from "@/lib/firebase/firebase-admin"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Search, Package, AlertTriangle, Filter } from "lucide-react"
import Link from "next/link"
import { InventoryActions } from "@/components/inventory/inventory-actions"
import { AddItemDialog } from "@/components/inventory/add-item-dialog"

export default async function InventoryPage() {
  const user = await getServerUser()
  if (!user) redirect("/auth/login")

  const userId = user.uid

  // Get inventory items and categories from Firestore (no orderBy to avoid composite index)
  const [inventorySnap, categoriesSnap] = await Promise.all([
    adminDb
      .collection("inventory_items")
      .where("user_id", "==", userId)
      .get(),
    adminDb
      .collection("categories")
      .where("user_id", "==", userId)
      .get(),
  ])

  const categories = categoriesSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Array<{
    id: string
    name: string
    description?: string
  }>

  const categoryMap = new Map<string, string>()
  categories.forEach((c) => categoryMap.set(c.id, c.name))

  const inventoryItems = inventorySnap.docs.map((d) => {
    const data = d.data()
    return {
      id: d.id,
      ...data,
      categories: data.category_id
        ? { id: data.category_id, name: categoryMap.get(data.category_id) || "Uncategorized" }
        : null,
    }
  }) as Array<Record<string, unknown>>

  const totalItems = inventoryItems.length
  const lowStockItems = inventoryItems.filter(
    (item) =>
      (item.current_stock as number) <= (item.min_stock_level as number) &&
      (item.min_stock_level as number) > 0
  ).length
  const totalValue = inventoryItems.reduce(
    (sum, item) => sum + (item.current_stock as number) * (item.unit_price as number),
    0
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Inventory Management</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Track and manage your inventory items</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/inventory/categories">
            <Button variant="outline" className="bg-transparent" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Categories
            </Button>
          </Link>
          <AddItemDialog categories={categories} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
            <p className="text-xs text-muted-foreground">Products in inventory</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{lowStockItems}</div>
            <p className="text-xs text-muted-foreground">Items need restocking</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Current inventory value</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inventory Items</CardTitle>
          <CardDescription>Manage your inventory items and stock levels</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search items..." className="pl-10" />
            </div>
          </div>

          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="min-w-[800px] sm:min-w-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Min Level</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Total Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventoryItems.length > 0 ? (
                  inventoryItems.map((item) => {
                    const isLowStock =
                      (item.current_stock as number) <= (item.min_stock_level as number) &&
                      (item.min_stock_level as number) > 0
                    const itemValue = (item.current_stock as number) * (item.unit_price as number)

                    return (
                      <TableRow key={item.id as string}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.name as string}</div>
                            {item.description && (
                              <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                                {item.description as string}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {(item.categories as Record<string, unknown>) ? (
                            <Badge variant="secondary">
                              {(item.categories as Record<string, unknown>).name as string}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">
                            {(item.sku as string) || "-"}
                          </code>
                        </TableCell>
                        <TableCell>
                          <span className={isLowStock ? "text-destructive font-medium" : ""}>
                            {item.current_stock as number}
                          </span>
                        </TableCell>
                        <TableCell>{(item.min_stock_level as number) || "-"}</TableCell>
                        <TableCell>${(item.unit_price as number).toFixed(2)}</TableCell>
                        <TableCell>${itemValue.toFixed(2)}</TableCell>
                        <TableCell>
                          {isLowStock ? (
                            <Badge variant="destructive">Low Stock</Badge>
                          ) : (item.current_stock as number) === 0 ? (
                            <Badge variant="destructive">Out of Stock</Badge>
                          ) : (
                            <Badge variant="secondary">In Stock</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <InventoryActions
                            item={{
                              id: item.id as string,
                              name: item.name as string,
                              current_stock: item.current_stock as number,
                              unit_price: item.unit_price as number,
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Package className="h-12 w-12 text-muted-foreground" />
                        <p className="text-muted-foreground">No inventory items found</p>
                        <p className="text-sm text-muted-foreground">Add your first item to get started</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
