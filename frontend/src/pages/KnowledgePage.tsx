import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import api from '../lib/api'
import KbSidebar, { type KbCategory as SidebarCategory } from '../components/KbSidebar'
import arrowCurveDown from '../assets/arrow_curve_down.png'

interface Category {
  id: string
  name: string
  slug: string
  emoji: string | null
  description: string | null
  subcategories: string[] | null
  article_count: number
  read_count: number
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

  const gridRef = useRef<HTMLDivElement>(null)
  const dealtRef = useRef(false)

  useEffect(() => {
    api.get<Category[]>('/api/knowledge/categories').then(r => setCategories(r.data)).catch(() => {})
  }, [])

  // Deck-deal: cards start stacked at the first card's slot (later cards behind),
  // then slide out one-by-one to their grid positions, emerging from under the
  // card in front. Runs once, after the cards mount.
  useLayoutEffect(() => {
    if (!isLanding || dealtRef.current || categories.length === 0) return
    const grid = gridRef.current
    if (!grid) return
    const cards = Array.from(grid.children) as HTMLElement[]
    if (cards.length === 0) return
    dealtRef.current = true

    // Group cards by grid row (shared offsetTop); each row deals from its own
    // first card. Cards start stacked on that row's first card, behind it.
    const rows = new Map<number, HTMLElement[]>()
    cards.forEach(card => {
      const top = card.offsetTop
      if (!rows.has(top)) rows.set(top, [])
      rows.get(top)!.push(card)
    })

    rows.forEach(rowCards => {
      rowCards.sort((a, b) => a.offsetLeft - b.offsetLeft)
      const baseL = rowCards[0].offsetLeft
      rowCards.forEach((card, j) => {
        card.style.transition = 'none'
        card.style.transform = `translate(${baseL - card.offsetLeft}px, 0)`
        card.style.zIndex = String(rowCards.length - j)   // first card on top → rest slide out from under
      })
    })
    void grid.offsetHeight   // flush the stacked start state

    requestAnimationFrame(() => {
      rows.forEach(rowCards => {
        rowCards.forEach((card, j) => {
          card.style.transition = `transform 1s cubic-bezier(0.16,1,0.3,1) ${j * 130}ms, box-shadow 0.3s ease`
          card.style.transform = 'translate(0, 0)'
        })
      })
    })
  }, [categories, isLanding])

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
                className="px-3 flex items-center justify-center rounded bg-[#6E9150] hover:bg-[#5e7d42] transition-colors">
                <Search className="w-4 h-4 text-white" />
              </button>
            </form>
            {/* hand-drawn arrow */}
            <img src={arrowCurveDown} alt="" aria-hidden="true"
              className="hidden lg:block absolute -bottom-16 left-40 w-32 pointer-events-none select-none" />
          </div>
          <div className="rounded-2xl overflow-hidden shadow-lg aspect-[16/9] bg-card-green">
            <img src={HERO_IMG} alt="Сад" className="w-full h-full object-cover" loading="lazy" />
          </div>
        </div>

        {/* Category cards */}
        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {categories.map((c, i) => {
            const a = ACCENTS[Math.floor(i / 3) % ACCENTS.length]
            // Progress bar fills with the share of articles the user has read.
            const pct = c.article_count > 0
              ? Math.min(100, Math.round((c.read_count / c.article_count) * 100))
              : 0
            return (
              <div key={c.id} className="bg-white rounded-lg border border-gray-100 p-5 flex flex-col hover:shadow-md">
                {/* Header: title + counter on a row, split rule fully below */}
                <div className="mb-3">
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <h2 className="font-black text-2xl text-slate-500 leading-tight">{c.name}</h2>
                    <div className="shrink-0 rounded-sm px-2.5 py-1 text-center leading-none" style={{ background: a.badgeBg }}>
                      <div className="font-black text-lg text-gray-700">{c.article_count}</div>
                      <div className="text-[10px] text-gray-500">статті</div>
                    </div>
                  </div>
                  {/* progress rule: accent share = read / total articles */}
                  <div className="h-[3px] rounded-full" style={{ background: `linear-gradient(to right, ${a.bar} 0 ${pct}%, #E5E7EB ${pct}% 100%)` }} />
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

  /* ── Filtered: editorial article feed + sidebar ───────────────────────── */
  const activeCat = categories.find(c => c.slug === category)
  const heading = q ? `Пошук: «${q}»` : activeCat?.name || 'База знань'
  const sidebarCats: SidebarCategory[] = categories.map(c => ({
    id: c.id, name: c.name, slug: c.slug, emoji: c.emoji, subcategories: c.subcategories,
  }))

  return (
    <div className="bg-cream min-h-screen">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex flex-col lg:flex-row gap-12">

          {/* ── Main feed ── */}
          <div className="w-full lg:w-8/12">
            {/* Header */}
            <h1 className="text-4xl font-black text-navy uppercase tracking-tight leading-none">{heading}</h1>
            {activeCat?.description && (
              <p className="text-sm text-gray-400 mt-4 max-w-md leading-relaxed whitespace-pre-line">{activeCat.description}</p>
            )}
            <div className="flex items-center gap-3 mt-6 mb-12">
              <div className="bg-card-green px-4 py-1.5 rounded-sm">
                <span className="text-5xl font-black text-slate-700 leading-none tabular-nums">{loading ? '—' : articles.length}</span>
              </div>
              <span className="text-2xl text-gray-400">статті</span>
            </div>

            {/* Feed */}
            {loading ? (
              <div className="space-y-10">{[0, 1, 2].map(i => (
                <div key={i} className="flex gap-6">
                  <div className="w-5/12 aspect-[4/3] bg-gray-200 animate-pulse" />
                  <div className="w-7/12 space-y-3"><div className="h-7 bg-gray-200 rounded animate-pulse" /><div className="h-4 bg-gray-200 rounded animate-pulse w-5/6" /></div>
                </div>
              ))}</div>
            ) : articles.length === 0 ? (
              <div className="py-20 text-gray-400"><div className="text-4xl mb-3">📭</div><p>Статей не знайдено</p></div>
            ) : (
              <div className="space-y-12">
                {articles.map(a => (
                  <Link key={a.id} to={`/knowledge/${a.slug}`} className="flex flex-col sm:flex-row gap-6 group">
                    <div className="sm:w-5/12 shrink-0">
                      {a.cover_image
                        ? <img src={a.cover_image} alt="" className="w-full aspect-[4/3] object-cover border-b-4 border-gray-500" loading="lazy" />
                        : <div className="w-full aspect-[4/3] bg-card-green flex items-center justify-center text-4xl border-b-4 border-gray-500">📄</div>}
                    </div>
                    <div className="sm:w-7/12">
                      <h2 className="text-2xl font-black text-slate-600 leading-snug group-hover:text-forest transition-colors">{a.title}</h2>
                      {a.excerpt && <p className="text-sm text-gray-500 leading-relaxed mt-4">{a.excerpt}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <aside className="w-full lg:w-4/12">
            <KbSidebar
              categories={sidebarCats}
              activeSlug={category || undefined}
              initialQuery={q}
            />
          </aside>
        </div>
      </div>
    </div>
  )
}
