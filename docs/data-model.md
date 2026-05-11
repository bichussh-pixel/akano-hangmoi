# Mô hình dữ liệu Firebase

## Cấu trúc Realtime Database

```
firebase-root/
├── products/{productId}/
├── assignments/{productId}/          ← string[] userId
├── pricings/{productId}/{userId}/
├── dailyRates/{YYYY-MM-DD}/
├── messages/{productId}/{messageId}/
├── notifications/{notificationId}/
└── counters/checkCodes/{YYYYMMDD}/   ← number (auto-increment)
```

---

## Product

Path: `products/{productId}`

```typescript
interface Product {
  status: 'pending_review' | 'pending_setup' | 'pricing' | 'pending_final' | 'done' | 'rejected'
  createdAt: number

  // Kalodata info
  name: string
  imageUrl?: string
  marketPrice: number
  sales30d?: number
  revenue30d?: number
  growthRate?: number
  kaloUrl?: string
  shopUrl?: string
  category?: string

  // Bước 1 — sau khi Admin duyệt
  checkCode?: string           // AKN{YYYYMMDD}{seq} — VD: AKN20260511001
  specWeight?: string
  specDimensions?: string
  specMaterial?: string
  specUseCases?: string
  approvedAt?: number
  approvedBy?: string

  // Bước 2 — LEADER_PM thiết lập
  exportTaxPct?: number
  importTaxPct?: number
  hsCode?: string
  hsDescription?: string
  dailyRateDate?: string       // YYYY-MM-DD

  // Bước 3 — BUYER báo giá
  factoryCny?: number
  weightKg?: number
  volumeM3?: number
  domesticFreightCny?: number
  inspectionVnd?: number
  quarantineCny?: number
  qtyPerBox?: number
  totalPerUnit?: number        // VND
  totalPerBox?: number         // VND
  supplierName?: string
  supplierContact?: string
  moq?: string
  leadTime?: string
  photos?: string[]
  videoUrl?: string
  freightType?: 'nguyen_xe' | 'ghep_xe' | 'default'
  pricedBy?: string
  pricedAt?: number

  // Bước 4 — Admin quyết định
  assignedBuyerId?: string
  importQty?: number
  importWarehouse?: 'HN' | 'SG' | 'BOTH'
  totalImportCost?: number
  rejectReason?: string
  decidedBy?: string
  decidedAt?: number

  // Bước 5 — Kiot
  kiotCode?: string
  kiotCreatedAt?: number
}
```

---

## DailyRate

Path: `dailyRates/{YYYY-MM-DD}`

```typescript
interface DailyRate {
  fxRate: number               // VND/CNY
  intlFreightPerKg: number     // legacy
  intlFreightNguyenXe?: number // VND/m³
  intlFreightGhepXe?: number   // VND/m³
  createdBy: string
  createdAt: number
}
```

---

## ProductPricing

Path: `pricings/{productId}/{userId}` — báo giá của từng NVMH

```typescript
interface ProductPricing {
  factoryCny: number
  volumeM3?: number
  domesticFreightCny?: number
  inspectionVnd?: number
  quarantineCny?: number
  qtyPerBox?: number
  totalPerUnit: number
  totalPerBox?: number
  supplierName?: string
  moq?: string
  leadTime?: string
  photos?: string[]
  videoUrl?: string
  freightType?: string
  pricedAt: number
  userName?: string
}
```

---

## Message

Path: `messages/{productId}/{messageId}`

```typescript
interface Message {
  senderId: string
  senderName: string
  content: string
  createdAt: number
  mediaUrl?: string
  mediaType?: 'image' | 'video'
}
```

---

## Notification

Path: `notifications/{notificationId}`

```typescript
interface Notification {
  userId: string
  message: string
  productId?: string
  read: boolean
  createdAt: number
}
```

---

## CheckCode counter

Path: `counters/checkCodes/{YYYYMMDD}` — số nguyên tự tăng (Firebase transaction)

Format: `AKN{YYYYMMDD}{seq 3 chữ số}` → VD: `AKN20260511007`

---

## AppUser (hardcoded trong lib/users.ts)

```typescript
interface AppUser {
  id: string      // "user_bich"
  name: string    // "Bích"
  email: string   // "bich@akano.vn"
  role: 'ADMIN' | 'LEADER_PM' | 'BUYER'
  password: string  // bcrypt hash
}
```
