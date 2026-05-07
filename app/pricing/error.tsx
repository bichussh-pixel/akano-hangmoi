'use client'

import { useEffect } from 'react'

export default function PricingError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[PricingError]', error)
  }, [error])

  return (
    <div className="max-w-xl mx-auto mt-20 text-center">
      <div className="text-4xl mb-4">⚠️</div>
      <h2 className="text-lg font-bold text-[#111827] mb-2">Trang bị lỗi</h2>
      <p className="text-sm text-[#6B7280] mb-4 font-mono bg-[#F3F4F6] px-3 py-2 rounded">
        {error.message || 'Unknown error'}
      </p>
      <button
        onClick={reset}
        className="px-5 py-2 rounded-lg text-white text-sm font-semibold"
        style={{ backgroundColor: '#E05B28' }}
      >
        Thử lại
      </button>
    </div>
  )
}
