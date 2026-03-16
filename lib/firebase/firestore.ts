import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  type DocumentData,
  type QueryConstraint,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore"
import { db } from "./firebase"

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface Profile {
  id: string
  email: string
  full_name: string
  company_name: string
  role: "user" | "admin"
  subscription_tier: "free" | "pro" | "enterprise"
  subscription_status: "active" | "cancelled" | "expired"
  subscription_expires_at: string | null
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  user_id: string
  name: string
  description: string
  created_at: string
}

export interface InventoryItem {
  id: string
  user_id: string
  category_id: string | null
  name: string
  description: string
  sku: string
  current_stock: number
  min_stock_level: number
  unit_price: number
  cost_price: number
  supplier: string
  created_at: string
  updated_at: string
}

export interface StockMovement {
  id: string
  user_id: string
  item_id: string
  movement_type: "in" | "out" | "adjustment"
  quantity: number
  reason: string
  reference_id: string | null
  created_at: string
}

export interface Sale {
  id: string
  user_id: string
  customer_name: string
  customer_email: string
  total_amount: number
  payment_method: string
  status: "pending" | "completed" | "cancelled" | "refunded"
  notes: string
  created_at: string
}

export interface SaleItem {
  id: string
  sale_id: string
  item_id: string
  quantity: number
  unit_price: number
  total_price: number
  created_at: string
}

export interface AIInsight {
  id: string
  user_id: string
  insight_type: "forecast" | "anomaly" | "recommendation" | "trend"
  title: string
  description: string
  data: Record<string, unknown> | null
  confidence_score: number | null
  is_read: boolean
  created_at: string
}

export interface AdminLog {
  id: string
  admin_id: string
  action: string
  target_type: string
  target_id: string
  details: Record<string, unknown>
  created_at: string
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function toISOString(ts: unknown): string {
  if (ts instanceof Timestamp) {
    return ts.toDate().toISOString()
  }
  if (typeof ts === "string") return ts
  return new Date().toISOString()
}

function docToTyped<T extends { id: string }>(
  docSnap: DocumentData & { id: string },
  data: DocumentData
): T {
  const cleaned: Record<string, unknown> = { id: docSnap.id }
  for (const [key, value] of Object.entries(data)) {
    if (value instanceof Timestamp) {
      cleaned[key] = value.toDate().toISOString()
    } else {
      cleaned[key] = value
    }
  }
  return cleaned as T
}

// ─── Profiles ──────────────────────────────────────────────────────────────────

export async function getProfile(userId: string): Promise<Profile | null> {
  const docSnap = await getDoc(doc(db, "profiles", userId))
  if (!docSnap.exists()) return null
  return docToTyped<Profile>({ id: docSnap.id }, docSnap.data())
}

export async function createProfile(
  userId: string,
  data: Partial<Profile>
): Promise<void> {
  await setDoc(doc(db, "profiles", userId), {
    email: data.email || "",
    full_name: data.full_name || "",
    company_name: data.company_name || "",
    role: data.role || "user",
    subscription_tier: data.subscription_tier || "free",
    subscription_status: data.subscription_status || "active",
    subscription_expires_at: null,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  })
}

export async function updateProfile(
  userId: string,
  data: Partial<Profile>
): Promise<void> {
  await updateDoc(doc(db, "profiles", userId), {
    ...data,
    updated_at: serverTimestamp(),
  })
}

// ─── Categories ────────────────────────────────────────────────────────────────

export async function getCategories(userId: string): Promise<Category[]> {
  const q = query(
    collection(db, "categories"),
    where("user_id", "==", userId),
    orderBy("name")
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => docToTyped<Category>({ id: d.id }, d.data()))
}

export async function createCategory(
  data: Omit<Category, "id" | "created_at">
): Promise<string> {
  const ref = await addDoc(collection(db, "categories"), {
    ...data,
    created_at: serverTimestamp(),
  })
  return ref.id
}

export async function updateCategory(
  id: string,
  data: Partial<Category>
): Promise<void> {
  await updateDoc(doc(db, "categories", id), data)
}

export async function deleteCategory(id: string): Promise<void> {
  await deleteDoc(doc(db, "categories", id))
}

// ─── Inventory Items ───────────────────────────────────────────────────────────

export async function getInventoryItems(
  userId: string,
  maxItems?: number
): Promise<InventoryItem[]> {
  const constraints: QueryConstraint[] = [
    where("user_id", "==", userId),
    orderBy("created_at", "desc"),
  ]
  if (maxItems) constraints.push(limit(maxItems))

  const q = query(collection(db, "inventory_items"), ...constraints)
  const snap = await getDocs(q)
  return snap.docs.map((d) =>
    docToTyped<InventoryItem>({ id: d.id }, d.data())
  )
}

export async function getInventoryItem(
  id: string
): Promise<InventoryItem | null> {
  const docSnap = await getDoc(doc(db, "inventory_items", id))
  if (!docSnap.exists()) return null
  return docToTyped<InventoryItem>({ id: docSnap.id }, docSnap.data())
}

export async function createInventoryItem(
  data: Omit<InventoryItem, "id" | "created_at" | "updated_at">
): Promise<string> {
  const ref = await addDoc(collection(db, "inventory_items"), {
    ...data,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  })
  return ref.id
}

export async function updateInventoryItem(
  id: string,
  data: Partial<InventoryItem>
): Promise<void> {
  await updateDoc(doc(db, "inventory_items", id), {
    ...data,
    updated_at: serverTimestamp(),
  })
}

export async function deleteInventoryItem(id: string): Promise<void> {
  await deleteDoc(doc(db, "inventory_items", id))
}

export async function getLowStockItems(
  userId: string,
  threshold = 10
): Promise<InventoryItem[]> {
  const items = await getInventoryItems(userId)
  return items.filter(
    (item) =>
      item.current_stock <= (item.min_stock_level || threshold)
  )
}

// ─── Stock Movements ───────────────────────────────────────────────────────────

export async function getStockMovements(
  userId: string,
  maxItems = 50
): Promise<StockMovement[]> {
  const q = query(
    collection(db, "stock_movements"),
    where("user_id", "==", userId),
    orderBy("created_at", "desc"),
    limit(maxItems)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) =>
    docToTyped<StockMovement>({ id: d.id }, d.data())
  )
}

