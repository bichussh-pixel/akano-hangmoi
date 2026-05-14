# Đặc tả hệ thống AKANO — Quản lý nhập hàng TQ

> Cập nhật: 2026-05-14  
> Dựa trên codebase hiện tại + yêu cầu bổ sung đã xác nhận

---

## 1. Tổng quan hệ thống

Hệ thống quản lý toàn bộ vòng đời sản phẩm nhập khẩu từ Trung Quốc: từ phát hiện sản phẩm tiềm năng trên Kalodata → duyệt → báo giá → chốt nhập → vận chuyển → nhập kho → bán.

### Công nghệ
- **Frontend + Backend:** Next.js (App Router)
- **Database:** Firebase Realtime Database
- **Auth:** NextAuth (email/password + bcrypt)
- **Storage:** Vercel Blob (ảnh/video) hoặc base64 fallback
- **Deploy:** Vercel

---

## 2. Người dùng & Phân quyền

| Role | Tên | Email | Chức năng |
|------|-----|-------|-----------|
| `ADMIN` | Bích | bich@akano.vn | Duyệt SP, phân công, chốt nhập, quản lý tổng thể |
| `LEADER_PM` | Thắm | tham@akano.vn | Thiết lập thuế, HS code, phân NVMH |
| `BUYER` | Lan, Hoa, Mai, Thu, Linh | *@akano.vn | Báo giá, đặt hàng, theo dõi đơn |

Mật khẩu mặc định: `akano2026` (bcrypt hash trong `lib/users.ts`)

---

## 3. Mô hình dữ liệu Firebase

```
firebase-root/
├── products/{productId}/           ← Sản phẩm (đầy đủ trạng thái)
├── assignments/{productId}/        ← string[] userId — NVMH được phân công
├── pricings/{productId}/{userId}/  ← Báo giá từng NVMH
├── dailyRates/{YYYY-MM-DD}/        ← Tỷ giá + cước vận chuyển
├── messages/{productId}/{msgId}/   ← Chat theo sản phẩm
├── notifications/{notifId}/        ← Thông báo in-app
└── counters/checkCodes/{YYYYMMDD}/ ← Auto-increment cho check code
```

### Product (trạng thái đầy đủ)

```typescript
interface Product {
  // Core
  id?: string
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

  // Sau khi Admin duyệt (pending_review → pending_setup)
  checkCode?: string             // AKN{YYYYMMDD}{seq3} — VD: AKN20260514001
  specWeight?: string
  specDimensions?: string
  specMaterial?: string
  specUseCases?: string
  buyerRequestNotes?: string     // Ghi chú admin gửi cho NVMH
  approvedAt?: number
  approvedBy?: string

  // Sau LEADER_PM thiết lập (pending_setup → pricing)
  exportTaxPct?: number
  importTaxPct?: number
  hsCode?: string
  hsDescription?: string
  dailyRateDate?: string         // YYYY-MM-DD

  // Sau NVMH báo giá (pricing → pending_final)
  factoryCny?: number            // Giá xuất xưởng (CNY/chiếc)
  weightKgPerBox?: number        // Cân nặng/thùng (kg) — INPUT từ NVMH
  volumeM3PerBox?: number        // Số khối/thùng (m³) — INPUT từ NVMH
  weightKg?: number              // Cân nặng/chiếc = weightKgPerBox / qtyPerBox (tính toán)
  volumeM3?: number              // Số khối/chiếc = volumeM3PerBox / qtyPerBox (tính toán)
  domesticFreightCny?: number
  inspectionVnd?: number
  quarantineCny?: number
  qtyPerBox?: number
  totalPerUnit?: number          // VND — Giá nhập thực tế/chiếc (tính toán)
  totalPerBox?: number           // VND — Giá nhập thực tế/thùng
  pricingBreakdown?: object      // Chi tiết các khoản tính toán
  supplierName?: string
  supplierContact?: string
  moq?: string
  leadTime?: string
  pricingNotes?: string          // Ghi chú báo giá
  buyerNotes?: string            // Ghi chú của NVMH
  factoryMaterial?: string       // Chất liệu (mô tả từ xưởng)
  factoryWeightText?: string     // Trọng lượng (mô tả từ xưởng)
  factoryDimensions?: string     // Kích thước (mô tả từ xưởng)
  photos?: string[]              // Ảnh (URL Vercel Blob hoặc base64)
  videos?: string[]              // Video (URL Vercel Blob)
  videoUrl?: string              // Legacy: URL video từ link ngoài
  freightType?: 'nguyen_xe' | 'ghep_xe' | 'default'
  pricedBy?: string              // userId
  pricedAt?: number

  // Sau Admin chốt nhập (pending_final → done)
  assignedBuyerId?: string
  importQty?: number             // Tổng thùng = importQtyHN + importQtySG
  importQtyHN?: number           // Thùng nhập kho HN
  importQtySG?: number           // Thùng nhập kho SG
  importWarehouse?: 'HN' | 'SG' | 'BOTH'
  totalImportCost?: number       // Tổng tiền nhập (VND)
  totalImportCostHN?: number     // Tiền nhập kho HN
  totalImportCostSG?: number     // Tiền nhập kho SG
  rejectReason?: string
  decidedBy?: string
  decidedAt?: number
  priceEditLog?: {               // Lịch sử sửa giá sau chốt
    oldPrice: number
    newPrice: number
    editedBy: string
    editedAt: number
  }[]

  // Kiot
  kiotCode?: string
  kiotCreatedAt?: number
}
```

