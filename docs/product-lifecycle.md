# Vòng đời sản phẩm

## Sơ đồ trạng thái

```
[Kalodata / Excel]
        │
        ▼ ADMIN import
  pending_review
        │
        ├─── ADMIN từ chối ──────────────────────────────► rejected
        │
        ▼ ADMIN duyệt + nhập specs
  pending_setup
        │
        ▼ LEADER_PM thiết lập (thuế, NVMH)
    pricing
        │
        ▼ BUYER báo giá
  pending_final
        │
        ├─── ADMIN huỷ ──────────────────────────────────► rejected
        │
        ▼ ADMIN chọn NVMH + số lượng nhập
      done
        │
        ▼ BUYER tạo mã Kiot (tuỳ chọn)
    [kiotCode]
```

---

## Chi tiết từng bước

### Bước 1 — `pending_review` (Chờ duyệt)

**Người thực hiện:** ADMIN (Bích)

**Nguồn sản phẩm:**
- Tìm kiếm qua Kalodata API theo danh mục, từ khoá, khoảng thời gian
- Upload file Excel từ Kalodata (`.xlsx`)

**Lọc tự động khi import:**
- Loại trừ sản phẩm theo tên: bột giặt, nước giặt, áo thun, giày, kem dưỡng...
- Loại trừ theo danh mục: hóa chất, tinh dầu, thời trang, mỹ phẩm...
- Bỏ qua sản phẩm trùng (theo tên hoặc URL Kalodata)

**Dữ liệu được ghi:**
```
status: "pending_review"
name, imageUrl, marketPrice
sales30d, revenue30d, growthRate
kaloUrl, shopUrl, category
createdAt
```

**Hành động có thể:**
- **Duyệt** → chuyển sang `pending_setup`, ghi `checkCode`, `approvedAt`, specs
- **Từ chối** → chuyển sang `rejected`, ghi `rejectReason`
- **Duyệt hàng loạt** (bulk approve)
- **Từ chối hàng loạt** (bulk reject)

**Check code format:** `AKN{YYYYMMDD}{3 số thứ tự}` — ví dụ: `AKN20260511001`

---

### Bước 2 — `pending_setup` (Chờ thiết lập)

**Người thực hiện:** LEADER_PM (Thắm)

**Nhiệm vụ:**
- Nhập mã HS code và mô tả HS
- Nhập % thuế xuất khẩu, % thuế nhập khẩu
- Chọn NVMH (1 hoặc nhiều người) để báo giá

**Dữ liệu được ghi:**
```
status: "pricing"
exportTaxPct, importTaxPct
hsCode, hsDescription
dailyRateDate
assignments/{productId}: [userId, ...]
```

---

### Bước 3 — `pricing` (Đang check giá)

**Người thực hiện:** BUYER

**Inputs cần nhập:**

| Field | Đơn vị | Mô tả |
|-------|---------|-------|
| factoryCny | CNY/chiếc | Giá xuất xưởng |
| weightKg | kg/chiếc | Cân nặng |
| volumeM3 | m³/chiếc | Thể tích (tính cước) |
| domesticFreightCny | CNY/chiếc | Cước nội địa TQ |
| inspectionVnd | VND/chiếc | Phí kiểm định |
| quarantineCny | CNY/chiếc | Phí kiểm dịch |
| qtyPerBox | chiếc/thùng | Số lượng/thùng |
| supplierName | text | Tên nhà cung cấp |
| supplierContact | text | Liên hệ NCC |
| moq | text | Số lượng tối thiểu |
| leadTime | text | Thời gian giao hàng |
| freightType | nguyen_xe / ghep_xe | Loại vận chuyển QT |

**Dữ liệu được ghi:**
- `products/{id}`: tất cả fields + `totalPerUnit`, `totalPerBox`, `pricedBy`, status → `pending_final`
- `pricings/{productId}/{userId}`: lưu bản báo giá của từng NVMH

---

### Bước 4 — `pending_final` (Chờ quyết định)

**Người thực hiện:** ADMIN (Bích)

**Dữ liệu được ghi khi nhập:**
```
status: "done"
assignedBuyerId
importQty
importWarehouse ("HN" | "SG" | "BOTH")
totalImportCost
decidedBy, decidedAt
```

**Dữ liệu được ghi khi huỷ:**
```
status: "rejected"
rejectReason
```

---

### Bước 5 — `done` (Đã nhập)

**Người thực hiện:** BUYER được chỉ định

```
kiotCode
kiotCreatedAt
```

---

## Quy tắc lọc khi import

**Bị chặn theo tên:** bột giặt, nước giặt, áo thun, váy đầm, giày, kem dưỡng, serum...

**Bị chặn theo danh mục:** hóa chất, tinh dầu, nước hoa, mỹ phẩm, thời trang, giày dép...
