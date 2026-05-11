# Mô hình dữ liệu Firebase

## Cấu trúc Realtime Database

```
firebase-root/
├── products/
│   └── {productId}/          ← Product object
├── assignments/
│   └── {productId}/          ← string[] (mảng userId)
├── pricings/
│   └── {productId}/
│       └── {userId}/         ← ProductPricing object
├── dailyRates/
│   └── {YYYY-MM-DD}/         ← DailyRate object
├── messages/
│   └── {productId}/
│       └── {messageId}/      ← Message object
├── notifications/
│   └── {notificationId}/     ← Notification object
└── counters/
    └── checkCodes/
        └── {YYYYMMDD}/       ← number (auto-increment)
```

---

## Product

Path: `products/{productId}`

```typescript
interface Product {
  // Core
  status: 'pending_review' | 'pending_setup' | 'pricing' | 'pending_final' | 'done' | 'rejected'
  createdAt: number           // timestamp ms

  // Kalodata info
  name: string
  imageUrl?: string
  marketPrice: number         // giá thị trường (VND)
  sales30d?: number           // đơn/30 ngày
  revenue30d?: number         // doanh thu/30 ngày (VND)
  growthRate?: number         // tốc độ tăng trưởng (%)
  kaloUrl?: string            // link Kalodata
  shopUrl?: string            // link TikTok shop
  description?: string
  category?: string

  // Bước 1 — sau khi Admin duyệt
  checkCode?: string          // AKN{YYYYMMDD}{3 số} — VD: AKN20260511001
  specWeight?: string         // VD: "250g"
  specDimensions?: string     // VD: "30×20×10 cm"
  specMaterial?: string       // VD: "Nhựa ABS"
  specUseCases?: string       // Công dụng
  approvedAt?: number
  approvedBy?: string         // userId

  // Bước 2 — sau khi LEADER_PM thiết lập
  exportTaxPct?: number       // %
  importTaxPct?: number       // %
  hsCode?: string
  hsDescription?: string
  dailyRateDate?: string      // YYYY-MM-DD

  // Bước 3 — sau khi BUYER báo giá
  factoryCny?: number
  weightKg?: number
  volumeM3?: number
  domesticFreightCny?: number
  inspectionCny?: number      // legacy
  inspectionVnd?: number      // mới
  quarantineCny?: number
  qtyPerBox?: number
  totalPerUnit?: number       // VND
  totalPerBox?: number        // VND
  pricingBreakdown?: object   // chi tiết các khoản
  supplierName?: string
  supplierContact?: string
  moq?: string
  leadTime?: string
  pricingNotes?: string
  photos?: string[]           // URLs (Vercel Blob hoặc base64)
  videoUrl?: string
  freightType?: 'nguyen_xe' | 'ghep_xe' | 'default'
  pricedBy?: string           // userId
  pricedAt?: number

  // Bước 4 — sau khi Admin quyết định
  assignedBuyerId?: string    // NVMH được chọn nhập hàng
  importQty?: number          // số thùng
  importWarehouse?: 'HN' | 'SG' | 'BOTH'
  totalImportCost?: number    // = totalPerBox × importQty (VND)
  rejectReason?: string
  decidedBy?: string
  decidedAt?: number
  estimatedImportPrice?: number

  // Bước 5 — sau khi BUYER tạo Kiot
  kiotCode?: string
  kiotCreatedAt?: number
}
```

---

## DailyRate

Path: `dailyRates/{YYYY-MM-DD}`

```typescript
interface DailyRate {
  fxRate: number              // VND/CNY — VD: 3500
  intlFreightPerKg: number    // legacy (VND/kg)
  intlFreightNguyenXe?: number // VND/m³ — Nguyên Xe
  intlFreightGhepXe?: number   // VND/m³ — Ghép Xe
  createdBy: string           // userId
  createdAt: number           // timestamp ms
}
```

Khi truy vấn: lấy theo ngày hiện tại, nếu không có → fallback về ngày gần nhất có dữ liệu.

---

## ProductPricing

Path: `pricings/{productId}/{userId}`

Lưu báo giá riêng của từng NVMH (không ghi đè lên `products`).

```typescript
interface ProductPricing {
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
```

---

## Assignments

Path: `assignments/{productId}`

```typescript
string[]  // mảng userId của các NVMH được phân công báo giá
// VD: ["user_lan", "user_hoa"]
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
  mediaUrl?: string           // URL ảnh/video (Vercel Blob)
  mediaType?: 'image' | 'video'
}
```

---

## Notification

Path: `notifications/{notificationId}`

```typescript
interface Notification {
  userId: string              // người nhận thông báo
  message: string
  productId?: string
  read: boolean
  createdAt: number
}
```

Thông báo unread được đếm dựa trên: `messages` có `createdAt` trong vòng 2 giờ gần nhất, gộp theo `productId`.

---

## Counters

Path: `counters/checkCodes/{YYYYMMDD}`

Số nguyên tự động tăng (Firebase transaction), dùng để sinh `checkCode` theo định dạng:
`AKN{YYYYMMDD}{seq padded 3}` — ví dụ: `AKN20260511007`

---

## AppUser (hardcoded, không lưu Firebase)

```typescript
interface AppUser {
  id: string      // VD: "user_bich"
  name: string    // VD: "Bích"
  email: string   // VD: "bich@akano.vn"
  role: 'ADMIN' | 'LEADER_PM' | 'BUYER'
  password: string  // bcrypt hash
}
```

Users được định nghĩa tĩnh trong `lib/users.ts`, không có CRUD users.
