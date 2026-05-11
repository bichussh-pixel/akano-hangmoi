# Kiến trúc hệ thống

## Công nghệ sử dụng

| Layer | Công nghệ | Phiên bản |
|-------|-----------|----------|
| Framework | Next.js (App Router) | 16.2.5 |
| Runtime | Node.js | — |
| Language | TypeScript | ^5 |
| UI | React | 19.2.4 |
| Styling | Tailwind CSS | ^4 |
| Database | Firebase Realtime Database | firebase-admin ^12 |
| Auth | NextAuth.js | ^5.0.0-beta.31 |
| File Storage | Vercel Blob | ^2.3.3 |
| Excel parsing | xlsx | ^0.18.5 |
| Password hashing | bcryptjs | ^3.0.3 |
| Hosting | Vercel | — |
| Build tool | Turbopack (dev) | built-in |

---

## Cấu trúc thư mục

```
akano-hangmoi/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Redirect → /dashboard
│   ├── login/
│   │   └── page.tsx              # Trang đăng nhập
│   ├── dashboard/
│   │   ├── page.tsx
│   │   └── DashboardContent.tsx  # Dashboard theo vai trò
│   ├── import/
│   │   ├── page.tsx
│   │   └── ImportContent.tsx     # Tìm & import SP từ Kalodata/Excel
│   ├── imports/
│   │   ├── page.tsx
│   │   └── ImportsContent.tsx    # Danh sách sản phẩm đã nhập
│   ├── review/
│   │   ├── page.tsx
│   │   └── ReviewContent.tsx     # Duyệt sản phẩm (Admin)
│   ├── setup/
│   │   ├── page.tsx
│   │   └── SetupContent.tsx      # Thiết lập check giá (LEADER_PM)
│   ├── pricing/
│   │   ├── page.tsx
│   │   ├── PricingContent.tsx    # Danh sách SP cần báo giá
│   │   ├── error.tsx
│   │   └── [id]/
│   │       ├── page.tsx
│   │       └── PricingProductContent.tsx  # Form báo giá chi tiết
│   ├── decide/
│   │   ├── page.tsx
│   │   └── DecideContent.tsx     # Quyết định nhập hàng (Admin)
│   ├── kiot/
│   │   ├── page.tsx
│   │   └── KiotContent.tsx       # Tạo mã Kiot (BUYER)
│   └── api/                      # API Routes
│       ├── auth/[...nextauth]/   # NextAuth handler
│       ├── dashboard/stats/      # Thống kê dashboard
│       ├── daily-rates/          # Tỷ giá & cước vận chuyển
│       ├── kalodata/search/      # Tìm kiếm Kalodata API
│       ├── products/
│       │   ├── import/           # Import sản phẩm
│       │   ├── bulk-approve/     # Duyệt hàng loạt
│       │   ├── bulk-reject/      # Từ chối hàng loạt
│       │   └── [id]/
│       │       ├── setup/        # Thiết lập check giá
│       │       ├── pricing/      # Nộp báo giá
│       │       ├── decide/       # Quyết định nhập
│       │       ├── photos/       # Thêm ảnh
│       │       ├── messages/     # Tin nhắn trao đổi
│       │       └── kiot/         # Gắn mã Kiot
│       ├── review/products/      # Duyệt sản phẩm
│       ├── setup/
│       │   ├── products/         # SP chờ setup
│       │   └── buyers/           # Danh sách NVMH
│       ├── pricing/products/     # SP cần báo giá
│       ├── decide/products/      # SP chờ quyết định
│       ├── kiot/products/        # SP của NVMH
│       ├── imports/              # Danh sách nhập
│       ├── notifications/unread/ # Thông báo chưa đọc
│       ├── upload/image/         # Upload ảnh/video
│       └── admin/reset-products/ # Reset dữ liệu (Admin)
├── components/
│   ├── layouts/
│   │   ├── AppLayout.tsx         # Wrapper layout toàn app
│   │   ├── Sidebar.tsx           # Sidebar navigation
│   │   └── MobileWrapper.tsx     # Responsive mobile wrapper
│   └── ui/
│       ├── ChatBox.tsx           # Chat trao đổi theo sản phẩm
│       └── ProductStatusBadge.tsx # Badge trạng thái SP
├── lib/
│   ├── auth.ts                   # NextAuth config + helpers
│   ├── calc.ts                   # Tính toán landed cost
│   ├── firebase.ts               # Firebase Admin + data layer
│   └── users.ts                  # Danh sách users (hardcoded)
├── docs/                         # Tài liệu hệ thống (thư mục này)
├── next.config.ts                # Next.js config
├── tsconfig.json                 # TypeScript config
└── package.json
```

---

## Luồng request

```
Browser
  │
  ▼
Next.js App Router (Vercel Edge)
  │
  ├── Page (Server Component) → kiểm tra session → render
  │
  └── API Route → auth() → xử lý logic → Firebase Admin SDK
                                              │
                                              ▼
                                    Firebase Realtime Database
```

---

## Authentication flow

```
1. User POST /api/auth/signin  (email + password)
2. NextAuth Credentials provider → getUserByEmail() → bcrypt.compare()
3. JWT token được tạo: { id, name, email, role }
4. Token lưu trong cookie (httpOnly, secure)
5. Mỗi API route gọi auth() để lấy session
6. Session.user.role kiểm soát quyền truy cập
```

---

## Deployment

- **Hosting:** Vercel
- **Database:** Firebase Realtime Database (Google Cloud)
- **Storage:** Vercel Blob (ảnh/video từ báo giá)
- **Branch production:** `master`
- **Build command:** `next build`
- **Output:** Server-side rendering (SSR/SSG mixed)