### ProductPricing (báo giá từng NVMH)

```typescript
interface ProductPricing {
  factoryCny: number
  weightKgPerBox?: number
  volumeM3PerBox?: number
  weightKg?: number
  volumeM3?: number
  domesticFreightCny?: number
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
  buyerNotes?: string
  factoryMaterial?: string
  factoryWeightText?: string
  factoryDimensions?: string
  photos?: string[]
  videos?: string[]
  videoUrl?: string
  freightType?: string
  pricedAt: number
  userName?: string
}
```

### DailyRate

```typescript
interface DailyRate {
  fxRate: number                 // VND/CNY
  intlFreightPerKg: number       // Legacy
  intlFreightNguyenXe?: number   // VND/m³ — Nguyên Xe
  intlFreightGhepXe?: number     // VND/m³ — Ghép Xe
  createdBy: string
  createdAt: number
}
```

---

## 4. Luồng vòng đời sản phẩm

```
[Kalodata API / Excel upload]
           │
           ▼  ADMIN import
     pending_review
           │
           ├── ADMIN từ chối ────────────────────► rejected
           │
           ▼  ADMIN duyệt (+ specs + ghi chú cho NVMH)
     pending_setup
           │
           ▼  LEADER_PM thiết lập (thuế, HS code, phân NVMH)
        pricing
           │
           ▼  NVMH báo giá (≥1 NVMH)
     pending_final
           │
           ├── ADMIN huỷ ───────────────────────► rejected
           │
           ▼  ADMIN chốt nhập (NVMH + SL HN + SL SG)
          done
           │
           ▼  NVMH tạo mã Kiot (tùy chọn)
       [kiotCode]
```

---

## 5. Chi tiết từng khâu

### Khâu 1 — Đăng ký / Đăng nhập

- Giữ nguyên: email/password + bcrypt
- Session: NextAuth
- Không có OTP / social login

---

### Khâu 2 — Yêu cầu báo giá (Tìm sản phẩm) — ADMIN

**Nguồn sản phẩm:**
- Tìm kiếm Kalodata API theo danh mục, từ khoá, khoảng thời gian
- Upload file Excel từ Kalodata (`.xlsx`)

**Lọc tự động khi import:**
- Bị chặn theo **tên**: bột giặt, nước giặt, áo thun, váy đầm, giày, kem dưỡng, serum...
- Bị chặn theo **danh mục**: hóa chất, tinh dầu, nước hoa, mỹ phẩm, thời trang, giày dép...
- Bỏ qua sản phẩm trùng (theo tên hoặc Kalodata URL)

**Thêm ảnh tham khảo:** Admin có thể upload ảnh tham khảo khi tạo yêu cầu

**Hiển thị:** Nhóm sản phẩm theo danh mục

**Không có:** Buyer (NVMH) không tham gia bước này, không lọc theo NVMH

**Dữ liệu ghi:**
```
status: "pending_review"
name, imageUrl, marketPrice
sales30d, revenue30d, growthRate
kaloUrl, shopUrl, category
createdAt
```

---

### Khâu 3 — Duyệt & Thiết lập — ADMIN + LEADER_PM

**ADMIN duyệt (`pending_review` → `pending_setup`):**
- Nhập specs: specWeight, specDimensions, specMaterial, specUseCases
- **Thêm:** `buyerRequestNotes` — ghi chú gửi cho NVMH khi báo giá
- Tạo `checkCode`: `AKN{YYYYMMDD}{seq3}`
- Hành động: Duyệt đơn lẻ / Duyệt hàng loạt / Từ chối đơn lẻ / Từ chối hàng loạt

