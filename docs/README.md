# AKANO Hàng Mới — Tài liệu hệ thống

Hệ thống quản lý nhập hàng nội bộ của công ty AKANO, dùng để theo dõi toàn bộ quy trình từ tìm kiếm sản phẩm trên Kalodata đến nhập hàng thực tế.

---

## Mục lục tài liệu

| File | Nội dung |
|------|----------|
| [architecture.md](./architecture.md) | Kiến trúc hệ thống, công nghệ, cấu trúc thư mục |
| [product-lifecycle.md](./product-lifecycle.md) | Vòng đời sản phẩm — 6 trạng thái từ pending_review đến done |
| [roles-and-permissions.md](./roles-and-permissions.md) | Phân quyền theo vai trò: ADMIN, LEADER_PM, BUYER |
| [api-reference.md](./api-reference.md) | Toàn bộ API endpoints — request/response |
| [data-model.md](./data-model.md) | Mô hình dữ liệu Firebase Realtime Database |
| [pricing-calculation.md](./pricing-calculation.md) | Công thức tính giá nhập (landed cost) |
| [environment-setup.md](./environment-setup.md) | Biến môi trường và cấu hình triển khai |

---

## Tổng quan nhanh

**Mục đích:** Quản lý quy trình nhập hàng — từ phát hiện sản phẩm tiềm năng trên Kalodata, qua các bước duyệt, thiết lập, báo giá, đến quyết định nhập và tạo mã Kiot.

**Tech stack:**
- **Frontend/Backend:** Next.js 16.2.5 (App Router + API Routes)
- **Database:** Firebase Realtime Database (qua firebase-admin)
- **Auth:** NextAuth.js v5 — JWT, Credentials provider
- **Deployment:** Vercel
- **Storage:** Vercel Blob (upload ảnh/video)
- **Styling:** Tailwind CSS v4

**Người dùng:**

| Tên | Email | Vai trò |
|-----|-------|--------|
| Bích | bich@akano.vn | ADMIN |
| Thắm | tham@akano.vn | LEADER_PM |
| Nguyễn Lan | lan@akano.vn | BUYER |
| Trần Hoa | hoa@akano.vn | BUYER |
| Lê Mai | mai@akano.vn | BUYER |
| Phạm Thu | thu@akano.vn | BUYER |
| Vũ Linh | linh@akano.vn | BUYER |

**Mật khẩu mặc định:** `akano2026`
