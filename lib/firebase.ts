import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getDatabase } from 'firebase-admin/database'

// ─── Firebase Admin init ──────────────────────────────────────────────────────
function getApp() {
  if (getApps().length > 0) return getApps()[0]

  const projectId  = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const databaseURL = process.env.FIREBASE_DATABASE_URL

  if (projectId && clientEmail && privateKey && databaseURL) {
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      databaseURL,
    })
  }
  return initializeApp()
}

function db() {
  return getDatabase(getApp())
}

// ─── Generic helpers ──────────────────────────────────────────────────────────
async function fbGet<T>(path: string): Promise<T | null> {
  const snap = await db().ref(path).once('value')
  if (!snap.exists()) return null
  return snap.val() as T
}

async function fbSet(path: string, data: unknown): Promise<void> {
  await db().ref(path).set(data)
}

async function fbUpdate(path: string, data: Record<string, unknown>): Promise<void> {
  await db().ref(path).update(data)
}

export async function fbPush(path: string, data: unknown): Promise<string> {
  const ref = await db().ref(path).push(data)
  return ref.key!
}

export async function fbRemove(path: string): Promise<void> {
  await db().ref(path).remove()
}

export async function generateCheckCode(date: Date): Promise<string> {
  const d = date
  const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  const ref = db().ref(`counters/checkCodes/${dateStr}`)
  const result = await ref.transaction((n: number | null) => (n || 0) + 1)
  const seq = result.snapshot.val() as number
  return `AKN${dateStr}${String(seq).padStart(3, '0')}`
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProductStatus =
  | 'pending_review'
  | 'pending_setup'
  | 'pricing'
  | 'pending_final'
  | 'done'
  | 'rejected'

export interface Product {
  id?: string
  status: ProductStatus
  createdAt: number  // timestamp ms
  name: string
  imageUrl?: string
  marketPrice: number
  sales30d?: number
  revenue30d?: number
  growthRate?: number
  kaloUrl?: string
  shopUrl?: string
  description?: string
  category?: string
  // Step 2 — specs (set during review approval)
  specWeight?: string
  specDimensions?: string
  specMaterial?: string
  specUseCases?: string
  checkCode?: string
  approvedAt?: number
  approvedBy?: string
  // Step 3
  exportTaxPct?: number
  importTaxPct?: number
  hsCode?: string
  hsDescription?: string
  dailyRateDate?: string
  // Step 4
  factoryCny?: number
  weightKg?: number
  volumeM3?: number
  domesticFreightCny?: number
  inspectionCny?: number
  inspectionVnd?: number
  quarantineCny?: number
  qtyPerBox?: number
  totalPerUnit?: number
  totalPerBox?: number
  pricingBreakdown?: object
  supplierName?: string
  supplierContact?: string
  moq?: string
  leadTime?: string
  pricingNotes?: string
  photos?: string[]
  videoUrl?: string
  freightType?: 'nguyen_xe' | 'ghep_xe' | 'default'
  pricedBy?: string
  pricedAt?: number
  // Step 5
  assignedBuyerId?: string
  importQty?: number
  importWarehouse?: 'HN' | 'SG' | 'BOTH'
  totalImportCost?: number
  rejectReason?: string
  decidedBy?: string
  decidedAt?: number
  estimatedImportPrice?: number
  // Step 6
  kiotCode?: string
  kiotCreatedAt?: number
}

export interface DailyRate {
  key?: string
  fxRate: number
  intlFreightPerKg: number        // legacy — giữ cho backward compat
  intlFreightNguyenXe?: number    // Cước Nguyên Xe (VND/kg)
  intlFreightGhepXe?: number      // Cước Ghép Xe (VND/kg)
  createdBy: string
  createdAt: number
}

export interface Message {
  id?: string
  senderId: string
  senderName: string
  content: string
  createdAt: number
  mediaUrl?: string
  mediaType?: 'image' | 'video'
}

export interface AppUser {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'LEADER_PM' | 'BUYER'
  password: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function fmtVND(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(n)) + 'đ'
}

// ─── Pricings (per-NV pricing data) ──────────────────────────────────────────

export interface ProductPricing {
  factoryCny: number
  weightKg?: number
  volumeM3?: number
  domesticFreightCny?: number
  inspectionCny?: number
  inspectionVnd?: number
  quarantineCny?: number
  qtyPerBox?: number
  totalPerUnit: number
  totalPerBox?: number
  pricingBreakdown?: object
  supplierName?: string
  supplierContact?: string
  moq?: string
  leadTime?: string
  pricingNotes?: string
  photos?: string[]
  videoUrl?: string
  freightType?: string
  pricedAt: number
  userName?: string
}

export async function savePricing(productId: string, userId: string, data: ProductPricing): Promise<void> {
  await fbSet(`pricings/${productId}/${userId}`, data)
}

export async function getPricings(productId: string): Promise<Record<string, ProductPricing>> {
  return (await fbGet<Record<string, ProductPricing>>(`pricings/${productId}`)) || {}
}

// ─── Products ─────────────────────────────────────────────────────────────────

export async function getProducts(): Promise<Product[]> {
  const data = await fbGet<Record<string, Omit<Product, 'id'>>>('products')
  if (!data) return []
  return Object.entries(data).map(([id, p]) => ({ ...p, id }))
}

export async function getProduct(id: string): Promise<Product | null> {
  const data = await fbGet<Omit<Product, 'id'>>(`products/${id}`)
  if (!data) return null
  return { ...data, id }
}

export async function saveProduct(id: string, data: Partial<Product>): Promise<void> {
  await fbUpdate(`products/${id}`, data as Record<string, unknown>)
}

export async function createProduct(data: Omit<Product, 'id'>): Promise<string> {
  return fbPush('products', data)
}

// ─── Assignments ──────────────────────────────────────────────────────────────

export async function getAssignments(productId: string): Promise<string[]> {
  return (await fbGet<string[]>(`assignments/${productId}`)) || []
}

export async function setAssignments(productId: string, userIds: string[]): Promise<void> {
  await fbSet(`assignments/${productId}`, userIds)
}

export async function getProductsAssignedToUser(userId: string): Promise<string[]> {
  const allAssignments = await fbGet<Record<string, string[]>>('assignments')
  if (!allAssignments) return []
  return Object.entries(allAssignments)
    .filter(([, userIds]) => userIds.includes(userId))
    .map(([productId]) => productId)
}

// ─── Daily rates ──────────────────────────────────────────────────────────────

export async function getDailyRate(date: Date): Promise<DailyRate | null> {
  const key = formatDateKey(date)
  const rate = await fbGet<DailyRate>(`dailyRates/${key}`)
  if (rate) return { ...rate, key }

  // Fallback: latest rate
  const all = await fbGet<Record<string, DailyRate>>('dailyRates')
  if (!all) return null
  const keys = Object.keys(all).sort().reverse()
  if (!keys.length) return null
  return { ...all[keys[0]], key: keys[0] }
}

export async function saveDailyRate(date: Date, data: Omit<DailyRate, 'key'>): Promise<DailyRate> {
  const key = formatDateKey(date)
  await fbSet(`dailyRates/${key}`, data)
  return { ...data, key }
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export async function getMessages(productId: string): Promise<Message[]> {
  const data = await fbGet<Record<string, Omit<Message, 'id'>>>(`messages/${productId}`)
  if (!data) return []
  return Object.entries(data).map(([id, m]) => ({ ...m, id })).sort((a, b) => a.createdAt - b.createdAt)
}

export async function addMessage(productId: string, message: Omit<Message, 'id'>): Promise<void> {
  await fbPush(`messages/${productId}`, message)
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface Notification {
  id?: string
  userId: string
  message: string
  productId?: string
  read: boolean
  createdAt: number
}

export async function addNotification(data: Omit<Notification, 'id'>): Promise<void> {
  await fbPush('notifications', data)
}

export async function getUnreadNotifications(userId: string): Promise<Notification[]> {
  const all = await fbGet<Record<string, Omit<Notification, 'id'>>>('notifications')
  if (!all) return []
  return Object.entries(all)
    .map(([id, n]) => ({ ...n, id }))
    .filter(n => n.userId === userId && !n.read)
    .sort((a, b) => b.createdAt - a.createdAt)
}

export async function markNotificationsRead(userId: string): Promise<void> {
  const all = await fbGet<Record<string, Notification>>('notifications')
  if (!all) return
  const updates: Record<string, unknown> = {}
  for (const [id, n] of Object.entries(all)) {
    if (n.userId === userId && !n.read) updates[`notifications/${id}/read`] = true
  }
  if (Object.keys(updates).length > 0) await db().ref().update(updates)
}
