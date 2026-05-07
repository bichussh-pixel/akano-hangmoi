'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })
      if (res?.error) {
        setError('Email hoặc mật khẩu không đúng. Vui lòng thử lại.')
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch {
      setError('Đã có lỗi xảy ra. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center text-white text-2xl font-bold mb-4"
              style={{ backgroundColor: '#E05B28' }}
            >
              A
            </div>
            <h1 className="text-2xl font-bold text-[#111827]">AKANO Hàng Mới</h1>
            <p className="text-[#6B7280] text-sm mt-1">Hệ thống phát triển sản phẩm mới</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-[#FEE2E2] text-[#DC2626] text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#111827] mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ten@akano.vn"
                className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-[#111827] placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ '--tw-ring-color': '#E05B28' } as any}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#111827] mb-1.5">
                Mật khẩu
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-[#111827] placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg text-white font-semibold transition-opacity disabled:opacity-60 mt-2"
              style={{ backgroundColor: '#E05B28' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Đang đăng nhập...
                </span>
              ) : (
                'Đăng nhập'
              )}
            </button>
          </form>

          <p className="text-center text-xs text-[#6B7280] mt-6">
            AKANO &copy; 2026 — Hệ thống nội bộ
          </p>
        </div>
      </div>
    </div>
  )
}