**LEADER_PM thiết lập (`pending_setup` → `pricing`):**
- Nhập: `exportTaxPct`, `importTaxPct`, `hsCode`, `hsDescription`, `dailyRateDate`
- **Phân công NVMH:** chọn theo loại hàng (không phân công từng SP cho từng người cụ thể nếu không cần)
- **Deadline báo giá:** thêm trường deadline cho mỗi yêu cầu
- NVMH không thấy ai đang cùng báo giá cùng 1 SP

---

### Khâu 4 — Báo giá — NVMH

**Route:** `/pricing/[id]`

**Hiển thị từ Admin:**
- Thông tin sản phẩm: ảnh, giá thị trường, stats Kalodata
- Specs (specWeight, specDimensions, specMaterial, specUseCases)
- **Ghi chú từ Admin** (`buyerRequestNotes`) — hiển thị nổi bật (màu vàng)
- Tỷ giá và cước vận chuyển hiện tại
- Gợi ý giá nhập mục tiêu: 45–60% giá TT × 0.83/1.08

**Form NVMH nhập:**

| Field | Key | Bắt buộc | Mô tả |
|-------|-----|----------|-------|
| Giá xuất xưởng | `factoryCny` | ✅ | CNY/chiếc |
| Số lượng/thùng | `qtyPerBox` | ✅ | chiếc/thùng |
| **Cân nặng/thùng** | `weightKgPerBox` | | kg/thùng (≠ per unit) |
| **Số khối/thùng** | `volumeM3PerBox` | ✅ | m³/thùng (≠ per unit) |
| Cước nội địa TQ | `domesticFreightCny` | | CNY/chiếc |
| Phí kiểm định | `inspectionVnd` | | VND/chiếc |
| Phí kiểm dịch | `quarantineCny` | | CNY/chiếc |
| Tên NCC | `supplierName` | | |
| Liên hệ NCC | `supplierContact` | | |
| MOQ | `moq` | | |
| Lead time | `leadTime` | | |
| Ghi chú của buyer | `buyerNotes` | | Nhận xét/quan sát của NVMH |
| Ghi chú báo giá | `pricingNotes` | | |
| Chất liệu (xưởng) | `factoryMaterial` | | Từ thông tin xưởng |
| Trọng lượng (xưởng) | `factoryWeightText` | | Mô tả text từ xưởng |
| Kích thước (xưởng) | `factoryDimensions` | | Từ thông tin xưởng |

**Loại vận chuyển:** Nguyên Xe (VND/m³) / Ghép Xe (VND/m³)

**Upload ảnh/video:**
- Tối đa **10 ảnh** + **5 video**
- Chọn nhiều file cùng lúc (ảnh & video lẫn trong 1 lần chọn)
- Xóa từng file
- Hiển thị counter: `Ảnh X/10 · Video Y/5`
- Video: upload trực tiếp (Vercel Blob) hoặc fallback URL

**Tính giá live (frontend):**
```
// Volume/weight là per-box → chia qtyPerBox trước khi tính
volumeM3PerUnit = volumeM3PerBox / qtyPerBox
weightKgPerUnit = weightKgPerBox / qtyPerBox

// Sau đó dùng công thức landed cost
factoryVND      = factoryCny × fxRate
exportTaxAmt    = factoryVND × exportTaxPct / 100
intlFreightAmt  = intlFreightPerM3 × volumeM3PerUnit
importTaxBase   = factoryVND + exportTaxAmt + intlFreightAmt
importTaxAmt    = importTaxBase × importTaxPct / 100
domesticVND     = domesticFreightCny × fxRate
inspectionVND   = inspectionVnd
quarantineVND   = quarantineCny × fxRate

totalPerUnit    = sum(above)
totalPerBox     = totalPerUnit × qtyPerBox
```

**Chat:** Chat theo từng sản phẩm (messages/{productId})

---

### Khâu 5 — Xem báo giá — ADMIN

**Route:** `/decide` (tab "Chờ chốt")

**Hiển thị theo từng SP:**
- Thông tin SP: ảnh, giá TT, stats
- Specs từ Admin
- **Tab NVMH:** khi có ≥1 NVMH báo giá, chọn tab từng người
- **Bảng so sánh:** nút "⚖️ So sánh" — so sánh ngang tất cả NVMH đã báo giá:
  - Giá/chiếc, Giá/thùng, MOQ, Lead time, Loại vận chuyển
  - Chất liệu xưởng, Kích thước xưởng, Tên NCC
- Chi tiết báo giá từng NVMH: breakdown giá, mô tả từ xưởng, NCC, ghi chú, ảnh/video
- Chat theo SP

