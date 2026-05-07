// ─── Danh sách users — không cần database ─────────────────────────────────────
// Mật khẩu mặc định: akano2026 (đã hash bằng bcrypt)
// Để đổi mật khẩu: cập nhật passwordHash tương ứng

import type { AppUser } from './firebase'

// bcrypt hash của 'akano2026'
const PW = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'

export const USERS: AppUser[] = [
  { id: 'user_bich',  name: 'Bích',        email: 'bich@akano.vn',  role: 'ADMIN',     password: PW },
  { id: 'user_tham',  name: 'Thắm',        email: 'tham@akano.vn',  role: 'LEADER_PM', password: PW },
  { id: 'user_lan',   name: 'Nguyễn Lan',  email: 'lan@akano.vn',   role: 'BUYER',     password: PW },
  { id: 'user_hoa',   name: 'Trần Hoa',    email: 'hoa@akano.vn',   role: 'BUYER',     password: PW },
  { id: 'user_mai',   name: 'Lê Mai',      email: 'mai@akano.vn',   role: 'BUYER',     password: PW },
  { id: 'user_thu',   name: 'Phạm Thu',    email: 'thu@akano.vn',   role: 'BUYER',     password: PW },
  { id: 'user_linh',  name: 'Vũ Linh',     email: 'linh@akano.vn',  role: 'BUYER',     password: PW },
]

export const BUYERS = USERS.filter(u => u.role === 'BUYER')

export function getUserById(id: string): AppUser | undefined {
  return USERS.find(u => u.id === id)
}

export function getUserByEmail(email: string): AppUser | undefined {
  return USERS.find(u => u.email === email)
}
