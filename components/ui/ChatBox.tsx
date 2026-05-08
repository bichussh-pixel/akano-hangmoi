'use client'

import { useState, useEffect, useRef } from 'react'

interface Message {
  id: string
  content: string
  createdAt: number
  senderId: string
  senderName: string
  mediaUrl?: string
  mediaType?: 'image' | 'video'
}

interface ChatBoxProps {
  productId: string
  currentUser: { id: string; name: string; role: string }
}

export default function ChatBox({ productId, currentUser }: ChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [pendingMedia, setPendingMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null)
  const [hasUnread, setHasUnread] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function markSeen() {
    localStorage.setItem(`chat_seen_${productId}`, String(Date.now()))
    setHasUnread(false)
  }

  async function fetchMessages() {
    try {
      const res = await fetch(`/api/products/${productId}/messages`)
      if (res.ok) {
        const data = await res.json()
        const msgs: Message[] = Array.isArray(data) ? data : (data.messages || [])
        setMessages(msgs)
        const lastSeen = parseInt(localStorage.getItem(`chat_seen_${productId}`) || '0')
        const newMsgs = msgs.filter((m: Message) => m.createdAt > lastSeen && m.senderId !== currentUser.id)
        setHasUnread(newMsgs.length > 0)
      }
    } catch {}
  }

  useEffect(() => {
    fetchMessages()
    const interval = setInterval(fetchMessages, 3000)
    return () => clearInterval(interval)
  }, [productId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleMediaSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingMedia(true)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await fetch('/api/upload/image', { method: 'POST', body: fd })
      const data = await res.json()
      const isVideo = file.type.startsWith('video/')
      setPendingMedia({ url: data.url, type: isVideo ? 'video' : 'image' })
    } finally {
      setUploadingMedia(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if ((!content.trim() && !pendingMedia) || sending) return
    setSending(true)
    try {
      const body: any = { content: content.trim() || '' }
      if (pendingMedia) { body.mediaUrl = pendingMedia.url; body.mediaType = pendingMedia.type }
      await fetch(`/api/products/${productId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      setContent('')
      setPendingMedia(null)
      markSeen()
      await fetchMessages()
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="border border-[#E5E7EB] rounded-xl overflow-hidden bg-white" onClick={markSeen}>
      <div className="px-4 py-3 border-b border-[#E5E7EB] bg-[#F9FAFB]">
        <h4 className="text-sm font-semibold text-[#111827] flex items-center gap-2">
          💬 Trao đổi
          {hasUnread && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />}
        </h4>
      </div>
      <div className="h-56 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-xs text-[#6B7280] text-center py-4">Chưa có tin nhắn</p>
        )}
        {messages.map((msg) => {
          const isMine = msg.senderId === currentUser.id
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[75%]">
                {!isMine && (
                  <div className="text-xs text-[#6B7280] mb-1">{msg.senderName}</div>
                )}
                <div
                  className="px-3 py-2 rounded-xl text-sm"
                  style={{
                    backgroundColor: isMine ? '#E05B28' : '#F3F4F6',
                    color: isMine ? 'white' : '#111827',
                  }}
                >
                  {msg.mediaUrl && msg.mediaType === 'image' && (
                    <img
                      src={msg.mediaUrl}
                      alt=""
                      className="max-w-full rounded-lg mb-1"
                      style={{ maxHeight: 200 }}
                    />
                  )}
                  {msg.mediaUrl && msg.mediaType === 'video' && (
                    <video
                      src={msg.mediaUrl}
                      controls
                      className="max-w-full rounded-lg mb-1"
                      style={{ maxHeight: 200 }}
                    />
                  )}
                  {msg.content && <span>{msg.content}</span>}
                </div>
                <div className="text-xs text-[#6B7280] mt-0.5">
                  {new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Pending media preview */}
      {pendingMedia && (
        <div className="px-3 py-2 border-t border-[#E5E7EB] bg-[#F9FAFB] flex items-center gap-2">
          {pendingMedia.type === 'image' ? (
            <img src={pendingMedia.url} alt="" className="w-12 h-12 object-cover rounded-lg border border-[#E5E7EB]" />
          ) : (
            <video src={pendingMedia.url} className="w-12 h-12 object-cover rounded-lg border border-[#E5E7EB]" />
          )}
          <span className="text-xs text-[#6B7280] flex-1">
            {pendingMedia.type === 'video' ? '🎥 Video đã chọn' : '🖼 Ảnh đã chọn'}
          </span>
          <button
            type="button"
            onClick={() => setPendingMedia(null)}
            className="text-xs text-red-500 hover:text-red-700"
          >
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSend} className="p-3 border-t border-[#E5E7EB] flex gap-2 items-center">
        {/* Media attach button */}
        <label
          className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer text-[#6B7280] hover:text-[#E05B28] hover:bg-[#FFF3EE] transition-colors shrink-0"
          title="Đính kèm ảnh/video"
        >
          <span className="text-base">{uploadingMedia ? '⏳' : '📎'}</span>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            disabled={uploadingMedia || sending}
            onChange={handleMediaSelect}
          />
        </label>
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Nhập tin nhắn..."
          className="flex-1 px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#E05B28]"
        />
        <button
          type="submit"
          disabled={sending || (!content.trim() && !pendingMedia)}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 shrink-0"
          style={{ backgroundColor: '#E05B28' }}
        >
          Gửi
        </button>
      </form>
    </div>
  )
}
