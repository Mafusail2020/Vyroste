import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import Seo from '../components/Seo'

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface Post {
  id: string
  category: string
  title: string
  excerpt: string | null
  author: string
  emoji: string
  gradient_from: string
  gradient_to: string
  cover_image: string | null
  is_featured: boolean
  views: number
  created_at: string
}

/* ─── Constants ──────────────────────────────────────────────────────────── */

const CATEGORY_STYLE: Record<string, { bg: string; text: string }> = {
  'Місячний календар': { bg: 'bg-purple-100',  text: 'text-purple-700' },
  'Вирощування':       { bg: 'bg-card-green',  text: 'text-forest' },
  'Поради':            { bg: 'bg-card-blue',   text: 'text-navy' },
  'Технології':        { bg: 'bg-amber-100',   text: 'text-amber-700' },
  'Мапи':              { bg: 'bg-teal-100',    text: 'text-teal-700' },
}

const ALL_CATS = ['Всі', ...Object.keys(CATEGORY_STYLE)]

/* ─── Animation helper ───────────────────────────────────────────────────── */

function FadeIn({
  children, delay = 0, from = 'bottom', className = '',
}: {
  children: React.ReactNode
  delay?: number
  from?: 'bottom' | 'left' | 'right'
  className?: string
}) {
  const [vis, setVis] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ob = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVis(true); ob.disconnect() } },
      { threshold: 0.08 },
    )
    if (ref.current) ob.observe(ref.current)
    return () => ob.disconnect()
  }, [])

  const init = from === 'left' ? 'translateX(-28px)' : from === 'right' ? 'translateX(28px)' : 'translateY(24px)'
  return (
    <div ref={ref} className={className}
      style={{ transition: `opacity 0.55s ease ${delay}ms, transform 0.55s ease ${delay}ms`,
               opacity: vis ? 1 : 0, transform: vis ? 'none' : init }}>
      {children}
    </div>
  )
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function CategoryBadge({ cat, className = '' }: { cat: string; className?: string }) {
  const s = CATEGORY_STYLE[cat] ?? { bg: 'bg-gray-100', text: 'text-gray-600' }
  return (
    <span className={`inline-block text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${s.bg} ${s.text} ${className}`}>
      {cat}
    </span>
  )
}

function FeaturedCard({ post }: { post: Post }) {
  return (
    <FadeIn from="left" className="group h-full">
      <Link to={`/blog/${post.id}`} className="flex flex-col bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-shadow duration-300 h-full">
        <div className="h-56 flex items-center justify-center text-7xl select-none relative overflow-hidden"
          style={post.cover_image ? undefined : { background: `linear-gradient(135deg, ${post.gradient_from}, ${post.gradient_to})` }}>
          {post.cover_image
            ? <img src={post.cover_image} alt={post.title} loading="lazy" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            : <span className="group-hover:scale-110 transition-transform duration-500 drop-shadow-sm">{post.emoji}</span>}
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
          <div className="absolute top-3 left-3 bg-white/80 backdrop-blur-sm text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full text-forest">
            ⭐ Головна
          </div>
        </div>
        <div className="flex flex-col flex-1 p-6">
          <CategoryBadge cat={post.category} className="mb-3 self-start" />
          <h2 className="font-black text-gray-900 text-xl leading-snug mb-3 group-hover:text-forest transition-colors duration-200">
            {post.title}
          </h2>
          {post.excerpt && <p className="text-gray-500 text-sm leading-relaxed flex-1 mb-5 line-clamp-3">{post.excerpt}</p>}
          <div className="flex items-center justify-end text-xs text-gray-400 mt-auto pt-4">
            <span className="flex items-center gap-1">👁 {post.views}</span>
          </div>
        </div>
      </Link>
    </FadeIn>
  )
}

