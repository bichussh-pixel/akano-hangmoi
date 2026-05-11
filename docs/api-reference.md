# API Reference

Tất cả routes đều yêu cầu session JWT hợp lệ. Trả về `401` nếu chưa đăng nhập, `403` nếu không đủ quyền.

---

## Auth

### `GET/POST /api/auth/[...nextauth]`
NextAuth handler — xử lý đăng nhập, đăng xuất, session.

**Đăng nhập:**
```
POST /api/auth/callback/credentials
Body: { email, password }
→ Set cookie session JWT
```

---

## Dashboard

### `GET /api/dashboard/stats`
Trả về thống kê theo vai trò của người dùng hiện tại.

**Response ADMIN:**
```json
{
  "role": "ADMIN",
  "pending_review": 5,
  "pending_setup": 3,
  "pricing": 8,
  "pending_final": 2,
  "done": 12,
  "rejected": 1,
  "totalImportCost": 50000000,
  "totalImportQty": 200,
  "nvImportSummary": [
    { "id": "user_lan", "name": "Nguyễn Lan", "count": 5, "totalCost": 25000000 }
  ],
  "pendingReviewList": [...],
  "pendingSetupList": [...],
  "pricingList": [...],
  "pendingFinalList": [...],
  "doneList": [...],
  "rejectedList": [...],
  "recent": [...]
}
```

**Response LEADER_PM:**
```json
{
  "role": "LEADER_PM",
  "pending_setup": 3,
  "pricing": 8,
  "pending_final": 2,
  "done": 12,
  "totalImportCost": 50000000,
  "buyerProgress": [
    { "id": "user_lan", "name": "Nguyễn Lan", "total": 10, "priced": 7, "pending": 3 }
  ],
  "pricingList": [...],
  "pendingFinalList": [...],
  "doneList": [...],
  "pendingSetupList": [...]
}
```

**Response BUYER:**
```json
{
  "role": "BUYER",
  "need_pricing": 3,
  "priced": 5,
  "decided": 4,
  "total_assigned": 8,
  "my_imports": 2,
  "totalMyImport": 10000000,
  "needPricingList": [...],
  "pricedList": [...],
  "decidedList": [...],
  "myImportList": [...]
}
```

---

## Tỷ giá hàng ngày

### `GET /api/daily-rates`
Lấy tỷ giá hôm nay (fallback về ngày gần nhất có dữ liệu).

**Quyền:** Tất cả vai trò

**Response:**
```json
{
  "key": "2026-05-11",
  "fxRate": 3500,
  "intlFreightPerKg": 50000,
  "intlFreightNguyenXe": 3000000,
  "intlFreightGhepXe": 3500000,
  "createdBy": "user_bich",
  "createdAt": 1747000000000
}
```

### `POST /api/daily-rates`
Cập nhật tỷ giá hôm nay.

**Quyền:** ADMIN, LEADER_PM

**Body:**
```json
{
  "fxRate": 3500,
  "intlFreightPerKg": 50000,
  "intlFreightNguyenXe": 3000000,
  "intlFreightGhepXe": 3500000
}
```

---

## Import sản phẩm

### `POST /api/kalodata/search`
Tìm kiếm sản phẩm trên Kalodata API.

**Quyền:** ADMIN

**Body:**
```json
{
  "dateRange": "last30Day",
  "sortBy": "growth",
  "keyword": "máy xay",
  "page": 1
}
```

**Response:**
```json
{
  "products": [
    {
      "id": "...",
      "name": "Máy xay sinh tố mini",
      "market_price": 85000,
      "sales30d": 1200,
      "growth": 45.2,
      "category": "Gia dụng",
      "kaloUrl": "https://...",
      "shopUrl": "https://..."
    }
  ],
  "total": 150,
  "mock": false
}
```

*Nếu không có API key → trả về `mock: true` với dữ liệu mẫu.*

### `GET /api/products/import`
Lấy danh sách tên + URL đã có trong hệ thống (để UI đánh dấu trùng).

**Quyền:** ADMIN

**Response:**
```json
{
  "names": ["máy xay sinh tố mini", "giá treo quần áo", "..."],
  "urls": ["https://kalodata.com/...", "..."]
}
```

