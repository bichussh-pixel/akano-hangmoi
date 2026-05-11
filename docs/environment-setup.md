# Cấu hình môi trường và triển khai

## Biến môi trường bắt buộc

Tạo file `.env.local` ở thư mục gốc:

```env
# NextAuth
NEXTAUTH_SECRET=your-secret-key-at-least-32-chars
NEXTAUTH_URL=https://your-domain.vercel.app

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_DATABASE_URL=https://your-project-default-rtdb.asia-southeast1.firebasedatabase.app

# Vercel Blob (upload ảnh/video)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxx

# Kalodata API (tuỳ chọn)
KALODATA_API_KEY=your-kalodata-api-key
```

---

## Thiết lập Firebase

1. Tạo project tại [console.firebase.google.com](https://console.firebase.google.com)
2. Bật **Realtime Database** → region asia-southeast1
3. Project Settings → Service accounts → Generate new private key
4. Copy `project_id`, `client_email`, `private_key` vào `.env.local`

**Database Rules (server-only access):**
```json
{ "rules": { ".read": false, ".write": false } }
```

---

## Thiết lập Vercel Blob

1. Vercel dashboard → Storage → Create new Blob store
2. Copy token vào `BLOB_READ_WRITE_TOKEN`

Không có token: ảnh fallback base64, video trả lỗi `VIDEO_NO_STORAGE`.

---

## Triển khai

### Lần đầu (Vercel CLI)
```bash
npm install -g vercel
vercel login
cd D:\Project\Akano\akano-hangmoi
vercel --prod
```

### Deploy thủ công (khi auto-deploy không hoạt động)
```bash
git pull origin master
npm install
vercel --prod
```

### Biến môi trường trên Vercel
Vercel Dashboard → Project → Settings → Environment Variables

> `FIREBASE_PRIVATE_KEY`: giữ nguyên `\n` hoặc dùng multiline trong Vercel UI.

---

## Chạy local

```bash
git clone https://github.com/bichussh-pixel/akano-hangmoi.git
cd akano-hangmoi
npm install
# Tạo .env.local với các biến môi trường
npm run dev
# → http://localhost:3000
```

---

## Quản lý users

Users được hardcode trong `lib/users.ts`.

**Đổi mật khẩu:**
```bash
node -e "const b = require('bcryptjs'); b.hash('matkhaumoi', 10).then(h => console.log(h))"
```
Sau đó cập nhật `const PW` trong `lib/users.ts`.

**Thêm user mới:**
```typescript
{ id: 'user_newname', name: 'Tên mới', email: 'new@akano.vn', role: 'BUYER', password: PW }
```

Các `role` hợp lệ: `'ADMIN'` · `'LEADER_PM'` · `'BUYER'`

---

## next.config.ts hiện tại

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: process.cwd() },
  typescript: { ignoreBuildErrors: true },
  serverExternalPackages: ['firebase-admin'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'kalodata.com' },
      { protocol: 'https', hostname: 'cf.shopee.vn' },
      { protocol: 'https', hostname: 'down-vn.img.susercontent.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
};

export default nextConfig;
```
