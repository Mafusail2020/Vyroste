import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import api from '../lib/api'
import KbSidebar, { type KbCategory as SidebarCategory } from '../components/KbSidebar'

interface Category {
  id: string
  name: string
  slug: string
  emoji: string | null
  description: string | null
  subcategories: string[] | null
  article_count: number
}

interface ArticleCard {
  id: string
  title: string
  slug: string
  excerpt: string | null
  cover_image: string | null
  tags: string[] | null
  views: number
  reading_minutes: number
}

// Card accent cycles per row of three (green → coral → blue), like the mockup.
const ACCENTS = [
  { badgeBg: '#BBE3BB', badgeText: '#1E4510', bar: '#4B9F2F' },
  { badgeBg: '#FCA5A5', badgeText: '#7F1D1D', bar: '#EF6B6B' },
  { badgeBg: '#C2E3F5', badgeText: '#1A237E', bar: '#6AAEE0' },
]

const HERO_IMG =
  'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=1100&q=70'

export default function KnowledgePage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const category = params.get('category') ?? ''
  const q = params.get('q') ?? ''
  const isLanding = !category && !q

  const [categories, setCategories] = useState<Category[]>([])
  const [articles, setArticles] = useState<ArticleCard[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.get<Category[]>('/api/knowledge/categories').then(r => setCategories(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (isLanding) { setLoading(false); return }
    setLoading(true)
    const qs = new URLSearchParams()
    if (category) qs.set('category', category)
    if (q) qs.set('q', q)
    api.get<ArticleCard[]>(`/api/knowledge/articles?${qs.toString()}`)
      .then(r => setArticles(r.data))
      .catch(() => setArticles([]))
      .finally(() => setLoading(false))
  }, [category, q, isLanding])

  function submitSearch(e: React.FormEvent) {
    e.preventDefault()
    navigate(search.trim() ? `/knowledge?q=${encodeURIComponent(search.trim())}` : '/knowledge')
  }

  /* ── Landing: category grid ───────────────────────────────────────────── */
  if (isLanding) return (
    <div className="bg-cream min-h-screen">
      <div className="max-w-6xl mx-auto px-6 py-12">

        {/* Intro + hero */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(260px,400px)_1fr] gap-10 items-center mb-14">
          <div className="relative">
            <h1 className="text-4xl font-black text-navy mb-4">База знань</h1>
            <p className="text-gray-500 text-sm leading-relaxed mb-6 max-w-xs">
              Усе про сад і город — гіди з вирощування, поради агрономів та відповіді на питання.
            </p>
            <form onSubmit={submitSearch} className="flex items-stretch max-w-sm border border-gray-300 rounded-md bg-[#F6F6F3] p-0.5">
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Пошук статей…"
                className="flex-1 min-w-0 px-3 py-2 bg-transparent text-sm focus:outline-none"
              />
              <button type="submit"
                className="px-3 flex items-center justify-center rounded bg-[#6E8B6E] hover:bg-[#5d795d] transition-colors">
                <Search className="w-4 h-4 text-white" />
              </button>
            </form>
            {/* hand-drawn arrow */}
            <svg className="hidden lg:block absolute -bottom-16 left-24 text-gray-300" width="120" height="60" viewBox="0 0 120 60" fill="none">
              <path d="M5 10 C 40 5, 70 20, 95 45" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M85 38 L97 47 L84 52" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="rounded-2xl overflow-hidden shadow-lg aspect-[16/9] bg-card-green">
            <img src={HERO_IMG} alt="Сад" className="w-full h-full object-cover" loading="lazy" />
          </div>
        </div>

        {/* Category cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {categories.map((c, i) => {
            const a = ACCENTS[Math.floor(i / 3) % ACCENTS.length]
            return (
              <div key={c.id} className="bg-white rounded-lg border border-gray-100 p-5 flex flex-col hover:shadow-md transition-shadow">
                {/* Header: title + counter on a row, split rule fully below */}
                <div className="mb-3">
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <h2 className="font-black text-2xl text-slate-500 leading-tight">{c.name}</h2>
                    <div className="shrink-0 rounded-sm px-2.5 py-1 text-center leading-none" style={{ background: a.badgeBg }}>
                      <div className="font-black text-lg text-gray-700">{c.article_count}</div>
                      <div className="text-[10px] text-gray-500">статті</div>
                    </div>
                  </div>
                  {/* full-width rule: first 1/3 accent, rest grey */}
                  <div className="h-[3px] rounded-full" style={{ background: `linear-gradient(to right, ${a.bar} 0 33%, #E5E7EB 33% 100%)` }} />
                </div>

                {c.description && <p className="text-sm text-gray-500 leading-relaxed mb-3">{c.description}</p>}

                {/* Subcategories — full-bleed light-green hover */}
                {(c.subcategories?.length ?? 0) > 0 && (
                  <ul className="mb-4 flex-1">
                    {c.subcategories!.map(s => (
                      <li key={s}>
                        <Link
                          to={`/knowledge?category=${c.slug}`}
                          className="group flex items-center gap-2 text-[15px] text-gray-600 -mx-5 px-5 py-1.5 hover:bg-[#E6F0D5] transition-colors duration-200"
                        >
                          <span className="text-[#4B9F2F] text-sm leading-none transition-transform duration-200 group-hover:translate-x-0.5">▸</span>
                          {s}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}

                <Link to={`/knowledge?category=${c.slug}`} className="mt-auto text-sm font-bold text-forest hover:underline">
                  Подивитись всі статті ▸
                </Link>
              </div>
            )
          })}
          {categories.length === 0 && (
            <div className="col-span-full text-center py-16 text-gray-400">
              <div className="text-4xl mb-3">📚</div>
              <p>Категорій ще немає</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  /* ── Filtered: article list + sidebar ─────────────────────────────────── */
  const activeCat = categories.find(c => c.slug === category)
  const heading = q ? `Пошук: «${q}»` : activeCat ? `${activeCat.emoji ?? ''} ${activeCat.name}` : 'База знань'
  const sidebarCats: SidebarCategory[] = categories.map(c => ({ id: c.id, name: c.name, slug: c.slug, emoji: c.emoji }))

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-10">
        <div>
          <Link to="/knowledge" className="text-sm text-gray-400 hover:text-forest">← Усі категорії</Link>
          <h1 className="text-2xl font-black text-forest uppercase mt-2 mb-1">{heading}</h1>
          <p className="text-gray-400 text-sm mb-8">{loading ? 'Завантаження…' : `${articles.length} статей`}</p>

          {loading ? (
            <div className="space-y-4">{[0, 1, 2].map(i => <div key={i} className="h-28 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}</div>
          ) : articles.length === 0 ? (
            <div className="text-center py-20 text-gray-400"><div className="text-4xl mb-3">📭</div><p>Статей не знайдено</p></div>
          ) : (
            <div className="space-y-4">
              {articles.map(a => (
                <Link key={a.id} to={`/knowledge/${a.slug}`} className="flex gap-4 bg-white rounded-lg border border-gray-100 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
                  {a.cover_image
                    ? <img src={a.cover_image} alt="" className="w-28 h-28 rounded-xl object-cover shrink-0" />
                    : <div className="w-28 h-28 rounded-xl bg-card-green flex items-center justify-center text-3xl shrink-0">📄</div>}
                  <div className="min-w-0 flex flex-col">
                    <h2 className="font-black text-gray-800 text-lg leading-tight mb-1">{a.title}</h2>
                    {a.excerpt && <p className="text-sm text-gray-500 line-clamp-2 flex-1">{a.excerpt}</p>}
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-2">
                      <span>⏱ {a.reading_minutes} хв</span>
                      <span>👁 {a.views}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <aside><KbSidebar categories={sidebarCats} activeSlug={category || undefined} initialQuery={q} /></aside>
      </div>
    </div>
  )
}