### `POST /api/products/import`
Import hàng loạt sản phẩm từ Kalodata/Excel vào hệ thống.

**Quyền:** ADMIN

**Body:**
```json
{
  "products": [
    {
      "name": "Máy xay sinh tố",
      "imageUrl": "https://...",
      "market_price": 85000,
      "sales30d": 1200,
      "growth": 45.2,
      "category": "Gia dụng",
      "kaloUrl": "https://...",
      "shopUrl": "https://..."
    }
  ]
}
```

**Response:**
```json
{ "added": 8, "skippedDup": 2, "skippedBlocked": 1 }
```

---

## Duyệt sản phẩm (Review)

### `GET /api/review/products`
Danh sách sản phẩm chờ duyệt và đã qua review.

**Quyền:** ADMIN

### `PATCH /api/review/products/[id]`
Duyệt hoặc từ chối một sản phẩm.

**Quyền:** ADMIN

**Body (duyệt):**
```json
{
  "action": "update",
  "specWeight": "250g",
  "specDimensions": "30×20×10 cm",
  "specMaterial": "Nhựa ABS",
  "specUseCases": "Xay sinh tố, làm đá",
  "status": "pending_setup"
}
```

**Body (từ chối):**
```json
{
  "action": "reject",
  "rejectReason": "Không phù hợp danh mục"
}
```

### `POST /api/products/bulk-approve`
Duyệt nhiều sản phẩm cùng lúc.

**Quyền:** ADMIN

**Body:**
```json
{
  "productIds": ["id1", "id2"],
  "specs": {
    "specWeight": "...",
    "specDimensions": "...",
    "specMaterial": "...",
    "specUseCases": "..."
  }
}
```

### `POST /api/products/bulk-reject`
Từ chối nhiều sản phẩm cùng lúc.

**Quyền:** ADMIN

**Body:**
```json
{
  "productIds": ["id1", "id2"],
  "rejectReason": "Lý do từ chối"
}
```

---

## Thiết lập check giá (Setup)

### `GET /api/setup/products`
Danh sách sản phẩm đang chờ thiết lập.

**Quyền:** LEADER_PM, ADMIN

### `GET /api/setup/buyers`
Danh sách NVMH có thể được phân công.

**Quyền:** LEADER_PM, ADMIN

**Response:**
```json
[
  { "id": "user_lan", "name": "Nguyễn Lan" },
  { "id": "user_hoa", "name": "Trần Hoa" }
]
```

### `POST /api/products/[id]/setup`
Thiết lập thông tin thuế và phân công NVMH, chuyển sang trạng thái `pricing`.

**Quyền:** LEADER_PM, ADMIN

**Body:**
```json
{
  "exportTaxPct": 0,
  "importTaxPct": 8,
  "hsCode": "8509.40",
  "hsDescription": "Máy xay, trộn thực phẩm",
  "buyerIds": ["user_lan", "user_hoa"]
}
```

---

## Báo giá (Pricing)

### `GET /api/pricing/products`
Danh sách sản phẩm cần báo giá (chỉ trả về SP được phân công cho user hiện tại).

**Quyền:** BUYER, LEADER_PM, ADMIN

### `GET /api/pricing/products/[id]`
Chi tiết một sản phẩm kèm tỷ giá hiện tại.

**Quyền:** BUYER (chỉ SP được phân công), LEADER_PM, ADMIN

### `POST /api/products/[id]/pricing`
Nộp báo giá cho một sản phẩm.

**Quyền:** BUYER

**Body:**
```json
{
  "factoryCny": 50,
  "weightKg": 0.25,
  "volumeM3": 0.005,
  "domesticFreightCny": 2,
  "inspectionVnd": 0,
  "quarantineCny": 0,
  "qtyPerBox": 10,
  "supplierName": "Guangzhou ABC Co.",
  "supplierContact": "WeChat: abc123",
  "moq": "500 chiếc",
  "leadTime": "15 ngày",
  "pricingNotes": "Giá tốt, có thể thương lượng",
  "freightType": "nguyen_xe",
  "photos": ["https://...", "https://..."],
  "videoUrl": ""
}
```

