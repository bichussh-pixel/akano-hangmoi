const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
  new: { label: 'Mới', bg: '#F3F4F6', color: '#6B7280' },
  pending_review: { label: 'Chờ duyệt', bg: '#DBEAFE', color: '#2563EB' },
  pending_setup: { label: 'Chờ thiết lập', bg: '#EDE9FE', color: '#7C3AED' },
  pricing: { label: 'Đang check giá', bg: '#FFF3EE', color: '#E05B28' },
  pending_final: { label: 'Chờ chốt', bg: '#FEF3C7', color: '#D97706' },
  done: { label: 'Đã nhập', bg: '#DCFCE7', color: '#16A34A' },
  rejected: { label: 'Từ chối', bg: '#FEE2E2', color: '#DC2626' },
}

export default function ProductStatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] || statusConfig.new
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  )
}
