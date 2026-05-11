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
  const [pendingMedia, setPendingMedia] = useState<Array<{ url: string; type: 'image' | 'video' }>>([])
  const [hasUnread, setHasUnread] = useState(false)
  const chatScrollRef = useRef<HTMLDivElement>(null)
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
    const el = chatScrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  async function handleMediaSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploadingMedia(true)
    try {
      const results = await Promise.all(files.map(async (file) => {
        const fd = new FormData()
        fd.append('image', file)
        const res = await fetch('/api/upload/image', { method: 'POST', body: fd })
        const data = await res.json()
        if (!res.ok || data.error) return null
        const isVideo = file.type.startsWith('video/')
        return { url: data.url, type: isVideo ? 'video' : 'image' } as { url: string; type: 'image' | 'video' }
      }))
      const valid = results.filter(Boolean) as { url: string; type: 'image' | 'video' }[]
      if (valid.length) setPendingMedia(prev => [...prev, ...valid])
    } finally {
      setUploadingMedia(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if ((!content.trim() && !pendingMedia.length) || sending) return
    setSending(true)
    try {
      if (pendingMedia.length > 0) {
        for (let i = 0; i < pendingMedia.length; i++) {
          const m = pendingMedia[i]
          await fetch(`/api/products/${productId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: i === 0 ? content.trim() : '', mediaUrl: m.url, mediaType: m.type }),
          })
        }
      } else {
        await fetch(`/api/products/${productId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: content.trim() }),
        })
      }
      setContent('')
      setPendingMedia([])
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
      <div ref={chatScrollRef} className="h-56 overflow-y-auto p-4 space-y-3">
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
      </div>

      {/* Pending media preview */}
      {pendingMedia.length > 0 && (
        <div className="px-3 py-2 border-t border-[#E5E7EB] bg-[#F9FAFB] flex flex-wrap gap-2">
          {pendingMedia.map((m, i) => (
            <div key={i} className="relative">
              {m.type === 'image'
                ? <img src={m.url} alt="" className="w-12 h-12 object-cover rounded-lg border border-[#E5E7EB]" />
                : <video src={m.url} className="w-12 h-12 object-cover rounded-lg border border-[#E5E7EB]" />
              }
              <button
                type="button"
                onClick={() => setPendingMedia(prev => prev.filter((_, j) => j !== i))}
                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center leading-none"
              >×</button>
            </div>
          ))}
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
            multiple
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
          disabled={sending || (!content.trim() && !pendingMedia.length)}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 shrink-0"
          style={{ backgroundColor: '#E05B28' }}
        >
          Gửi
        </button>
      </form>
    </div>
  )
}
