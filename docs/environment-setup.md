# Cấu hình môi trường và triển khai

## Biến môi trường bắt buộc

Tạo file `.env.local` ở thư mục gốc (không commit lên Git):

```env
# ── NextAuth ──────────────────────────────────────────────
NEXTAUTH_SECRET=your-secret-key-at-least-32-chars
NEXTAUTH_URL=https://your-domain.vercel.app

# ── Firebase Admin SDK ────────────────────────────────────
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_DATABASE_URL=https://your-project-default-rtdb.asia-southeast1.firebasedatabase.app

# ── Vercel Blob (upload ảnh/video) ─────────────────────────
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxx

# ── Kalodata API (tuỳ chọn) ───────────────────────────────
KALODATA_API_KEY=your-kalodata-api-key
```

---

## Thiết lập Firebase

### 1. Tạo Firebase project

1. Vào [console.firebase.google.com](https://console.firebase.google.com)
2. Tạo project mới
3. Bật **Realtime Database** (chọn region gần nhất — asia-southeast1)
4. Chọn mode **Test** ban đầu (sau này chuyển sang Production rules)

### 2. Lấy Service Account credentials

1. Project Settings → Service accounts
2. Click "Generate new private key"
3. Tải file JSON xuống
4. Copy các giá trị vào `.env.local`:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY`

### 3. Firebase Realtime Database Rules

```json
{
  "rules": {
    ".read": false,
    ".write": false
  }
}
```

*App dùng Firebase Admin SDK (server-side) nên rules chỉ cần block public access.*

---

## Thiết lập Vercel Blob

1. Vào Vercel dashboard → Storage → Create new Blob store
2. Copy token vào `BLOB_READ_WRITE_TOKEN`

Nếu không có Blob token:
- Ảnh: fallback sang base64 data URL (lưu thẳng vào Firebase — không khuyến nghị cho production)
- Video: trả về lỗi `VIDEO_NO_STORAGE`, user phải dùng URL video ngoài

---

## Cấu hình NextAuth

`NEXTAUTH_SECRET` — chuỗi ngẫu nhiên tối thiểu 32 ký tự. Sinh bằng:

```bash
openssl rand -base64 32
```

`NEXTAUTH_URL` — URL đầy đủ của app (bao gồm https://). Trên Vercel production thường là:
```
https://akano-hangmoi.vercel.app
```

---

## Triển khai lên Vercel

### Lần đầu (qua Vercel CLI)

```bash
npm install -g vercel
vercel login
cd D:\Project\Akano\akano-hangmoi
vercel --prod
```

Vercel sẽ hỏi project name và framework (chọn Next.js).

### Các lần sau

Vercel tự động build khi có commit mới lên branch production (master).

Nếu auto-deploy không hoạt động — deploy thủ công:
```bash
git pull origin master
npm install
vercel --prod
```

### Thêm biến môi trường trên Vercel

1. Vercel Dashboard → Project → Settings → Environment Variables
2. Thêm từng biến từ `.env.local`
3. Lưu ý `FIREBASE_PRIVATE_KEY`: phải giữ nguyên `\n` trong key (hoặc dùng multiline trong Vercel UI)

---

## Chạy development local

```bash
# Clone và cài đặt
git clone https://github.com/bichussh-pixel/akano-hangmoi.git
cd akano-hangmoi
npm install

# Tạo file env
cp .env.example .env.local   # nếu có, hoặc tạo thủ công

# Chạy dev server
npm run dev
# → http://localhost:3000
```

---

## Thêm/đổi mật khẩu người dùng

Users được hardcode trong `lib/users.ts`. Để đổi mật khẩu:

```bash
# Tạo hash mới cho password
node -e "const b = require('bcryptjs'); b.hash('matkhaumoi', 10).then(h => console.log(h))"
```

Sau đó cập nhật `const PW = '...'` trong `lib/users.ts`.

---

## Thêm người dùng mới

Mở `lib/users.ts` và thêm vào mảng `USERS`:

```typescript
{ id: 'user_newname', name: 'Tên mới', email: 'new@akano.vn', role: 'BUYER', password: PW }
```

Các `role` hợp lệ: `'ADMIN'`, `'LEADER_PM'`, `'BUYER'`

---

## next.config.ts

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),        // Bắt buộc cho Turbopack dev server
  },
  typescript: {
    ignoreBuildErrors: true,    // Bỏ qua lỗi TS trong build (không khuyến nghị long-term)
  },
  serverExternalPackages: ['firebase-admin'],  // Không bundle firebase-admin
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
