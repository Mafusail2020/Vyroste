import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import type { JSONContent } from '@tiptap/react'
import api from '../lib/api'
import TipTapEditor from '../components/TipTapEditor'

interface Category { id: string; name: string; slug: string; emoji: string | null }
interface Article {
  id: string
  category_id: string | null
  title: string
  slug: string
  excerpt: string | null
  content: JSONContent
  cover_image: string | null
  tags: string[] | null
  published: boolean
  views: number
}
interface Profile { is_admin: boolean }

const EMPTY_DOC: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] }

interface FormState {
  id: string | null
  category_id: string
  title: string
  excerpt: string
  cover_image: string
  tags: string[]
  published: boolean
  content: JSONContent
}

const emptyForm = (): FormState => ({
  id: null, category_id: '', title: '', excerpt: '', cover_image: '', tags: [], published: false, content: EMPTY_DOC,
})

export default function AdminKnowledgePage() {
  const [isAdmin,  setIsAdmin]  = useState<boolean | null>(null)
  const [pageLoad, setPageLoad] = useState(true)
  const [categories, setCategories] = useState<Category[]>([])
  const [articles,   setArticles]   = useState<Article[]>([])
  const [form, setForm]       = useState<FormState | null>(null)   // null = list view
  const [saving, setSaving]   = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [newCat, setNewCat]   = useState({ name: '', emoji: '', description: '', subcategories: '' })

  useEffect(() => {
    api.get<Profile>('/api/users/me')
      .then(r => {
        setIsAdmin(r.data.is_admin === true)
        if (r.data.is_admin) loadAll()
      })
      .catch(() => setIsAdmin(false))
      .finally(() => setPageLoad(false))
  }, [])

  function loadAll() {
    api.get<Category[]>('/api/knowledge/categories').then(r => setCategories(r.data)).catch(() => {})
    api.get<Article[]>('/api/knowledge/admin/articles').then(r => setArticles(r.data)).catch(() => {})
  }

  function openEdit(a: Article) {
    setForm({
      id: a.id, category_id: a.category_id ?? '', title: a.title, excerpt: a.excerpt ?? '',
      cover_image: a.cover_image ?? '', tags: a.tags ?? [], published: a.published,
      content: a.content && (a.content as JSONContent).type ? a.content : EMPTY_DOC,
    })
  }

  async function save() {
    if (!form) return
    if (!form.title.trim()) { toast.error('Введіть заголовок'); return }
    setSaving(true)
    const payload = {
      category_id: form.category_id || null,
      title: form.title.trim(),
      excerpt: form.excerpt.trim() || null,
      cover_image: form.cover_image.trim() || null,
      tags: form.tags,
      published: form.published,
      content: form.content,
    }
    try {
      if (form.id) await api.patch(`/api/knowledge/articles/${form.id}`, payload)
      else await api.post('/api/knowledge/articles', payload)
      toast.success('Збережено')
      setForm(null)
      loadAll()
    } catch {
      toast.error('Помилка збереження')
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Видалити статтю?')) return
    await api.delete(`/api/knowledge/articles/${id}`).catch(() => {})
    setArticles(prev => prev.filter(a => a.id !== id))
  }

  async function togglePublish(a: Article) {
    await api.patch(`/api/knowledge/articles/${a.id}`, { published: !a.published }).catch(() => {})
    loadAll()
  }

  async function addCategory() {
    if (!newCat.name.trim()) return
    try {
      await api.post('/api/knowledge/categories', {
        name: newCat.name.trim(),
        emoji: newCat.emoji.trim() || null,
        description: newCat.description.trim() || null,
        subcategories: newCat.subcategories.split(',').map(s => s.trim()).filter(Boolean),
      })
      setNewCat({ name: '', emoji: '', description: '', subcategories: '' })
      api.get<Category[]>('/api/knowledge/categories').then(r => setCategories(r.data))
    } catch { toast.error('Помилка') }
  }

  async function uploadCover(file: File) {
    const fd = new FormData(); fd.append('file', file)
    try {
      const r = await api.post<{ url: string }>('/api/knowledge/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setForm(f => f && { ...f, cover_image: r.data.url })
    } catch { toast.error('Не вдалось завантажити') }
  }

  if (pageLoad) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-8 h-8 border-4 border-forest border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!isAdmin) return (
    <div className="max-w-xl mx-auto px-6 py-20 text-center">
      <div className="text-5xl mb-4">🔒</div>
      <h2 className="text-2xl font-black text-gray-700 uppercase mb-3">Доступ заборонено</h2>
      <Link to="/dashboard" className="text-forest hover:underline text-sm">← До дашборду</Link>
    </div>
  )

  /* ── Editor view ── */
  if (form) return (
    <div className="max-w-3xl mx-auto px-6 py-8 pb-20">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setForm(null)} className="text-gray-400 hover:text-gray-600">← Назад</button>
        <h1 className="text-2xl font-black text-forest uppercase">{form.id ? 'Редагувати статтю' : 'Нова стаття'}</h1>
      </div>

      <div className="space-y-4">
        <input
          type="text" value={form.title} onChange={e => setForm(f => f && { ...f, title: e.target.value })}
          placeholder="Заголовок статті"
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-lg font-bold focus:outline-none focus:border-forest"
        />

        <div className="grid grid-cols-2 gap-3">
          <select value={form.category_id} onChange={e => setForm(f => f && { ...f, category_id: e.target.value })}
            className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-forest">
            <option value="">Без категорії</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
          </select>
          <label className="flex items-center gap-2 px-3 border-2 border-gray-200 rounded-xl cursor-pointer">
            <input type="checkbox" checked={form.published} onChange={e => setForm(f => f && { ...f, published: e.target.checked })} className="w-4 h-4 accent-forest" />
            <span className="text-sm font-medium text-gray-700">Опубліковано</span>
          </label>
        </div>

        <textarea
          value={form.excerpt} onChange={e => setForm(f => f && { ...f, excerpt: e.target.value })}
          rows={2} placeholder="Анотація (для картки і пошуку)"
          className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:border-forest"
        />

        {/* Cover */}
        <div className="flex items-center gap-3">
          {form.cover_image && <img src={form.cover_image} alt="cover" className="w-16 h-16 rounded-lg object-cover border border-gray-200" />}
          <input
            type="text" value={form.cover_image} onChange={e => setForm(f => f && { ...f, cover_image: e.target.value })}
            placeholder="URL обкладинки"
            className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-forest"
          />
          <label className="shrink-0 px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm cursor-pointer hover:border-forest">
            📤<input type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) uploadCover(f) }} />
          </label>
        </div>

        {/* Tags */}
        <div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {form.tags.map(t => (
              <span key={t} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-forest/10 text-forest">
                {t}<button type="button" onClick={() => setForm(f => f && { ...f, tags: f.tags.filter(x => x !== t) })}>×</button>
              </span>
            ))}
          </div>
          <input
            type="text" value={tagInput} onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault()
                const t = tagInput.trim().replace(/,$/, '')
                if (t) setForm(f => f && f.tags.includes(t) ? f : (f && { ...f, tags: [...f.tags, t] }))
                setTagInput('')
              }
            }}
            placeholder="Теги — Enter після кожного"
            className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-forest"
          />
        </div>

        {/* Body */}
        <TipTapEditor key={form.id ?? 'new'} initialContent={form.content} onChange={doc => setForm(f => f && { ...f, content: doc })} />

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={() => setForm(null)} className="px-5 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:border-gray-300">Скасувати</button>
          <button onClick={save} disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-forest text-white font-black text-sm uppercase tracking-wide hover:bg-forest-dark disabled:opacity-50">
            {saving ? 'Збереження…' : 'Зберегти'}
          </button>
        </div>
      </div>
    </div>
  )

  /* ── List view ── */
  return (
    <div className="max-w-4xl mx-auto px-6 py-8 pb-20">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-black text-forest uppercase">База знань — редактор</h1>
        <button onClick={() => setForm(emptyForm())}
          className="px-4 py-2.5 rounded-xl bg-forest text-white text-sm font-bold uppercase tracking-wide hover:bg-forest-dark">
          + Нова стаття
        </button>
      </div>

      {/* Categories manager */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6">
        <h2 className="font-black text-xs uppercase tracking-wide text-gray-400 mb-3">Категорії</h2>
        <div className="flex flex-wrap gap-2 mb-3">
          {categories.map(c => (
            <span key={c.id} className="text-sm px-3 py-1 rounded-full bg-gray-100 text-gray-700">{c.emoji} {c.name}</span>
          ))}
          {categories.length === 0 && <span className="text-sm text-gray-400">Ще немає категорій</span>}
        </div>
        <div className="space-y-2">
          <div className="flex gap-2">
            <input value={newCat.emoji} onChange={e => setNewCat(c => ({ ...c, emoji: e.target.value }))} placeholder="🌱"
              className="w-14 text-center px-2 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-forest" />
            <input value={newCat.name} onChange={e => setNewCat(c => ({ ...c, name: e.target.value }))} placeholder="Назва категорії"
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-forest" />
            <button onClick={addCategory} className="px-4 py-2 rounded-lg bg-forest/10 text-forest text-sm font-semibold hover:bg-forest/20">Додати</button>
          </div>
          <input value={newCat.description} onChange={e => setNewCat(c => ({ ...c, description: e.target.value }))} placeholder="Короткий опис категорії"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-forest" />
          <input value={newCat.subcategories} onChange={e => setNewCat(c => ({ ...c, subcategories: e.target.value }))} placeholder="Підтеми через кому: Косточкові, Семечкові, Виноград"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-forest" />
        </div>
      </div>

      {/* Articles */}
      {articles.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">📚</div>
          <p>Статей ще немає. Створіть першу!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {articles.map(a => (
            <div key={a.id} className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-3">
              {a.cover_image
                ? <img src={a.cover_image} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0" />
                : <div className="w-11 h-11 rounded-lg bg-card-green flex items-center justify-center shrink-0">📄</div>}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {!a.published && <span className="text-[10px] font-black bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full uppercase">Чернетка</span>}
                  <p className="font-semibold text-gray-800 text-sm truncate">{a.title}</p>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">👁 {a.views} · /{a.slug}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => togglePublish(a)} title={a.published ? 'Приховати' : 'Опублікувати'}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm ${a.published ? 'bg-card-green text-forest' : 'bg-gray-100 text-gray-400 hover:bg-card-green hover:text-forest'}`}>
                  {a.published ? '✓' : '○'}
                </button>
                <button onClick={() => openEdit(a)} className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 text-gray-500 hover:bg-card-blue hover:text-navy text-sm">✏️</button>
                <button onClick={() => remove(a.id)} className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500 text-sm">🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
