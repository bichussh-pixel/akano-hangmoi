# Phân quyền theo vai trò

## Tổng quan

Hệ thống có 3 vai trò: `ADMIN`, `LEADER_PM`, `BUYER`. Mỗi vai trò có sidebar riêng và quyền truy cập API khác nhau.

---

## ADMIN

**Người dùng:** Bích (`bich@akano.vn`)

**Sidebar:** Dashboard · Import Kalodata · Duyệt hàng · Chốt nhập · Đã nhập

| Tính năng | Quyền |
|-----------|-------|
| Import sản phẩm từ Kalodata / Excel | ✅ |
| Duyệt sản phẩm (approve/reject) | ✅ |
| Duyệt / từ chối hàng loạt | ✅ |
| Quyết định nhập hàng | ✅ |
| Xem toàn bộ danh sách đã nhập | ✅ |
| Cập nhật tỷ giá hàng ngày | ✅ |
| Reset sản phẩm pending_review | ✅ |
| Chat trong sản phẩm | ✅ |

**Dashboard:** 6 thẻ trạng thái + tổng tiền nhập + bảng tổng hợp NVMH

---

## LEADER_PM

**Người dùng:** Thắm (`tham@akano.vn`)

**Sidebar:** Dashboard · Thiết lập check giá · Check giá · Quyết định · DS nhập

| Tính năng | Quyền |
|-----------|-------|
| Thiết lập thuế, HS code, phân công NVMH | ✅ |
| Xem sản phẩm đang check giá | ✅ (xem, không sửa) |
| Xem tất cả báo giá | ✅ |
| Xem danh sách đã nhập | ✅ |
| Cập nhật tỷ giá hàng ngày | ✅ |
| Chat trong sản phẩm | ✅ |

**Dashboard:** 4 thẻ (Đang check giá / Chờ Bích chốt / Đã nhập / Chờ thiết lập) + bảng tiến độ NVMH

---

## BUYER (NVMH)

**Người dùng:** Nguyễn Lan, Trần Hoa, Lê Mai, Phạm Thu, Vũ Linh

**Sidebar:** Dashboard · Check giá · Tạo mã Kiot

| Tính năng | Quyền |
|-----------|-------|
| Xem sản phẩm được phân công | ✅ (chỉ của mình) |
| Báo giá sản phẩm | ✅ |
| Upload ảnh/video | ✅ |
| Tạo mã Kiot | ✅ (chỉ SP của mình) |
| Duyệt / thiết lập / quyết định | ❌ |

**Dashboard:** 4 thẻ (Cần báo giá / Đã báo giá / Đã chốt / Tôi nhập)

---

## Kiểm tra quyền trong API

```typescript
const session = await auth()
if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
const user = session.user as { id: string; role: string }
if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
```
