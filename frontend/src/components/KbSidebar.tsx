import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, ChevronRight, ChevronDown } from 'lucide-react'
import api from '../lib/api'

export interface KbCategory {
  id: string
  name: string
  slug: string
  emoji: string | null
  subcategories?: string[] | null
}

interface RecentArticle {
  id: string
  title: string
  slug: string
  excerpt: string | null
  cover_image: string | null
}

/** Right-column sidebar: search + nested category accordion + recent articles.
 *  Used on both KB pages (category list + single article). */
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
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [recent, setRecent] = useState<RecentArticle[]>([])

  // Self-contained: pull the newest published articles for the sidebar block.
  useEffect(() => {
    api.get<RecentArticle[]>('/api/knowledge/articles?sort=created_at')
      .then(r => setRecent(r.data.slice(0, 3)))
      .catch(() => {})
  }, [])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    navigate(q.trim() ? `/knowledge?q=${encodeURIComponent(q.trim())}` : '/knowledge')
  }

  function toggle(slug: string) {
    setOpen(prev => {
      const n = new Set(prev)
      if (n.has(slug)) n.delete(slug)
      else n.add(slug)
      return n
    })
  }

  return (
    <div className="space-y-10 sticky top-24">

      {/* ── Search: rectangular input + appended icon button ── */}
      <form onSubmit={submit} className="flex items-stretch border border-gray-300 rounded-md overflow-hidden bg-white">
        <input
          type="text" value={q} onChange={e => setQ(e.target.value)}
          placeholder="Пошук у базі знань…"
          className="flex-1 min-w-0 px-3 py-2.5 text-sm bg-transparent focus:outline-none"
        />
        <button type="submit" className="px-3 flex items-center justify-center bg-[#6E9150] hover:bg-[#5e7d42] transition-colors">
          <Search className="w-4 h-4 text-white" />
        </button>
      </form>

      {/* ── Category accordion tree ── */}
      <div>
        <p className="font-black text-sm uppercase tracking-wide text-navy mb-3">Категорії</p>
        <nav className="space-y-1.5">
          <Link
            to="/knowledge"
            className={`block px-1 py-1 text-[15px] transition-colors ${
              !activeSlug ? 'text-forest font-semibold' : 'text-gray-600 hover:text-forest'
            }`}
          >
            Усі статті
          </Link>

          {categories.map(c => {
            const isActive = activeSlug === c.slug
            const isOpen   = open.has(c.slug) || isActive   // active category stays expanded
            const subs     = c.subcategories ?? []
            const Chevron  = isOpen ? ChevronDown : ChevronRight
            return (
              <div key={c.id}>
                {/* Main category row: chevron toggles, name navigates */}
                <div className="flex items-center gap-1.5">
                  {subs.length > 0 ? (
                    <button
                      onClick={() => toggle(c.slug)}
                      aria-label={isOpen ? 'Згорнути' : 'Розгорнути'}
                      className={`shrink-0 ${isActive ? 'text-forest' : 'text-gray-400'} hover:text-forest`}
                    >
                      <Chevron className="w-4 h-4" />
                    </button>
                  ) : (
                    <span className="w-4 shrink-0" />
                  )}
                  <Link
                    to={`/knowledge?category=${c.slug}`}
                    className={`text-[17px] font-bold transition-colors ${
                      isActive ? 'text-forest' : 'text-navy hover:text-forest'
                    }`}
                  >
                    {c.name}
                  </Link>
                </div>

                {/* Subcategories: plain, non-filtering labels */}
                {isOpen && subs.length > 0 && (
                  <ul className="mt-1 mb-2 ml-5 space-y-1">
                    {subs.map(s => (
                      <li key={s} className="text-[15px] text-gray-500">{s}</li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </nav>
      </div>

      {/* ── Recent articles ── */}
      {recent.length > 0 && (
        <div>
          <p className="font-black text-sm uppercase tracking-wide text-navy mb-4">Останні статті</p>
          <div className="space-y-9">
            {recent.map(a => (
              <Link key={a.id} to={`/knowledge/${a.slug}`} className="block group">
                {a.cover_image
                  ? <img src={a.cover_image} alt="" className="w-full aspect-[16/10] object-cover rounded-xl" loading="lazy" />
                  : <div className="w-full aspect-[16/10] bg-card-green flex items-center justify-center text-3xl rounded-xl">📄</div>}
                <p className="text-sm font-semibold text-gray-700 mt-2 leading-snug group-hover:text-forest transition-colors">{a.title}</p>
                {a.excerpt && <p className="text-xs text-gray-400 mt-1 leading-relaxed line-clamp-3">{a.excerpt}</p>}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
