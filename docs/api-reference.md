# API Reference

Tất cả routes đều yêu cầu session JWT hợp lệ. Trả về `401` nếu chưa đăng nhập, `403` nếu không đủ quyền.

---

## Auth

### `GET/POST /api/auth/[...nextauth]`
NextAuth handler — đăng nhập, đăng xuất, session.

```
POST /api/auth/callback/credentials
Body: { email, password }
→ Set cookie session JWT
```

---

## Dashboard

### `GET /api/dashboard/stats`
Thống kê theo vai trò người dùng.

**ADMIN response:**
```json
{
  "role": "ADMIN",
  "pending_review": 5, "pending_setup": 3, "pricing": 8,
  "pending_final": 2, "done": 12, "rejected": 1,
  "totalImportCost": 50000000, "totalImportQty": 200,
  "nvImportSummary": [{ "id": "user_lan", "name": "Nguyễn Lan", "count": 5, "totalCost": 25000000 }],
  "pendingReviewList": [...], "doneList": [...], ...
}
```

**LEADER_PM response:**
```json
{
  "role": "LEADER_PM",
  "pending_setup": 3, "pricing": 8, "pending_final": 2, "done": 12,
  "totalImportCost": 50000000,
  "buyerProgress": [{ "id": "user_lan", "name": "Nguyễn Lan", "total": 10, "priced": 7, "pending": 3 }],
  "pricingList": [...], "pendingFinalList": [...], ...
}
```

**BUYER response:**
```json
{
  "role": "BUYER",
  "need_pricing": 3, "priced": 5, "decided": 4, "my_imports": 2,
  "totalMyImport": 10000000,
  "needPricingList": [...], "myImportList": [...]
}
```

---

## Tỷ giá

### `GET /api/daily-rates`
Lấy tỷ giá hôm nay (fallback về ngày gần nhất). Quyền: tất cả.

### `POST /api/daily-rates`
Cập nhật tỷ giá. Quyền: ADMIN, LEADER_PM.
```json
{ "fxRate": 3500, "intlFreightNguyenXe": 3000000, "intlFreightGhepXe": 3500000, "intlFreightPerKg": 50000 }
```

---

## Import sản phẩm

### `POST /api/kalodata/search`
Tìm kiếm Kalodata. Quyền: ADMIN.
```json
{ "dateRange": "last30Day", "sortBy": "growth", "keyword": "máy xay", "page": 1 }
```

### `GET /api/products/import`
Danh sách tên + URL đã có (để đánh dấu trùng). Quyền: ADMIN.

### `POST /api/products/import`
Import hàng loạt. Quyền: ADMIN.
```json
{ "products": [{ "name": "...", "market_price": 85000, "kaloUrl": "https://..." }] }
```
Response: `{ "added": 8, "skippedDup": 2, "skippedBlocked": 1 }`

---

## Duyệt sản phẩm

### `GET /api/review/products`
Danh sách chờ duyệt. Quyền: ADMIN.

### `PATCH /api/review/products/[id]`
Duyệt hoặc từ chối. Quyền: ADMIN.
```json
// Duyệt:
{ "action": "update", "specWeight": "250g", "specDimensions": "30×20×10cm", "status": "pending_setup" }
// Từ chối:
{ "action": "reject", "rejectReason": "Không phù hợp" }
```

### `POST /api/products/bulk-approve`
```json
{ "productIds": ["id1", "id2"], "specs": { "specWeight": "...", "specDimensions": "..." } }
```

### `POST /api/products/bulk-reject`
```json
{ "productIds": ["id1", "id2"], "rejectReason": "Lý do" }
```

---

## Thiết lập check giá

### `GET /api/setup/products` — Quyền: LEADER_PM, ADMIN
### `GET /api/setup/buyers` — Quyền: LEADER_PM, ADMIN

### `POST /api/products/[id]/setup`
Quyền: LEADER_PM, ADMIN.
```json
{ "exportTaxPct": 0, "importTaxPct": 8, "hsCode": "8509.40", "hsDescription": "Máy xay", "buyerIds": ["user_lan"] }
```

---

## Báo giá

### `GET /api/pricing/products` — Quyền: BUYER (chỉ SP được phân công)
### `GET /api/pricing/products/[id]` — Chi tiết + tỷ giá

### `POST /api/products/[id]/pricing`
Quyền: BUYER.
```json
{
  "factoryCny": 50, "volumeM3": 0.005, "domesticFreightCny": 2,
  "qtyPerBox": 10, "freightType": "nguyen_xe",
  "supplierName": "ABC Co.", "moq": "500 chiếc",
  "photos": ["https://..."], "videoUrl": ""
}
```
Hiệu ứng: tính `totalPerUnit/Box`, ghi vào `products/{id}` + `pricings/{id}/{userId}`, status → `pending_final`.

---

## Quyết định nhập

### `GET /api/decide/products` — Quyền: ADMIN, LEADER_PM

### `POST /api/products/[id]/decide`
Quyền: ADMIN.
```json
// Nhập hàng:
{ "decision": "import", "assignedBuyerId": "user_lan", "importQty": 20, "importWarehouse": "HN" }
// Huỷ:
{ "action": "cancel", "rejectReason": "Giá cao" }
// Sửa giá:
{ "action": "edit_price", "totalPerUnit": 215000, "totalImportCost": 4300000 }
```

---

## Kiot

### `GET /api/kiot/products` — Quyền: BUYER
### `POST /api/products/[id]/kiot` — Quyền: BUYER
```json
{ "kiotCode": "SP001234" }
```

---

## Danh sách đã nhập

### `GET /api/imports`
Quyền: ADMIN, LEADER_PM, BUYER (BUYER chỉ thấy SP của mình).
```json
{ "products": [...], "totalCost": 150000000, "totalQty": 500, "byBuyer": [...] }
```

---

## Tin nhắn

### `GET /api/products/[id]/messages`
### `POST /api/products/[id]/messages`
```json
{ "content": "Đã liên hệ NCC", "mediaUrl": "https://...", "mediaType": "image" }
```

---

## Thông báo

### `GET /api/notifications/unread`
```json
{ "count": 3 }
```

---

## Upload

### `POST /api/upload/image`
`multipart/form-data` field `image`. Giới hạn 8MB.
- Vercel Blob nếu có token → fallback base64
- Video quá lớn → `{ "error": "VIDEO_NO_STORAGE" }`

---

## Admin

### `DELETE /api/admin/reset-products`
Xoá tất cả sản phẩm `pending_review`. Quyền: ADMIN.
```json
{ "deleted": 15 }
```