function PopularSidebar({ posts }: { posts: Post[] }) {
  return (
    <FadeIn from="right" className="flex flex-col bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden h-fit">
      <div className="px-5 pt-5 pb-3 border-b border-gray-100">
        <h3 className="font-black text-xs uppercase tracking-widest text-gray-400">Популярні статті</h3>
      </div>
      {posts.length === 0 && (
        <p className="px-5 py-6 text-sm text-gray-400 text-center">Ще немає переглядів</p>
      )}
      {posts.map((p, i) => {
        const s = CATEGORY_STYLE[p.category] ?? { bg: 'bg-gray-100', text: 'text-gray-600' }
        return (
          <Link key={p.id} to={`/blog/${p.id}`}
            className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors duration-150 group border-b border-gray-50 last:border-b-0">
            <span className="text-2xl font-black text-gray-100 group-hover:text-gray-200 transition-colors shrink-0 w-6 text-center leading-none mt-0.5">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 leading-snug group-hover:text-forest transition-colors mb-1.5">
                {p.title}
              </p>
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>{p.category}</span>
                <span className="text-xs text-gray-300 flex items-center gap-0.5">👁 {p.views}</span>
              </div>
            </div>
          </Link>
        )
      })}
    </FadeIn>
  )
}

function PostCard({ post, delay }: { post: Post; delay: number }) {
  return (
    <FadeIn delay={delay} className="h-full">
      <Link to={`/blog/${post.id}`}
        className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-200 h-full">
        <div className="h-36 flex items-center justify-center text-5xl select-none relative overflow-hidden"
          style={post.cover_image ? undefined : { background: `linear-gradient(135deg, ${post.gradient_from}, ${post.gradient_to})` }}>
          {post.cover_image
            ? <img src={post.cover_image} alt={post.title} loading="lazy" className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
            : <span className="group-hover:scale-110 transition-transform duration-500">{post.emoji}</span>}
        </div>
        <div className="flex flex-col flex-1 p-4">
          <CategoryBadge cat={post.category} className="mb-2 self-start" />
          <h3 className="font-bold text-gray-800 text-sm leading-snug mb-2 group-hover:text-forest transition-colors flex-1">
            {post.title}
          </h3>
          {post.excerpt && (
            <p className="text-xs text-gray-400 leading-relaxed mb-3 line-clamp-2">{post.excerpt}</p>
          )}
          <div className="flex items-center justify-end text-xs text-gray-400 pt-3">
            <span className="flex items-center gap-1 shrink-0">👁 {post.views}</span>
          </div>
        </div>
      </Link>
    </FadeIn>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
      <div className="h-36 animate-pulse bg-gray-200" />
      <div className="p-4 space-y-2">
        <div className="h-4 animate-pulse bg-gray-200 rounded-lg w-1/3" />
        <div className="h-4 animate-pulse bg-gray-200 rounded-lg w-full" />
        <div className="h-3 animate-pulse bg-gray-200 rounded-lg w-3/4" />
      </div>
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function BlogPage() {
  const [posts,    setPosts]    = useState<Post[]>([])
  const [popular,  setPopular]  = useState<Post[]>([])
  const [loading,  setLoading]  = useState(true)
  const [activeCat, setActiveCat] = useState('Всі')
  const [search,   setSearch]   = useState('')

  useEffect(() => {
    Promise.all([
      api.get<Post[]>('/api/blog/posts'),
      api.get<Post[]>('/api/blog/posts?sort=views'),
    ]).then(([r1, r2]) => {
      setPosts(r1.data)
      setPopular(r2.data.slice(0, 5))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const featured = posts.find(p => p.is_featured) ?? (posts.length > 0 ? posts[0] : null)

  const filtered = posts.filter(p => {
    const matchCat    = activeCat === 'Всі' || p.category === activeCat
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const showDefault = activeCat === 'Всі' && !search

  return (
    <div className="bg-cream min-h-screen">
      <Seo title="Блог" description="Статті про місячні календарі, GDD-метод, мульчування та сезонні поради від практиків Виросте." path="/blog" />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-14 pb-10">
        <div aria-hidden className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-card-green opacity-30 blur-3xl pointer-events-none" />
        <div aria-hidden className="absolute top-10 -left-20 w-72 h-72 rounded-full bg-card-purple opacity-20 blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6 relative z-10">
          <FadeIn delay={0}>
            <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-1.5 text-xs font-semibold text-forest uppercase tracking-wide mb-4 shadow-sm">
              🌱 Виросте — Блог
            </div>
          </FadeIn>
          <FadeIn delay={60}>
            <h1 className="font-black text-forest uppercase leading-none mb-3"
              style={{ fontSize: 'clamp(28px, 4.5vw, 56px)', letterSpacing: '-1px' }}>
              Блог про <span className="text-gray-800">вирощування</span>
            </h1>
          </FadeIn>
          <FadeIn delay={120}>
            <p className="text-gray-500 text-base max-w-lg leading-relaxed mb-8">
              Поради, гайди та натхнення для садівників — від балконних рослин до повноцінного городу
            </p>
          </FadeIn>

          <FadeIn delay={180}>
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex flex-wrap gap-2">
                {ALL_CATS.map(cat => (
                  <button key={cat} onClick={() => setActiveCat(cat)}
                    className={`text-xs font-bold uppercase tracking-wide px-4 py-2 rounded-full transition-all duration-150
                      ${activeCat === cat
                        ? 'bg-[#6E9150] text-white shadow-sm scale-[1.03]'
                        : 'bg-white border border-gray-200 text-gray-600 hover:border-forest hover:text-forest'}`}>
                    {cat}
                  </button>
                ))}
              </div>
              <div className="relative">
                <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Пошук статей..."
                  className="pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-full focus:outline-none focus:border-forest transition-colors w-48" />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 pb-20">

        {/* ── Loading skeletons ────────────────────────────────────────── */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
            {[0,1,2,3].map(i => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* ── Featured + Popular (default view only) ───────────────────── */}
        {!loading && showDefault && featured && (
          <section className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-12">
            <div className="lg:col-span-3">
              <FadeIn delay={0} className="mb-2">
                <span className="text-xs font-black uppercase tracking-widest text-gray-400">Головна стаття</span>
              </FadeIn>
              <FeaturedCard post={featured} />
            </div>
            <div className="lg:col-span-2">
              <FadeIn delay={80} className="mb-2">
                <span className="text-xs font-black uppercase tracking-widest text-gray-400">Топ за переглядами</span>
              </FadeIn>
              <PopularSidebar posts={popular} />
            </div>
          </section>
        )}

        {/* ── Posts grid ──────────────────────────────────────────────── */}
        {!loading && (
          <section>
            <FadeIn delay={0} className="flex items-center justify-between mb-5">
              <h2 className="font-black text-sm uppercase tracking-widest text-gray-700">
                {showDefault ? 'Всі статті' : `${filtered.length} ${filtered.length === 1 ? 'стаття' : filtered.length < 5 ? 'статті' : 'статей'}`}
              </h2>
              {(!showDefault) && (
                <button onClick={() => { setActiveCat('Всі'); setSearch('') }}
                  className="text-xs text-gray-400 hover:text-forest transition-colors font-medium">
                  ← Всі статті
                </button>
              )}
            </FadeIn>

            {filtered.length === 0 ? (
              <div className="py-20 text-center text-gray-400">
                <div className="text-4xl mb-3">🌾</div>
                <p>{posts.length === 0 ? 'Статей ще немає. Додайте першу через панель адміністратора.' : 'Статей не знайдено.'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {filtered.map((p, i) => (
                  <PostCard key={p.id} post={p} delay={i * 55} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Newsletter ──────────────────────────────────────────────── */}
        {!loading && (
          <FadeIn delay={0} className="mt-16">
            <div className="bg-forest rounded-3xl p-8 md:p-10 relative overflow-hidden">
              <div aria-hidden className="absolute -top-10 -right-10 w-52 h-52 rounded-full bg-white/5 pointer-events-none" />
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="max-w-sm">
                  <div className="text-white/60 text-xs font-bold uppercase tracking-wider mb-1.5">💌 Розсилка</div>
                  <h3 className="text-white font-black text-xl uppercase mb-1">Корисне раз на тиждень</h3>
                  <p className="text-white/60 text-sm leading-relaxed">Нові статті, сезонні поради та ексклюзивні матеріали прямо у вашу скриньку.</p>
                </div>
                <form className="flex gap-2 flex-col sm:flex-row w-full md:w-auto md:min-w-[340px]"
                  onSubmit={e => e.preventDefault()}>
                  <input type="email" placeholder="your@email.com"
                    className="flex-1 px-4 py-3 rounded-xl bg-white/15 border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none focus:border-white/50 transition-colors" />
                  <button type="submit"
                    className="px-6 py-3 rounded-xl bg-white text-forest font-black text-sm uppercase tracking-wide hover:bg-amber-50 hover:scale-[1.03] active:scale-[0.97] transition-all duration-150 shrink-0">
                    Підписатися →
                  </button>
                </form>
              </div>
            </div>
          </FadeIn>
        )}
      </div>
    </div>
  )
}
