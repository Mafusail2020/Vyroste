import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import api from '../lib/api'

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface Nursery {
  id: string
  name: string
  description: string | null
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  latitude: number
  longitude: number
  created_at: string
}

interface BlogPost {
  id: string
  category: string
  title: string
  excerpt: string | null
  author: string
  emoji: string
  gradient_from: string
  gradient_to: string
  is_featured: boolean
  views: number
  published: boolean
  created_at: string
}

interface Profile { is_admin: boolean }

/* ─── Constants ──────────────────────────────────────────────────────────── */

const CATEGORIES = ['Поради', 'Вирощування', 'Місячний календар', 'Технології', 'Мапи'] as const

const COLOR_PRESETS = [
  { label: 'Зелений',    from: '#BBE3BB', to: '#C2E3F5' },
  { label: 'Фіолетовий', from: '#D8C8F0', to: '#E9D8F8' },
  { label: 'Жовтий',     from: '#FEF3C7', to: '#FDE68A' },
  { label: 'Персиковий', from: '#FED7AA', to: '#FCA5A5' },
  { label: 'Блакитний',  from: '#C2E3F5', to: '#A7D8F5' },
  { label: "М'ятний",    from: '#D1FAE5', to: '#BBE3BB' },
]

const QUICK_EMOJIS = ['🌱','🌿','🍅','🥒','🥕','🌻','🌙','🌡️','🗺️','🍓','🌸','🌳','🪴','🌾','💧','🌍']

const CATEGORY_STYLE: Record<string, { bg: string; text: string }> = {
  'Місячний календар': { bg: 'bg-purple-100', text: 'text-purple-700' },
  'Вирощування':       { bg: 'bg-green-100',  text: 'text-green-700' },
  'Поради':            { bg: 'bg-blue-100',   text: 'text-blue-700'  },
  'Технології':        { bg: 'bg-amber-100',  text: 'text-amber-700' },
  'Мапи':              { bg: 'bg-teal-100',   text: 'text-teal-700'  },
}

/* ─── Blog form state ────────────────────────────────────────────────────── */

