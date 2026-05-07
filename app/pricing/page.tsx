import AppLayout from '@/components/layouts/AppLayout'
import dynamic from 'next/dynamic'

// Render entirely on client — avoids any server-side crash
const PricingContent = dynamic(() => import('./PricingContent'), {
  ssr: false,
  loading: () => (
    <div>
      <h1 className="text-2xl font-bold text-[#111827] mb-6">💰 Check giá</h1>
      <div className="space-y-3 animate-pulse">
        {[0, 1, 2].map(i => (
          <div key={i} className="bg-white rounded-xl border border-[#E5E7EB] h-20" />
        ))}
      </div>
    </div>
  ),
})

export default function PricingPage() {
  return (
    <AppLayout>
      <PricingContent />
    </AppLayout>
  )
}
