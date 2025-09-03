import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Search, ShoppingCart, DollarSign, TrendingUp, Calendar } from "lucide-react"
import { CreateSaleDialog } from "@/components/sales/create-sale-dialog"
import { SalesActions } from "@/components/sales/sales-actions"

export default async function SalesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  // Get sales with sale items and inventory details
  const { data: sales } = await supabase
    .from("sales")
    .select(`
      *,
      sale_items (
        *,
        inventory_items (
          name,
          sku
        )
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  // Get inventory items for the create sale form
  const { data: inventoryItems } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("user_id", user.id)
    .gt("current_stock", 0)
    .order("name")

  // Calculate stats
  const totalSales = sales?.length || 0
  const totalRevenue = sales?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0
  const todaysSales =
    sales?.filter((sale) => {
      const saleDate = new Date(sale.created_at).toDateString()
      const today = new Date().toDateString()
      return saleDate === today
    }).length || 0
  const avgSaleValue = totalSales > 0 ? totalRevenue / totalSales : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sales Tracking</h1>
          <p className="text-muted-foreground">Record and manage your sales transactions</p>
        </div>
        <CreateSaleDialog inventoryItems={inventoryItems || []} />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSales}</div>
            <p className="text-xs text-muted-foreground">All time transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Total earnings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todaysSales}</div>
            <p className="text-xs text-muted-foreground">Sales today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Sale Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${avgSaleValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Per transaction</p>
          </CardContent>
        </Card>
      </div>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Transactions</CardTitle>
          <CardDescription>View and manage all your sales transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search sales..." className="pl-10" />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sale ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales && sales.length > 0 ? (
                  sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">{sale.id.slice(0, 8)}</code>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{sale.customer_name || "Walk-in Customer"}</div>
                          {sale.customer_email && (
                            <div className="text-sm text-muted-foreground">{sale.customer_email}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {sale.sale_items?.map((item, index) => (
                            <div key={index} className="text-sm">
                              <span className="font-medium">{item.inventory_items?.name}</span>
                              <span className="text-muted-foreground ml-1">x{item.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">${sale.total_amount.toFixed(2)}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{sale.payment_method || "Cash"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            sale.status === "completed"
                              ? "default"
                              : sale.status === "pending"
                                ? "secondary"
                                : sale.status === "cancelled"
                                  ? "destructive"
                                  : "secondary"
                          }
                        >
                          {sale.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{new Date(sale.created_at).toLocaleDateString()}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(sale.created_at).toLocaleTimeString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <SalesActions sale={sale} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <ShoppingCart className="h-12 w-12 text-muted-foreground" />
                        <p className="text-muted-foreground">No sales found</p>
                        <p className="text-sm text-muted-foreground">Record your first sale to get started</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
