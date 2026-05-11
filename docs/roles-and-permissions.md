# Phân quyền theo vai trò

## Tổng quan

Hệ thống có 3 vai trò: `ADMIN`, `LEADER_PM`, `BUYER`. Mỗi vai trò có sidebar riêng và quyền truy cập API khác nhau.

---

## ADMIN

**Người dùng:** Bích (`bich@akano.vn`)

**Sidebar navigation:**
- Dashboard
- Import Kalodata (`/import`)
- Duyệt hàng (`/review`)
- Chốt nhập (`/decide`)
- Đã nhập (`/imports`)

**Quyền truy cập:**

| Tính năng | Quyền |
|-----------|-------|
| Import sản phẩm từ Kalodata / Excel | ✅ |
| Duyệt sản phẩm (approve/reject) | ✅ |
| Duyệt / từ chối hàng loạt | ✅ |
| Xem danh sách chờ thiết lập | ✅ |
| Xem tất cả báo giá | ✅ |
| Quyết định nhập hàng (chọn NVMH, số lượng) | ✅ |
| Xem toàn bộ danh sách đã nhập | ✅ |
| Cập nhật tỷ giá hàng ngày | ✅ |
| Reset sản phẩm pending_review | ✅ |
| Chat trao đổi trong sản phẩm | ✅ |

**Dashboard ADMIN hiển thị:**
- Số lượng theo từng trạng thái: Chờ duyệt, Đang check giá, Chờ chốt, Đã nhập, Chờ thiết lập, Từ chối
- Tổng tiền nhập, tổng số lượng (thùng), số mã đã nhập
- Bảng tổng hợp NVMH: số mã nhập, tổng tiền theo từng người
- Hoạt động gần đây

---

## LEADER_PM

**Người dùng:** Thắm (`tham@akano.vn`)

**Sidebar navigation:**
- Dashboard
- Thiết lập check giá (`/setup`)
- Check giá (`/pricing`)
- Quyết định (`/decide`)
- DS nhập (`/imports`)

**Quyền truy cập:**

| Tính năng | Quyền |
|-----------|-------|
| Xem sản phẩm chờ thiết lập | ✅ |
| Thiết lập: thuế xuất/nhập, HS code, chỉ định NVMH | ✅ |
| Xem tất cả sản phẩm đang check giá | ✅ (xem, không sửa) |
| Xem tất cả báo giá | ✅ |
| Xem danh sách đã nhập | ✅ |
| Cập nhật tỷ giá hàng ngày | ✅ |
| Chat trao đổi trong sản phẩm | ✅ |

**Dashboard LEADER_PM hiển thị:**
- 4 thẻ: Đang check giá / Chờ Bích chốt / Đã nhập / Chờ thiết lập
- Bảng tiến độ từng NVMH: Tổng SP / Đã báo giá / Chờ báo / % tiến độ
- Tổng tiền đã nhập

---

## BUYER (NVMH)

**Người dùng:** Nguyễn Lan, Trần Hoa, Lê Mai, Phạm Thu, Vũ Linh

**Sidebar navigation:**
- Dashboard
- Check giá (`/pricing`)
- Tạo mã Kiot (`/kiot`)

**Quyền truy cập:**

| Tính năng | Quyền |
|-----------|-------|
| Xem sản phẩm được phân công | ✅ (chỉ của mình) |
| Báo giá sản phẩm | ✅ (chỉ SP được phân công) |
| Upload ảnh/video sản phẩm | ✅ |
| Chat trao đổi trong sản phẩm | ✅ |
| Tạo mã Kiot sau khi nhập hàng | ✅ (chỉ SP của mình) |
| Xem sản phẩm của người khác | ❌ |
| Duyệt / thiết lập / quyết định | ❌ |

**Dashboard BUYER hiển thị:**
- 4 thẻ: Cần báo giá / Đã báo giá / Đã chốt / Tôi nhập
- Tổng giá trị hàng được chỉ định nhập

---

## Kiểm tra quyền trong API

Mỗi API route đều thực hiện:

```typescript
const session = await auth()
if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
const user = session.user as { id: string; role: string }

// Kiểm tra role cụ thể
if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
```

Session được lưu trong JWT cookie, không có database session.