**Hiệu ứng:**
- Tính `totalPerUnit`, `totalPerBox` qua `calculateLandedCost()`
- Ghi vào `products/{id}` (ghi đè — chỉ lưu báo giá mới nhất của SP)
- Ghi vào `pricings/{id}/{userId}` (lưu lịch sử của từng NVMH)
- Chuyển status → `pending_final`

---

## Quyết định nhập (Decide)

### `GET /api/decide/products`
Danh sách sản phẩm chờ quyết định và đã quyết định.

**Quyền:** ADMIN, LEADER_PM

### `POST /api/products/[id]/decide`
Đưa ra quyết định nhập hàng.

**Quyền:** ADMIN

**Body (nhập hàng):**
```json
{
  "decision": "import",
  "assignedBuyerId": "user_lan",
  "importQty": 20,
  "importWarehouse": "HN"
}
```

**Body (huỷ):**
```json
{
  "action": "cancel",
  "rejectReason": "Giá quá cao"
}
```

**Body (sửa giá sau quyết định):**
```json
{
  "action": "edit_price",
  "totalPerUnit": 215000,
  "totalImportCost": 4300000
}
```

---

## Kiot

### `GET /api/kiot/products`
Sản phẩm của NVMH hiện tại đang ở trạng thái `done`.

**Quyền:** BUYER

### `POST /api/products/[id]/kiot`
Gắn mã Kiot cho sản phẩm sau khi nhập về.

**Quyền:** BUYER (chỉ SP được phân công)

**Body:**
```json
{ "kiotCode": "SP001234" }
```

---

## Danh sách đã nhập (Imports)

### `GET /api/imports`
Toàn bộ sản phẩm có status `done`.

**Quyền:** ADMIN, LEADER_PM, BUYER (BUYER chỉ thấy SP của mình)

**Response:**
```json
{
  "products": [...],
  "totalCost": 150000000,
  "totalQty": 500,
  "byBuyer": [
    { "id": "user_lan", "name": "Nguyễn Lan", "count": 5, "totalCost": 60000000 }
  ]
}
```

---

## Tin nhắn sản phẩm

### `GET /api/products/[id]/messages`
Lấy toàn bộ tin nhắn trong thread của sản phẩm (sắp xếp theo thời gian tăng dần).

**Quyền:** Tất cả vai trò (phải có quyền truy cập sản phẩm)

### `POST /api/products/[id]/messages`
Gửi tin nhắn hoặc media.

**Quyền:** Tất cả vai trò

**Body:**
```json
{
  "content": "Mình đã liên hệ NCC rồi nhé",
  "mediaUrl": "https://...",
  "mediaType": "image"
}
```

---

## Thông báo

### `GET /api/notifications/unread`
Đếm số sản phẩm có tin nhắn mới trong 2 giờ gần nhất (chưa đọc).

**Quyền:** Tất cả vai trò

**Response:**
```json
{ "count": 3 }
```

---

## Upload file

### `POST /api/upload/image`
Upload ảnh hoặc video.

**Quyền:** BUYER, ADMIN, LEADER_PM

**Request:** `multipart/form-data` với field `image`

**Response (thành công):**
```json
{ "url": "https://blob.vercel-storage.com/..." }
```

**Response (video quá lớn):**
```json
{ "error": "VIDEO_NO_STORAGE" }
```

**Giới hạn:**
- Kích thước: 8MB
- Loại file: `image/*`, `video/*`
- Ưu tiên: Vercel Blob (nếu có `BLOB_READ_WRITE_TOKEN`) → fallback base64 data URL

---

## Ảnh sản phẩm

### `POST /api/products/[id]/photos`
Thêm URL ảnh vào mảng `photos` của sản phẩm.

**Quyền:** BUYER

**Body:**
```json
{ "url": "https://..." }
```

---

## Admin

### `DELETE /api/admin/reset-products`
Xoá toàn bộ sản phẩm đang ở trạng thái `pending_review`.

**Quyền:** ADMIN

**Response:**
```json
{ "deleted": 15 }
```