export async function createStockMovement(
  data: Omit<StockMovement, "id" | "created_at">
): Promise<string> {
  const ref = await addDoc(collection(db, "stock_movements"), {
    ...data,
    created_at: serverTimestamp(),
  })
  return ref.id
}

// ─── Sales ─────────────────────────────────────────────────────────────────────

export async function getSales(
  userId: string,
  maxItems = 100
): Promise<Sale[]> {
  const q = query(
    collection(db, "sales"),
    where("user_id", "==", userId),
    orderBy("created_at", "desc"),
    limit(maxItems)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => docToTyped<Sale>({ id: d.id }, d.data()))
}

export async function createSale(
  data: Omit<Sale, "id" | "created_at">
): Promise<string> {
  const ref = await addDoc(collection(db, "sales"), {
    ...data,
    created_at: serverTimestamp(),
  })
  return ref.id
}

export async function updateSale(
  id: string,
  data: Partial<Sale>
): Promise<void> {
  await updateDoc(doc(db, "sales", id), data)
}

export async function deleteSale(id: string): Promise<void> {
  await deleteDoc(doc(db, "sales", id))
}

// ─── Sale Items ────────────────────────────────────────────────────────────────

export async function getSaleItems(saleId: string): Promise<SaleItem[]> {
  const q = query(
    collection(db, "sale_items"),
    where("sale_id", "==", saleId)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => docToTyped<SaleItem>({ id: d.id }, d.data()))
}

export async function createSaleItem(
  data: Omit<SaleItem, "id" | "created_at">
): Promise<string> {
  const ref = await addDoc(collection(db, "sale_items"), {
    ...data,
    created_at: serverTimestamp(),
  })
  return ref.id
}

// ─── AI Insights ───────────────────────────────────────────────────────────────

export async function getAIInsights(
  userId: string,
  unreadOnly = false,
  maxItems = 20
): Promise<AIInsight[]> {
  const constraints: QueryConstraint[] = [
    where("user_id", "==", userId),
    orderBy("created_at", "desc"),
    limit(maxItems),
  ]
  if (unreadOnly) {
    constraints.splice(1, 0, where("is_read", "==", false))
  }

  const q = query(collection(db, "ai_insights"), ...constraints)
  const snap = await getDocs(q)
  return snap.docs.map((d) => docToTyped<AIInsight>({ id: d.id }, d.data()))
}

export async function createAIInsight(
  data: Omit<AIInsight, "id" | "created_at">
): Promise<string> {
  const ref = await addDoc(collection(db, "ai_insights"), {
    ...data,
    created_at: serverTimestamp(),
  })
  return ref.id
}

export async function markInsightRead(id: string): Promise<void> {
  await updateDoc(doc(db, "ai_insights", id), { is_read: true })
}

// ─── Admin Logs ────────────────────────────────────────────────────────────────

export async function getAdminLogs(maxItems = 100): Promise<AdminLog[]> {
  const q = query(
    collection(db, "admin_logs"),
    orderBy("created_at", "desc"),
    limit(maxItems)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => docToTyped<AdminLog>({ id: d.id }, d.data()))
}

export async function createAdminLog(
  data: Omit<AdminLog, "id" | "created_at">
): Promise<string> {
  const ref = await addDoc(collection(db, "admin_logs"), {
    ...data,
    created_at: serverTimestamp(),
  })
  return ref.id
}

// ─── Admin Queries ─────────────────────────────────────────────────────────────

export async function getAllProfiles(): Promise<Profile[]> {
  const q = query(collection(db, "profiles"), orderBy("created_at", "desc"))
  const snap = await getDocs(q)
  return snap.docs.map((d) => docToTyped<Profile>({ id: d.id }, d.data()))
}

export async function getProfilesBySubscription(
  tier: string
): Promise<Profile[]> {
  const q = query(
    collection(db, "profiles"),
    where("subscription_tier", "==", tier)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => docToTyped<Profile>({ id: d.id }, d.data()))
}