---

### Khâu 6 — Quyết định nhập — ADMIN

**Quyết định nhập:**
1. Chọn NVMH thực hiện (từ danh sách đã được phân công)
2. **Nhập SL theo từng kho:**
   - SL nhập kho HN (thùng) — `importQtyHN`
   - SL nhập kho SG (thùng) — `importQtySG`
3. Preview tiền từng kho + tổng:
   - Kho HN: X thùng → Y đ
   - Kho SG: X thùng → Y đ
   - Tổng tiền nhập: Z đ
4. `importWarehouse` tự derive: HN / SG / BOTH

**Quyết định không nhập:** Nhập lý do

**Sau khi chốt — Tab "Đã chốt":**
- Hiển thị breakdown per-warehouse (HN + SG riêng)
- **Sửa giá sau chốt:**
  - Nhập giá mới/chiếc
  - Tổng tiền tự tính lại (cả HN + SG)
  - Lưu vào `priceEditLog[]`
- **Lịch sử sửa giá:** nút "📋 Lịch sử (N)" — hiện bảng:
  - Ngày giờ | Giá cũ (gạch ngang) | Giá mới
- **Huỷ nhập:** chuyển về `rejected`

---

### Khâu 7 — Đặt hàng & Theo dõi — NVMH

**Đặt hàng:** Giữ nguyên luồng hiện tại

**Chứng từ:** NVMH upload (giữ nguyên)

**Theo dõi đơn:**
- Giữ trạng thái hiện tại
- **Thêm timeline:** dự kiến vs thực tế cho từng mốc
- **Chat theo đơn:** Chat box riêng theo từng purchase order
- **Cảnh báo trễ:** Highlight khi đơn trễ so với timeline dự kiến

---

### Khâu 8 — Vận chuyển & Nhập kho

**Vận chuyển:** Giữ nguyên

**Nhập kho — Thêm kiểm hàng:**
- Số lượng lỗi (defect quantity)
- Hình ảnh kiểm hàng (upload photos)

**Kho — Thêm chuyển hàng liên kho:**
- Chuyển hàng HN → SG hoặc SG → HN
- Ghi nhận số lượng + ngày chuyển

---

### Khâu 9 — Bán hàng & Báo cáo

**Bán hàng:** Giữ nguyên (xuất hàng theo đơn, trừ tồn)

**Báo cáo — Giữ cũ + thêm mới:**
| Báo cáo | Trạng thái |
|---------|-----------|
| Doanh thu theo tháng | Giữ |
| Lợi nhuận theo tháng | Giữ |
| Tồn kho theo tháng | Giữ |
| BC hiệu suất NVMH | **MỚI** |
| BC theo sản phẩm (tồn, doanh thu) | **MỚI** |
| Xuất Excel/CSV | **MỚI** |

**Thông báo in-app** — 4 loại sự kiện:
| Sự kiện | Người nhận |
|---------|-----------|
| Báo giá mới từ NVMH | ADMIN, LEADER_PM |
| Đơn hàng trễ so với dự kiến | ADMIN, NVMH liên quan |
| Hàng về kho / nhập kho xong | ADMIN |
| Tồn kho thấp (dưới ngưỡng) | ADMIN |

---

## 6. API Endpoints

### Auth
- `POST /api/auth/[...nextauth]` — NextAuth

### Sản phẩm
- `GET /api/review/products` — Lấy SP pending_review
- `POST /api/review/products/[id]` — Duyệt / từ chối
- `POST /api/products/bulk-approve` — Duyệt hàng loạt
- `POST /api/products/bulk-reject` — Từ chối hàng loạt
- `GET /api/setup/products` — Lấy SP pending_setup (LEADER_PM)
- `POST /api/setup/products` — Thiết lập thuế, NVMH
- `GET /api/pricing/products` — Lấy SP pricing (NVMH)
- `GET /api/pricing/products/[id]` — Chi tiết SP để báo giá
- `POST /api/products/[id]/pricing` — Gửi báo giá
- `GET /api/decide/products` — Lấy SP pending_final + done + rejected (ADMIN)
- `POST /api/products/[id]/decide` — Chốt nhập / từ chối / sửa giá / huỷ
- `GET /api/products/[id]/messages` — Lấy messages
- `POST /api/products/[id]/photos` — Ghi photo URL vào product
- `GET /api/products/[id]/kiot` — Kiot info
- `POST /api/products/import` — Import từ Kalodata/Excel

