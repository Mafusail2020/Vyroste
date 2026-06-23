import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../lib/api'
import KbSidebar, { type KbCategory } from '../components/KbSidebar'

interface ArticleCard {
  id: string
  title: string
  slug: string
  excerpt: string | null
  cover_image: string | null
  tags: string[] | null
  category_id: string | null
  views: number
  reading_minutes: number
}

export default function KnowledgePage() {
  const [params] = useSearchParams()
  const category = params.get('category') ?? ''
  const q = params.get('q') ?? ''

  const [categories, setCategories] = useState<KbCategory[]>([])
  const [articles, setArticles] = useState<ArticleCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<KbCategory[]>('/api/knowledge/categories').then(r => setCategories(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    const qs = new URLSearchParams()
    if (category) qs.set('category', category)
    if (q) qs.set('q', q)
    api.get<ArticleCard[]>(`/api/knowledge/articles?${qs.toString()}`)
      .then(r => setArticles(r.data))
      .catch(() => setArticles([]))
      .finally(() => setLoading(false))
  }, [category, q])

  const activeCat = categories.find(c => c.slug === category)
  const heading = q ? `Пошук: «${q}»` : activeCat ? `${activeCat.emoji ?? ''} ${activeCat.name}` : 'База знань'

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-10">

        {/* ── Main: article list ── */}
        <div>
          <h1 className="text-2xl font-black text-forest uppercase mb-1">{heading}</h1>
          <p className="text-gray-400 text-sm mb-8">
            {loading ? 'Завантаження…' : `${articles.length} статей`}
          </p>

          {loading ? (
            <div className="space-y-4">
              {[0, 1, 2].map(i => <div key={i} className="h-28 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <div className="text-4xl mb-3">📭</div>
              <p>Статей не знайдено</p>
            </div>
          ) : (
            <div className="space-y-4">
              {articles.map(a => (
                <Link
                  key={a.id}
                  to={`/knowledge/${a.slug}`}
                  className="flex gap-4 bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all"
                >
                  {a.cover_image
                    ? <img src={a.cover_image} alt="" className="w-28 h-28 rounded-xl object-cover shrink-0" />
                    : <div className="w-28 h-28 rounded-xl bg-card-green flex items-center justify-center text-3xl shrink-0">📄</div>}
                  <div className="min-w-0 flex flex-col">
                    <h2 className="font-black text-gray-800 text-lg leading-tight mb-1">{a.title}</h2>
                    {a.excerpt && <p className="text-sm text-gray-500 line-clamp-2 flex-1">{a.excerpt}</p>}
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-2">
                      <span>⏱ {a.reading_minutes} хв</span>
                      <span>👁 {a.views}</span>
                      {(a.tags ?? []).slice(0, 2).map(t => (
                        <span key={t} className="px-2 py-0.5 rounded-full bg-gray-100">{t}</span>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <aside>
          <KbSidebar categories={categories} activeSlug={category || undefined} initialQuery={q} />
        </aside>
      </div>
    </div>
  )
}
