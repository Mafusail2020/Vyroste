import { useEffect, useRef, useState } from 'react'
import { toast } from 'react-hot-toast'
import { Plus, X, MessagesSquare, ChevronDown, ArrowUp } from 'lucide-react'
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

const MODELS = [
  { id: 'claude-opus-4-8',           label: 'Opus 4.8' },
  { id: 'claude-sonnet-4-6',         label: 'Sonnet 4.6' },
  { id: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5' },
]

const SEED_PROMPT = 'Що з моєю рослиною і що робити далі?'
const SUGGESTIONS = [
  'Чим обробити фітофтороз на томатах?',
  'Коли садити часник у моєму регіоні?',
  'Де купити мідний купорос поруч?',
]

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

export default function AgronomChat({ open, onClose, calendarId, seedScanId, seedImage, onSeedHandled }: {
  open: boolean
  onClose: () => void
  calendarId?: string
  seedScanId?: string | null
  seedImage?: string | null
  onSeedHandled?: () => void
}) {
  const [chatId, setChatId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [chats, setChats] = useState<Chat[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [headerImage, setHeaderImage] = useState<string | null>(null)
  const [model, setModel] = useState(MODELS[0].id)
  const [modelMenu, setModelMenu] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) api.get<Chat[]>('/api/agronom/chats').then(r => setChats(r.data)).catch(() => {})
  }, [open])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  // Open seeded from a fresh diagnosis.
  useEffect(() => {
    if (!seedScanId) return
    setHeaderImage(seedImage ?? null)
    startChat(SEED_PROMPT, seedScanId)
    onSeedHandled?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedScanId])

  function autosize() {
    const t = taRef.current
    if (t) { t.style.height = 'auto'; t.style.height = `${Math.min(t.scrollHeight, 160)}px` }
  }

  function newChat() {
    setChatId(null); setMessages([]); setShowHistory(false); setHeaderImage(null)
  }

  async function loadChat(id: string) {
    setShowHistory(false); setHeaderImage(null)
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
        calendar_id: calendarId, scan_id: scanId, message: text, model,
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
    requestAnimationFrame(autosize)
    if (!chatId) { await startChat(text); return }
    setSending(true)
    setMessages(prev => [...prev, { id: `tmp-${Date.now()}`, role: 'user', content: text }])
    try {
      const r = await api.post<Msg>(`/api/agronom/chats/${chatId}/message`, { content: text, model })
      setMessages(prev => [...prev, r.data])
    } catch (err: unknown) {
      if ((err as { response?: { status?: number } }).response?.status === 503) setUnavailable(true)
    } finally {
      setSending(false)
    }
  }

  const empty = messages.length === 0 && !headerImage

  // Claude-style composer (attach mock · model switcher · send). Reused in both
  // the centered (pre-chat) and bottom (in-chat) positions.
  const composer = (
    <div className="max-w-2xl mx-auto w-full">
      <div className="rounded-2xl border border-gray-200 bg-white px-3 pt-2.5 pb-2 focus-within:border-forest transition-colors shadow-sm">
        <textarea
          ref={taRef} rows={1} value={input}
          onChange={e => { setInput(e.target.value); autosize() }}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="Запитайте про ваші рослини…" disabled={sending}
          className="w-full resize-none bg-transparent text-sm leading-relaxed max-h-40 focus:outline-none"
        />
        <div className="flex items-center gap-2 mt-1">
          {/* Attach — mock only for now */}
          <button
            onClick={() => toast('Завантаження документів — скоро 🚧')}
            title="Додати файл (скоро)"
            className="w-8 h-8 grid place-items-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
          </button>

          <div className="ml-auto flex items-center gap-1.5">
            {/* Model switcher */}
            <div className="relative">
              <button onClick={() => setModelMenu(v => !v)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                {MODELS.find(m => m.id === model)?.label}
                <ChevronDown className="w-3 h-3" />
              </button>
              {modelMenu && (
                <div className="absolute bottom-full right-0 mb-1 w-40 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-10">
                  {MODELS.map(m => (
                    <button key={m.id} onClick={() => { setModel(m.id); setModelMenu(false) }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${m.id === model ? 'text-forest font-semibold' : 'text-gray-600'}`}>
                      {m.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={send} disabled={sending || !input.trim()}
              className="shrink-0 w-8 h-8 rounded-lg bg-[#6E9150] text-white hover:bg-[#5e7d42] transition-colors disabled:opacity-30 grid place-items-center">
              <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
      <p className="text-[10px] text-gray-300 text-center mt-1.5">AI може помилятися — перевіряйте важливі поради.</p>
    </div>
  )

  return (
    <>
      {/* History drawer — slides in to the LEFT of the chat panel */}
      <div
        className={`fixed top-24 bottom-0 z-30 w-[280px] bg-white border-l border-gray-200 shadow-xl flex flex-col transition-transform duration-300 ease-out ${open && showHistory ? 'translate-x-0' : 'translate-x-full pointer-events-none'}`}
        style={{ right: 'clamp(440px, 50vw, 760px)' }}
      >
        <div className="flex items-center justify-between px-4 h-12 border-b border-gray-100 shrink-0">
          <p className="font-bold text-sm text-gray-700">Історія розмов</p>
          <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {chats.length === 0
            ? <p className="text-xs text-gray-400 px-4 py-3">Ще немає збережених розмов</p>
            : chats.map(c => (
              <button key={c.id} onClick={() => loadChat(c.id)}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 truncate ${c.id === chatId ? 'text-forest font-semibold' : 'text-gray-600'}`}>
                {c.title}
              </button>
            ))}
        </div>
      </div>

      {/* Main panel */}
      <div
        className={`fixed top-24 right-0 bottom-0 z-40 w-full sm:w-[clamp(440px,50vw,760px)] bg-white border-l border-gray-200 shadow-2xl flex flex-col transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
        aria-hidden={!open}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 h-14 bg-forest text-white shrink-0">
          <span className="text-lg">🌿</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm leading-tight">AI Агроном</p>
            <p className="text-[11px] text-white/70 leading-tight">Ваш персональний помічник саду</p>
          </div>
          <button onClick={() => setShowHistory(s => !s)} title="Історія розмов"
            className="w-8 h-8 grid place-items-center rounded-lg hover:bg-white/15"><MessagesSquare className="w-[18px] h-[18px]" /></button>
          <button onClick={newChat} title="Нова розмова"
            className="w-8 h-8 grid place-items-center rounded-lg hover:bg-white/15"><Plus className="w-[18px] h-[18px]" strokeWidth={2.5} /></button>
          <button onClick={onClose} title="Закрити"
            className="w-8 h-8 grid place-items-center rounded-lg hover:bg-white/15"><X className="w-[18px] h-[18px]" /></button>
        </div>

        {unavailable ? (
          <div className="flex-1 grid place-items-center text-center text-gray-400 px-6">
            <div>
              <div className="text-4xl mb-3">🌱</div>
              <p className="font-semibold text-gray-500">AI скоро буде доступний</p>
            </div>
          </div>
        ) : empty ? (
          /* Pre-chat: greeting + centered composer */
          <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-4 sm:px-6">
            <div className="w-12 h-12 mb-4 rounded-full bg-card-green grid place-items-center text-2xl">🌿</div>
            <p className="text-xl font-bold text-gray-800 mb-1">Чим допомогти?</p>
            <p className="text-sm text-gray-400 mb-6 text-center">Запитайте про хвороби, посадку чи догляд — підкажу під ваш регіон.</p>
            <div className="w-full">{composer}</div>
            <div className="max-w-2xl mx-auto w-full space-y-2 mt-4">
              {SUGGESTIONS.map(q => (
                <button key={q} onClick={() => startChat(q)}
                  className="block w-full text-left text-sm px-4 py-3 rounded-xl border border-gray-200 hover:border-forest hover:bg-card-green/20 text-gray-700 transition-colors">
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* In-chat: messages scroll + composer pinned bottom */
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto">
              <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
                {headerImage && (
                  <div className="flex justify-end">
                    <img src={headerImage} alt="Фото рослини"
                      className="max-w-[60%] rounded-2xl rounded-br-md border border-gray-100 shadow-sm" />
                  </div>
                )}
                {messages.map(m => m.role === 'user' ? (
                  <div key={m.id} className="flex justify-end">
                    <div className="max-w-[82%] bg-card-green/60 text-gray-800 rounded-2xl rounded-br-md px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">
                      {renderContent(m.content)}
                    </div>
                  </div>
                ) : (
                  <div key={m.id} className="flex gap-3">
                    <div className="shrink-0 w-7 h-7 rounded-full bg-card-green grid place-items-center text-sm mt-0.5">🌿</div>
                    <div className="min-w-0 flex-1 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                      {renderContent(m.content)}
                      {m.tool_trace && m.tool_trace.length > 0 && (
                        <p className="mt-2 text-[11px] text-gray-400">
                          🔧 переглянув: {m.tool_trace.map(t => TOOL_LABEL[t] ?? t).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="flex gap-3">
                    <div className="shrink-0 w-7 h-7 rounded-full bg-card-green grid place-items-center text-sm">🌿</div>
                    <div className="flex gap-1 items-center h-7">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.3s]" />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="shrink-0 px-4 sm:px-6 pb-4 pt-2">{composer}</div>
          </>
        )}
      </div>
    </>
  )
}
