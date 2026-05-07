'use client'

import { useState, useEffect, useRef } from 'react'

interface Message {
  id: string
  content: string
  createdAt: number
  senderId: string
  senderName: string
}

interface ChatBoxProps {
  productId: string
  currentUser: { id: string; name: string; role: string }
}

export default function ChatBox({ productId, currentUser }: ChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  async function fetchMessages() {
    try {
      const res = await fetch(`/api/products/${productId}/messages`)
      if (res.ok) {
        const data = await res.json()
        setMessages(Array.isArray(data) ? data : (data.messages || []))
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

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() || sending) return
    setSending(true)
    try {
      await fetch(`/api/products/${productId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      setContent('')
      await fetchMessages()
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="border border-[#E5E7EB] rounded-xl overflow-hidden bg-white">
      <div className="px-4 py-3 border-b border-[#E5E7EB] bg-[#F9FAFB]">
        <h4 className="text-sm font-semibold text-[#111827]">💬 Trao đổi</h4>
      </div>
      <div className="h-48 overflow-y-auto p-4 space-y-3">
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
                  {msg.content}
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
      <form onSubmit={handleSend} className="p-3 border-t border-[#E5E7EB] flex gap-2">
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Nhập tin nhắn..."
          className="flex-1 px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#E05B28]"
        />
        <button
          type="submit"
          disabled={sending || !content.trim()}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: '#E05B28' }}
        >
          Gửi
        </button>
      </form>
    </div>
  )
}
