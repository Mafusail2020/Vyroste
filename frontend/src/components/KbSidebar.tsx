import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export interface KbCategory {
  id: string
  name: string
  slug: string
  emoji: string | null
}

/** Right-column sidebar: search + category list. Used on both KB pages. */
export default function KbSidebar({
  categories,
  activeSlug,
  initialQuery = '',
}: {
  categories: KbCategory[]
  activeSlug?: string
  initialQuery?: string
}) {
  const navigate = useNavigate()
  const [q, setQ] = useState(initialQuery)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    navigate(q.trim() ? `/knowledge?q=${encodeURIComponent(q.trim())}` : '/knowledge')
  }

  return (
    <div className="space-y-6 sticky top-20">
      {/* Search */}
      <form onSubmit={submit}>
        <div className="relative">
          <input
            type="text" value={q} onChange={e => setQ(e.target.value)}
            placeholder="Пошук у базі знань…"
            className="w-full pl-9 pr-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-forest bg-white"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        </div>
      </form>

      {/* Categories */}
      <div>
        <p className="font-black text-xs uppercase tracking-wide text-gray-400 mb-3">Категорії</p>
        <nav className="space-y-1">
          <Link
            to="/knowledge"
            className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
              !activeSlug ? 'bg-forest/10 text-forest font-semibold' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Усі статті
          </Link>
          {categories.map(c => (
            <Link
              key={c.id}
              to={`/knowledge?category=${c.slug}`}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeSlug === c.slug ? 'bg-forest/10 text-forest font-semibold' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span>{c.emoji ?? '📄'}</span>
              {c.name}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  )
}
