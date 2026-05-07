// ─── Firebase – dùng chung cho cả client và server (API routes) ──────────────
import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import {
  getDatabase, ref, get, set, update, push, remove,
  runTransaction, onValue, off, query, orderByChild,
  equalTo, DatabaseReference, DataSnapshot,
} from 'firebase/database'

// Config của project akano-workflow (đã có sẵn)
const FIREBASE_CONFIG = {
  apiKey:            'AIzaSyBoELbbjGBjjuOXFm1H9zNf98gfeDOVbdc',
  authDomain:        'akano-workflow.firebaseapp.com',
  databaseURL:       'https://akano-workflow-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId:         'akano-workflow',
  storageBucket:     'akano-workflow.firebasestorage.app',
  messagingSenderId: '552263773009',
  appId:             '1:552263773009:web:d5cdfa9e32121f87e08170',
}

// Root path cho app mới (không đụng data cũ)
export const DB_ROOT = 'akano_hangmoi'

let _app: FirebaseApp | null = null

function getApp(): FirebaseApp {
  if (_app) return _app
  _app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG)
  return _app
}

export function getDB() {
  return getDatabase(getApp())
}

// ─── Generic helpers ──────────────────────────────────────────────────────────

export async function fbGet<T>(path: string): Promise<T | null> {
  try {
    const snap = await get(ref(getDB(), `${DB_ROOT}/${path}`))
    return snap.exists() ? (snap.val() as T) : null
  } catch { return null }
}

export async function fbSet(path: string, data: unknown): Promise<void> {
  await set(ref(getDB(), `${DB_ROOT}/${path}`), data)
}

export async function fbUpdate(path: string, data: Record<string, unknown>): Promise<void> {
  await update(ref(getDB(), `${DB_ROOT}/${path}`), data)
}

export async function fbPush(path: string, data: unknown): Promise<string> {
  const r = await push(ref(getDB(), `${DB_ROOT}/${path}`), data)
  return r.key!
}

export async function fbRemove(path: string): Promise<void> {
  await remove(ref(getDB(), `${DB_ROOT}/${path}`))
}

/** Subscribe to realtime changes — returns unsubscribe fn */
export function fbSubscribe(path: string, cb: (data: unknown) => void): () => void {
  const r = ref(getDB(), `${DB_ROOT}/${path}`)
  onValue(r, (snap) => cb(snap.exists() ? snap.val() : null))
  return () => off(r)
}

// ─── Check Code — atomic sequence ────────────────────────────────────────────
/**
 * Atomically generate next check code for today.
 * Format: C{YY}{MM}{DD}.{nn}  e.g. C260507.01
 */
export async function generateCheckCode(date: Date): Promise<string> {
  const yy = String(date.getFullYear()).slice(2)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const dateKey = `${yy}${mm}${dd}`
  const seqRef = ref(getDB(), `${DB_ROOT}/check_code_sequences/${dateKey}`)

  let seq = 1
  await runTransaction(seqRef, (current: number | null) => {
    seq = (current ?? 0) + 1
    return seq
  })

  return `C${dateKey}.${String(seq).padStart(2, '0')}`
}

// ─── Products ─────────────────────────────────────────────────────────────────

export async function getProducts(filters?: { status?: string }): Promise<Product[]> {
  const all = await fbGet<Record<string, Product>>('products')
  if (!all) return []
  let list = Object.entries(all).map(([id, p]) => ({ ...p, id }))
  if (filters?.status) list = list.filter(p => p.status === filters.status)
  return list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
}

export async function getProduct(id: string): Promise<Product | null> {
  const p = await fbGet<Product>(`products/${id}`)
  return p ? { ...p, id } : null
}

export async function saveProduct(id: string, data: Partial<Product>): Promise<void> {
  await fbUpdate(`products/${id}`, data as Record<string, unknown>)
}

// ─── Assignments ──────────────────────────────────────────────────────────────

export async function getAssignments(productId: string): Promise<string[]> {
  const data = await fbGet<Record<string, boolean>>(`assignments/${productId}`)
  return data ? Object.keys(data) : []
}

export async function setAssignments(productId: string, userIds: string[]): Promise<void> {
  const data: Record<string, boolean> = {}
  userIds.forEach(id => { data[id] = true })
  await fbSet(`assignments/${productId}`, userIds.length ? data : null)
}

export async function getProductsAssignedToUser(userId: string): Promise<string[]> {
  const all = await fbGet<Record<string, Record<string, boolean>>>('assignments')
  if (!all) return []
  return Object.entries(all)
    .filter(([, users]) => users?.[userId])
    .map(([productId]) => productId)
}

// ─── Daily Rates ──────────────────────────────────────────────────────────────

export async function getDailyRate(date: Date): Promise<DailyRate | null> {
  const key = formatDateKey(date)
  return fbGet<DailyRate>(`daily_rates/${key}`)
}

export async function saveDailyRate(date: Date, rate: Omit<DailyRate, 'key'>): Promise<void> {
  const key = formatDateKey(date)
  await fbSet(`daily_rates/${key}`, { ...rate, key })
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export async function getMessages(productId: string): Promise<Message[]> {
  const data = await fbGet<Record<string, Message>>(`messages/${productId}`)
  if (!data) return []
  return Object.entries(data)
    .map(([id, m]) => ({ ...m, id }))
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
}

export async function addMessage(productId: string, msg: Omit<Message, 'id'>): Promise<string> {
  return fbPush(`messages/${productId}`, msg)
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProductStatus =
  | 'new' | 'pending_review' | 'pending_setup'
  | 'pricing' | 'pending_final' | 'done' | 'rejected'

export interface Product {
  id?: string
  status: ProductStatus
  createdAt: number  // timestamp ms
  name: string
  imageUrl?: string
  marketPrice: number
  sales30d?: number
  growthRate?: number
  kaloUrl?: string
  shopUrl?: string
  description?: string
  category?: string
  // Step 2
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