### Dữ liệu phụ
- `GET /api/daily-rates` — Tỷ giá hiện tại
- `GET /api/dashboard/stats` — Stats dashboard
- `GET /api/notifications/unread` — Thông báo chưa đọc
- `POST /api/upload/image` — Upload ảnh/video

---

## 7. Công thức tính giá nhập

File: `lib/calc.ts`

```
// Volume/weight là per-box (input từ NVMH) → convert sang per-unit
volumeM3PerUnit    = volumeM3PerBox / qtyPerBox
weightKgPerUnit    = weightKgPerBox / qtyPerBox

factoryVND         = factoryCny × fxRate
exportTaxAmt       = factoryVND × exportTaxPct / 100

// Cước QT theo loại vận chuyển
intlFreightPerM3   = intlFreightNguyenXe | intlFreightGhepXe
intlFreightAmt     = intlFreightPerM3 × volumeM3PerUnit

importTaxBase      = factoryVND + exportTaxAmt + intlFreightAmt
importTaxAmt       = importTaxBase × importTaxPct / 100
domesticVND        = domesticFreightCny × fxRate
inspectionVND      = inspectionVnd  (nhập thẳng VND)
quarantineVND      = quarantineCny × fxRate

totalPerUnit       = factoryVND + exportTaxAmt + intlFreightAmt
                   + importTaxAmt + domesticVND + inspectionVND + quarantineVND
totalPerBox        = totalPerUnit × qtyPerBox
```

**Gợi ý giá nhập mục tiêu:**
```
min = (marketPrice × 45%) × 0.83 / 1.08
max = (marketPrice × 60%) × 0.83 / 1.08
```

---

## 8. Tổng tiền nhập (Khâu 6)

```
pricePerBox         = totalPerUnit × qtyPerBox
totalImportCostHN   = importQtyHN × pricePerBox
totalImportCostSG   = importQtySG × pricePerBox
totalImportCost     = totalImportCostHN + totalImportCostSG
importQty           = importQtyHN + importQtySG
importWarehouse     = if (HN>0 && SG>0) 'BOTH' elif HN>0 'HN' else 'SG'
```

---

## 9. Check Code Format

```
AKN{YYYYMMDD}{seq3}
Ví dụ: AKN20260514001
```

Sinh từ Firebase transaction counter tại `counters/checkCodes/{YYYYMMDD}`.

---

## 10. Trạng thái cần implement tiếp (TODO)

Các tính năng đã xác nhận nhưng chưa implement hoặc cần xây mới:

### Khâu 3 (bổ sung)
- [ ] Thêm field `buyerRequestNotes` vào form duyệt sản phẩm (review page)
- [ ] Thêm `deadline` cho yêu cầu báo giá (setup page)
- [ ] Upload ảnh tham khảo khi import sản phẩm

### Khâu 7 — Theo dõi đơn hàng
- [ ] Timeline dự kiến vs thực tế
- [ ] Chat theo từng purchase order
- [ ] Cảnh báo trễ tự động

### Khâu 8 — Nhập kho
- [ ] Form kiểm hàng: số lượng lỗi + upload ảnh kiểm
- [ ] Tính năng chuyển hàng liên kho HN ↔ SG

### Khâu 9 — Báo cáo & Thông báo
- [ ] Báo cáo hiệu suất NVMH
- [ ] Báo cáo theo sản phẩm (tồn + doanh thu)
- [ ] Export Excel/CSV
- [ ] Hệ thống thông báo in-app: báo giá mới / đơn trễ / hàng về kho / tồn thấp

---

## 11. File cấu trúc chính

```
app/
├── layout.tsx                    # Root layout + sidebar
├── page.tsx                      # Redirect to /dashboard
├── login/page.tsx                # Trang đăng nhập
├── dashboard/                    # Dashboard tổng quan
├── import/                       # Import sản phẩm từ Kalodata/Excel
├── imports/                      # Lịch sử import
├── review/                       # ADMIN duyệt sản phẩm
├── setup/                        # LEADER_PM thiết lập thuế/NVMH
├── pricing/                      # NVMH báo giá
│   └── [id]/                     # Chi tiết báo giá từng SP
├── decide/                       # ADMIN chốt nhập
├── kiot/                         # Tạo mã Kiot
└── api/                          # API routes

lib/
├── firebase.ts                   # Firebase helpers + interfaces
├── calc.ts                       # Công thức tính giá nhập
├── users.ts                      # Danh sách users (hardcoded)
└── auth.ts                       # NextAuth config

components/
├── layouts/                      # Sidebar, header
└── ui/
    └── ChatBox.tsx               # Component chat
```
