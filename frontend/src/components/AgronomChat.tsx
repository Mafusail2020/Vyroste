import { useEffect, useRef, useState } from 'react'
import api from '../lib/api'

interface Msg {
  id: string
  role: 'user' | 'assistant'
  content: string
  tool_trace?: string[]
  created_at?: string
}
interface Chat { id: string; title: string }

const TOOL_LABEL: Record<string, string> = {
  get_garden_context: 'контекст саду',
  search_knowledge:   'база знань',
  find_nursery:       'розсадники',
  get_calendar:       'календар',
}

const SEED_PROMPT = 'Розкажи детальніше про мій діагноз і що робити далі.'

// Tiny linkifier: /knowledge/slug + http(s) links → anchors, rest as text.
function renderContent(text: string) {
  const parts = text.split(/(\/knowledge\/[a-z0-9-]+|https?:\/\/[^\s]+)/gi)
  return parts.map((p, i) => {
    if (/^\/knowledge\//.test(p) || /^https?:\/\//.test(p)) {
      return <a key={i} href={p} target={p.startsWith('http') ? '_blank' : undefined} rel="noreferrer"
        className="text-forest underline break-words">{p}</a>
    }
    return <span key={i}>{p}</span>
  })
}

export default function AgronomChat({ calendarId, seedScanId, onSeedHandled }: {
  calendarId?: string
  seedScanId?: string | null
  onSeedHandled?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [chatId, setChatId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [chats, setChats] = useState<Chat[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) api.get<Chat[]>('/api/agronom/chats').then(r => setChats(r.data)).catch(() => {})
  }, [open])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  // Open seeded from a fresh diagnosis.
  useEffect(() => {
    if (!seedScanId) return
    setOpen(true)
    setShowHistory(false)
    startChat(SEED_PROMPT, seedScanId)
    onSeedHandled?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedScanId])

  function newChat() {
    setChatId(null); setMessages([]); setShowHistory(false)
  }

  async function loadChat(id: string) {
    setShowHistory(false)
    try {
      const r = await api.get<{ chat: Chat; messages: Msg[] }>(`/api/agronom/chats/${id}`)
      setChatId(id); setMessages(r.data.messages)
    } catch { /* ignore */ }
  }

  async function startChat(text: string, scanId?: string) {
    setSending(true)
    setMessages([{ id: 'tmp', role: 'user', content: text }])
    try {
      const r = await api.post<{ chat: Chat; messages: Msg[] }>('/api/agronom/chats', {
        calendar_id: calendarId, scan_id: scanId, message: text,
      })
      setChatId(r.data.chat.id); setMessages(r.data.messages)
      setChats(prev => [r.data.chat, ...prev])
    } catch (err: unknown) {
      if ((err as { response?: { status?: number } }).response?.status === 503) setUnavailable(true)
      setMessages([])
    } finally {
      setSending(false)
    }
  }

  async function send() {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    if (!chatId) { await startChat(text); return }
    setSending(true)
    setMessages(prev => [...prev, { id: `tmp-${Date.now()}`, role: 'user', content: text }])
    try {
      const r = await api.post<Msg>(`/api/agronom/chats/${chatId}/message`, { content: text })
      setMessages(prev => [...prev, r.data])
    } catch (err: unknown) {
      if ((err as { response?: { status?: number } }).response?.status === 503) setUnavailable(true)
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-[60] w-14 h-14 rounded-full bg-[#6E9150] text-white text-2xl shadow-xl hover:bg-[#5e7d42] hover:scale-105 transition-all flex items-center justify-center"
        aria-label="AI Агроном чат"
      >
        {open ? '✕' : '🌿'}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed z-[60] bottom-24 right-6 left-4 sm:left-auto sm:w-[390px] max-h-[72vh] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-forest text-white shrink-0">
            <span className="text-lg">🌿</span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm leading-tight">AI Агроном</p>
              <p className="text-[11px] text-white/70 leading-tight">Запитайте про ваші рослини</p>
            </div>
            <button onClick={() => setShowHistory(s => !s)} title="Історія розмов"
              className="px-2 py-1 rounded-lg hover:bg-white/15 text-sm">🕑</button>
            <button onClick={newChat} title="Нова розмова"
              className="px-2 py-1 rounded-lg hover:bg-white/15 text-sm">✏️</button>
          </div>

          {/* History dropdown */}
          {showHistory && (
            <div className="border-b border-gray-100 max-h-44 overflow-y-auto shrink-0 bg-gray-50">
              {chats.length === 0
                ? <p className="text-xs text-gray-400 px-4 py-3">Ще немає збережених розмов</p>
                : chats.map(c => (
                  <button key={c.id} onClick={() => loadChat(c.id)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-white truncate ${c.id === chatId ? 'text-forest font-semibold' : 'text-gray-600'}`}>
                    {c.title}
                  </button>
                ))}
            </div>
          )}

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {unavailable ? (
              <div className="text-center py-10 text-gray-400">
                <div className="text-3xl mb-2">🌱</div>
                <p className="text-sm font-semibold text-gray-500">AI скоро буде доступний</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                <p className="mb-3">Привіт! 👋 Я ваш AI-агроном.</p>
                <p>Запитайте, наприклад:</p>
                <div className="mt-3 space-y-2">
                  {['Чим обробити фітофтороз на томатах?', 'Коли садити часник у моєму регіоні?', 'Де купити мідний купорос поруч?'].map(q => (
                    <button key={q} onClick={() => startChat(q)}
                      className="block w-full text-left text-xs px-3 py-2 rounded-lg bg-gray-50 hover:bg-card-green/40 text-gray-600">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : messages.map(m => (
              <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user' ? 'bg-[#6E9150] text-white' : 'bg-gray-100 text-gray-800'
                }`}>
                  {renderContent(m.content)}
                  {m.role === 'assistant' && m.tool_trace && m.tool_trace.length > 0 && (
                    <p className="mt-2 text-[10px] text-gray-400">
                      🔧 переглянув: {m.tool_trace.map(t => TOOL_LABEL[t] ?? t).join(', ')}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl px-4 py-3 flex gap-1">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.3s]" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          {!unavailable && (
            <div className="border-t border-gray-100 p-2.5 flex gap-2 shrink-0">
              <input
                value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') send() }}
                placeholder="Напишіть запитання…" disabled={sending}
                className="flex-1 min-w-0 text-sm px-3 py-2 bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest/30"
              />
              <button onClick={send} disabled={sending || !input.trim()}
                className="shrink-0 w-10 h-10 rounded-xl bg-[#6E9150] text-white hover:bg-[#5e7d42] transition-colors disabled:opacity-40 flex items-center justify-center">
                ➤
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