function emptyForm() {
  return {
    category: 'Поради' as string,
    title: '',
    excerpt: '',
    content: '',
    author: 'Виросте',
    emoji: '🌱',
    gradient_from: '#BBE3BB',
    gradient_to: '#C2E3F5',
    published: true,
  }
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function AdminPage() {
  const [isAdmin,   setIsAdmin]   = useState<boolean | null>(null)
  const [pageLoad,  setPageLoad]  = useState(true)
  const [activeTab, setActiveTab] = useState<'nurseries' | 'blog'>('nurseries')

  // Nurseries
  const [nurseries, setNurseries] = useState<Nursery[]>([])
  const [acting,    setActing]    = useState<string | null>(null)

  // Blog
  const [posts,       setPosts]       = useState<BlogPost[]>([])
  const [blogLoading, setBlogLoading] = useState(false)
  const [showForm,    setShowForm]    = useState(false)
  const [formSaving,  setFormSaving]  = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  /* ── Bootstrap ── */
  useEffect(() => {
    Promise.all([
      api.get<Profile>('/api/users/me'),
      api.get<Nursery[]>('/api/admin/nurseries').catch(() => ({ data: [] })),
    ]).then(([pr, nr]) => {
      setIsAdmin(pr.data.is_admin === true)
      setNurseries(nr.data)
    }).catch(() => setIsAdmin(false)).finally(() => setPageLoad(false))
  }, [])

  /* ── Load blog posts when tab switched ── */
  useEffect(() => {
    if (activeTab !== 'blog' || !isAdmin) return
    loadBlogPosts()
  }, [activeTab, isAdmin])

  function loadBlogPosts() {
    setBlogLoading(true)
    api.get<BlogPost[]>('/api/blog/admin/posts')
      .then(r => setPosts(r.data))
      .catch(() => toast.error('Не вдалось завантажити статті'))
      .finally(() => setBlogLoading(false))
  }

  /* ── Nursery actions ── */
  async function setStatus(id: string, status: 'verified' | 'rejected') {
    setActing(id)
    try {
      await api.patch(`/api/admin/nurseries/${id}/status`, { status })
      setNurseries(prev => prev.filter(n => n.id !== id))
      toast.success(status === 'verified' ? 'Розсадник верифіковано' : 'Розсадник відхилено')
    } catch {
      toast.error('Помилка. Спробуйте ще раз.')
    } finally {
      setActing(null)
    }
  }

  /* ── Blog actions ── */
  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { toast.error('Введіть заголовок'); return }
    setFormSaving(true)
    try {
      await api.post('/api/blog/posts', {
        ...form,
        title:   form.title.trim(),
        excerpt: form.excerpt.trim() || null,
        content: form.content.trim() || null,
        author:  form.author.trim() || 'Виросте',
      })
      toast.success('Статтю опубліковано!')
      setShowForm(false)
      setForm(emptyForm())
      loadBlogPosts()
    } catch {
      toast.error('Помилка збереження')
    } finally {
      setFormSaving(false)
    }
  }

  async function featurePost(id: string) {
    try {
      await api.patch(`/api/blog/posts/${id}/feature`)
      toast.success('Головну статтю оновлено')
      loadBlogPosts()
    } catch {
      toast.error('Помилка')
    }
  }

  async function togglePublish(post: BlogPost) {
    try {
      await api.patch(`/api/blog/posts/${post.id}`, { published: !post.published })
      toast.success(post.published ? 'Статтю приховано' : 'Статтю опубліковано')
      loadBlogPosts()
    } catch {
      toast.error('Помилка')
    }
  }

  async function deletePost(id: string) {
    try {
      await api.delete(`/api/blog/posts/${id}`)
      toast.success('Статтю видалено')
      setPosts(prev => prev.filter(p => p.id !== id))
    } catch {
      toast.error('Помилка видалення')
    } finally {
      setConfirmDelete(null)
    }
  }

  /* ── Access gates ── */
  if (pageLoad) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-8 h-8 border-4 border-forest border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!isAdmin) return (
    <div className="max-w-xl mx-auto px-6 py-20 text-center">
      <div className="text-5xl mb-4">🔒</div>
      <h2 className="text-2xl font-black text-gray-700 uppercase mb-3">Доступ заборонено</h2>
      <p className="text-gray-400 mb-8 text-sm">Ця сторінка доступна лише адміністраторам.</p>
      <Link to="/dashboard" className="text-forest hover:underline text-sm">← До дашборду</Link>
    </div>
  )

  /* ── Main ── */
  return (
    <div className="max-w-5xl mx-auto px-6 py-8 pb-20">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-forest uppercase">Адміністрування</h1>
          <p className="text-sm text-gray-400 mt-0.5">Виросте — панель управління</p>
        </div>
        <Link to="/admin/knowledge"
          className="px-4 py-2.5 rounded-xl bg-card-purple text-navy text-sm font-bold uppercase tracking-wide hover:brightness-95 transition">
          📚 База знань
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-8 w-fit">
        {(['nurseries', 'blog'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all duration-150
              ${activeTab === tab ? 'bg-white text-forest shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab === 'nurseries' ? `🏡 Розсадники ${nurseries.length > 0 ? `(${nurseries.length})` : ''}` : '📝 Блог'}
          </button>
        ))}
      </div>

      {/* ── NURSERIES TAB ──────────────────────────────────────────────── */}
      {activeTab === 'nurseries' && (
        <>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-black text-sm uppercase tracking-wide text-gray-700">Розсадники на перевірці</h2>
            <span className="text-sm font-semibold bg-amber-100 text-amber-700 px-3 py-1 rounded-full">
              {nurseries.length} очікують
            </span>
          </div>

          {nurseries.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <div className="text-4xl mb-3">✅</div>
              <p>Немає заявок на перевірку</p>
            </div>
          ) : (
            <div className="space-y-4">
              {nurseries.map(n => (
                <div key={n.id} className="bg-white border border-gray-200 rounded-2xl p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-800 text-lg mb-1">{n.name}</h3>
                      {n.description && <p className="text-sm text-gray-500 mb-3">{n.description}</p>}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                        {n.address && <span>📍 {n.address}</span>}
                        {n.phone && <span>📞 <a href={`tel:${n.phone}`} className="text-forest hover:underline">{n.phone}</a></span>}
                        {n.email && <span>✉️ <a href={`mailto:${n.email}`} className="text-forest hover:underline">{n.email}</a></span>}
                        {n.website && <span>🌐 <a href={n.website} target="_blank" rel="noopener noreferrer" className="text-forest hover:underline">{n.website.replace(/^https?:\/\//, '')}</a></span>}
                      </div>
                      <div className="mt-2 text-xs text-gray-300">
                        {n.latitude.toFixed(4)}, {n.longitude.toFixed(4)} · Подано: {new Date(n.created_at).toLocaleDateString('uk-UA')}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <button onClick={() => setStatus(n.id, 'verified')} disabled={acting === n.id}
                        className="px-4 py-2 bg-forest text-white text-sm font-bold rounded-xl hover:bg-forest-dark transition-colors disabled:opacity-40 flex items-center gap-1.5">
                        {acting === n.id
                          ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          : '✓'} Верифікувати
                      </button>
                      <button onClick={() => setStatus(n.id, 'rejected')} disabled={acting === n.id}
                        className="px-4 py-2 border-2 border-red-200 text-red-500 text-sm font-bold rounded-xl hover:bg-red-50 transition-colors disabled:opacity-40">
                        ✗ Відхилити
                      </button>
                      <a href={`https://maps.google.com/?q=${n.latitude},${n.longitude}`}
                        target="_blank" rel="noopener noreferrer"
                        className="px-4 py-1.5 border border-gray-200 text-gray-500 text-xs rounded-xl hover:bg-gray-50 transition-colors text-center">
                        🗺️ Перевірити місце
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── BLOG TAB ───────────────────────────────────────────────────── */}
      {activeTab === 'blog' && (
        <>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-black text-sm uppercase tracking-wide text-gray-700">
              Статті ({posts.length})
            </h2>
            <button onClick={() => { setShowForm(v => !v); setForm(emptyForm()) }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wide transition-all duration-150
                ${showForm
                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  : 'bg-forest text-white hover:bg-forest-dark hover:scale-[1.02] active:scale-[0.98]'}`}>
              {showForm ? '✕ Скасувати' : '+ Нова стаття'}
            </button>
          </div>

          {/* Add form */}
          {showForm && (
            <div className="bg-white border-2 border-forest/20 rounded-2xl p-6 mb-6">
              <h3 className="font-black text-forest text-sm uppercase tracking-wide mb-5">Нова стаття</h3>
              <form onSubmit={handleCreatePost} className="space-y-4">

                {/* Emoji + Title row */}
                <div className="flex gap-3">
                  <div className="shrink-0">
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Emoji</label>
                    <input value={form.emoji} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))}
                      className="w-16 text-center px-2 py-2.5 border-2 border-gray-200 rounded-xl text-lg focus:outline-none focus:border-forest" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Заголовок <span className="text-red-400">*</span></label>
                    <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="Заголовок статті..."
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-forest transition-colors" />
                  </div>
                </div>

                {/* Quick emoji picks */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Швидкий вибір emoji</label>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_EMOJIS.map(e => (
                      <button key={e} type="button" onClick={() => setForm(f => ({ ...f, emoji: e }))}
                        className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all
                          ${form.emoji === e ? 'bg-forest/10 ring-2 ring-forest scale-110' : 'bg-gray-100 hover:bg-gray-200'}`}>
                        {e}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category + Author */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Категорія</label>
                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-forest transition-colors">
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Автор</label>
                    <input type="text" value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-forest transition-colors" />
                  </div>
                </div>

                {/* Excerpt */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Анотація (для картки)</label>
                  <textarea value={form.excerpt} onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))}
                    rows={2} placeholder="Короткий опис для попереднього перегляду..."
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:border-forest transition-colors" />
                </div>

                {/* Content */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Текст статті</label>
                  <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                    rows={6} placeholder="Основний текст. Кожен новий рядок — новий абзац."
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm resize-y focus:outline-none focus:border-forest transition-colors font-mono" />
                </div>

                {/* Color preset */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-2">Колір обкладинки</label>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_PRESETS.map(p => {
                      const active = form.gradient_from === p.from && form.gradient_to === p.to
                      return (
                        <button key={p.label} type="button"
                          onClick={() => setForm(f => ({ ...f, gradient_from: p.from, gradient_to: p.to }))}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 text-xs font-semibold transition-all
                            ${active ? 'border-forest scale-105 shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}>
                          <span className="w-5 h-5 rounded-full shrink-0"
                            style={{ background: `linear-gradient(135deg, ${p.from}, ${p.to})` }} />
                          {p.label}
                        </button>
                      )
                    })}
                  </div>
                  {/* Preview */}
                  <div className="mt-2 h-10 rounded-xl flex items-center justify-center text-2xl"
                    style={{ background: `linear-gradient(135deg, ${form.gradient_from}, ${form.gradient_to})` }}>
                    {form.emoji}
                  </div>
                </div>

                {/* Published */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.published}
                    onChange={e => setForm(f => ({ ...f, published: e.target.checked }))}
                    className="w-4 h-4 accent-forest" />
                  <span className="text-sm font-medium text-gray-700">Опублікувати одразу</span>
                </label>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)}
                    className="px-4 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 text-sm font-semibold hover:border-gray-300 transition-colors">
                    Скасувати
                  </button>
                  <button type="submit" disabled={formSaving}
                    className="px-6 py-2.5 rounded-xl bg-forest text-white font-black text-sm uppercase tracking-wide hover:bg-forest-dark transition-colors disabled:opacity-50 flex items-center gap-2">
                    {formSaving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    {formSaving ? 'Збереження...' : 'Опублікувати'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Posts list */}
          {blogLoading ? (
            <div className="space-y-3">
              {[0,1,2].map(i => (
                <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4 animate-pulse">
                  <div className="flex gap-3 items-center">
                    <div className="w-10 h-10 bg-gray-200 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/2" />
                      <div className="h-3 bg-gray-200 rounded w-1/4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-4xl mb-3">📝</div>
              <p>Статей ще немає. Додайте першу!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map(p => {
                const catStyle = CATEGORY_STYLE[p.category] ?? { bg: 'bg-gray-100', text: 'text-gray-600' }
                return (
                  <div key={p.id} className={`bg-white border rounded-2xl p-4 transition-all ${p.is_featured ? 'border-amber-300 bg-amber-50/30' : 'border-gray-200'}`}>
                    <div className="flex items-center gap-4">
                      {/* Cover preview */}
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                        style={{ background: `linear-gradient(135deg, ${p.gradient_from}, ${p.gradient_to})` }}>
                        {p.emoji}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {p.is_featured && (
                            <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full uppercase">⭐ Головна</span>
                          )}
                          {!p.published && (
                            <span className="text-[10px] font-black bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full uppercase">Прихована</span>
                          )}
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${catStyle.bg} ${catStyle.text}`}>{p.category}</span>
                        </div>
                        <p className="font-semibold text-gray-800 text-sm leading-snug truncate">{p.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {p.author} · {new Date(p.created_at).toLocaleDateString('uk-UA')}
                          <span className="ml-2 inline-flex items-center gap-0.5">👁 {p.views}</span>
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Feature */}
                        <button onClick={() => featurePost(p.id)} title={p.is_featured ? 'Головна стаття' : 'Зробити головною'}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 text-sm
                            ${p.is_featured ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400 hover:bg-amber-50 hover:text-amber-500'}`}>
                          ⭐
                        </button>
                        {/* View */}
                        <a href={`/blog/${p.id}`} target="_blank" rel="noopener noreferrer"
                          className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 text-gray-500 hover:bg-card-blue hover:text-navy transition-all hover:scale-110 text-sm"
                          title="Переглянути">
                          👁
                        </a>
                        {/* Publish toggle */}
                        <button onClick={() => togglePublish(p)} title={p.published ? 'Приховати' : 'Опублікувати'}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 text-sm
                            ${p.published ? 'bg-card-green text-forest' : 'bg-gray-100 text-gray-400 hover:bg-card-green hover:text-forest'}`}>
                          {p.published ? '✓' : '○'}
                        </button>
                        {/* Delete */}
                        {confirmDelete === p.id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => deletePost(p.id)}
                              className="px-2.5 py-1.5 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-colors">
                              Так
                            </button>
                            <button onClick={() => setConfirmDelete(null)}
                              className="px-2.5 py-1.5 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-200 transition-colors">
                              Ні
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmDelete(p.id)} title="Видалити"
                            className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all hover:scale-110 active:scale-95 text-sm">
                            🗑
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
