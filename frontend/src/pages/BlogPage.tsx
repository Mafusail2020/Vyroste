import { useEffect, useRef, useState } from 'react'

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface Post {
  id: string
  category: string
  title: string
  excerpt: string
  author: string
  date: string
  readTime: string
  emoji: string
  gradientFrom: string
  gradientTo: string
}

/* ─── Static content ─────────────────────────────────────────────────────── */

const CATEGORY_STYLE: Record<string, { bg: string; text: string }> = {
  'Місячний календар': { bg: 'bg-purple-100',  text: 'text-purple-700' },
  'Вирощування':       { bg: 'bg-card-green',  text: 'text-forest' },
  'Поради':            { bg: 'bg-card-blue',   text: 'text-navy' },
  'Технології':        { bg: 'bg-amber-100',   text: 'text-amber-700' },
  'Мапи':              { bg: 'bg-teal-100',    text: 'text-teal-700' },
}

const ALL_CATS = ['Всі', ...Object.keys(CATEGORY_STYLE)]

const FEATURED: Post = {
  id: 'f1',
  category: 'Місячний календар',
  title: 'Місячний календар садівника на 2026 рік: коли сіяти, пересаджувати та збирати врожай',
  excerpt: 'Детальний гід по місячному циклу для кожного місяця 2026 року. Дізнайтесь, коли краще сіяти кореневі культури, а коли — листяні, та як місячні фази допомагають отримати рекордний врожай.',
  author: 'Ольга Коваль',
  date: '10 червня 2026',
  readTime: '8 хв',
  emoji: '🌙',
  gradientFrom: '#D8C8F0',
  gradientTo: '#BBE3BB',
}

const POPULAR: Pick<Post, 'id' | 'category' | 'title' | 'date' | 'readTime'>[] = [
  { id: 'p1', category: 'Поради',            title: '5 культур, які варто посіяти в червні',               date: '8 чер 2026',  readTime: '4 хв' },
  { id: 'p2', category: 'Вирощування',       title: 'Як правильно поливати томати в спеку',                date: '5 чер 2026',  readTime: '5 хв' },
  { id: 'p3', category: 'Технології',        title: 'GDD-метод: наукова основа для кращого врожаю',        date: '1 чер 2026',  readTime: '6 хв' },
  { id: 'p4', category: 'Мапи',              title: 'Розсадники України: де купити якісну розсаду',         date: '28 тра 2026', readTime: '3 хв' },
  { id: 'p5', category: 'Поради',            title: 'Мульчування: чому це найважливіший прийом садівника', date: '24 тра 2026', readTime: '5 хв' },
]

const POSTS: Post[] = [
  {
    id: 'r1',
    category: 'Вирощування',
    title: 'Коли садити огірки: повний гід по регіонах України',
    excerpt: 'Огірки — примхлива культура. Дата посадки залежить не лише від календаря, а й від вашого регіону та типу ґрунту.',
    author: 'Іван Петренко',
    date: '7 чер 2026',
    readTime: '6 хв',
    emoji: '🥒',
    gradientFrom: '#BBE3BB',
    gradientTo: '#C2E3F5',
  },
  {
    id: 'r2',
    category: 'Місячний календар',
    title: 'Місячні фази та їх вплив на ріст рослин: наука чи міф?',
    excerpt: 'Досліджуємо, чи справді місячний цикл впливає на ріст коренів та листя — і що кажуть сучасні агрономи.',
    author: 'Марина Сидоренко',
    date: '5 чер 2026',
    readTime: '7 хв',
    emoji: '🌕',
    gradientFrom: '#D8C8F0',
    gradientTo: '#E9D8F8',
  },
  {
    id: 'r3',
    category: 'Поради',
    title: 'Помилки початківців у вирощуванні томатів — і як їх уникнути',
    excerpt: 'Зібрали 8 найпоширеніших помилок, через які врожай томатів розчаровує. Перевірте себе!',
    author: 'Ольга Коваль',
    date: '3 чер 2026',
    readTime: '5 хв',
    emoji: '🍅',
    gradientFrom: '#FED7AA',
    gradientTo: '#FCA5A5',
  },
  {
    id: 'r4',
    category: 'Поради',
    title: 'Балкон-город: 10 найкращих культур для міського вирощування',
    excerpt: 'Живете у квартирі? Це не привід відмовлятись від свіжих овочів. Ось що реально виростити на балконі.',
    author: 'Дмитро Іванов',
    date: '1 чер 2026',
    readTime: '4 хв',
    emoji: '🪴',
    gradientFrom: '#C2E3F5',
    gradientTo: '#BBE3BB',
  },
  {
    id: 'r5',
    category: 'Технології',
    title: 'Як читати дані GDD і що означають відсотки в Виросте',
    excerpt: 'Пояснюємо, що таке Градусо-Дні Росту, навіщо вони потрібні і як інтерпретувати прогрес у вашому особистому календарі.',
    author: 'Марина Сидоренко',
    date: '29 тра 2026',
    readTime: '5 хв',
    emoji: '🌡️',
    gradientFrom: '#FEF3C7',
    gradientTo: '#FDE68A',
  },
  {
    id: 'r6',
    category: 'Вирощування',
    title: 'Ґрунт для розсади: як приготувати власну суміш вдома',
    excerpt: 'Магазинний ґрунт не завжди підходить. Розповідаємо, як зробити ідеальний субстрат для розсади своїми руками.',
    author: 'Іван Петренко',
    date: '26 тра 2026',
    readTime: '6 хв',
    emoji: '🌱',
    gradientFrom: '#D1FAE5',
    gradientTo: '#BBE3BB',
  },
  {
    id: 'r7',
    category: 'Мапи',
    title: 'Як знайти перевірений розсадник поруч: огляд мапи Виросте',
    excerpt: 'Показуємо, як працює наша інтерактивна мапа розсадників і як за 2 хвилини знайти перевіреного постачальника.',
    author: 'Ольга Коваль',
    date: '22 тра 2026',
    readTime: '3 хв',
    emoji: '🗺️',
    gradientFrom: '#C2E3F5',
    gradientTo: '#A7D8F5',
  },
  {
    id: 'r8',
    category: 'Місячний календар',
    title: 'Нове та повне місяце: як планувати полив і підживлення',
    excerpt: 'Під час нового місяця рослини краще засвоюють добрива, а в повнолуння — активно ростуть. Дізнайтесь, як це використати.',
    author: 'Марина Сидоренко',
    date: '18 тра 2026',
    readTime: '4 хв',
    emoji: '🌑',
    gradientFrom: '#E0E7FF',
    gradientTo: '#D8C8F0',
  },
]

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function CategoryBadge({ cat, className = '' }: { cat: string; className?: string }) {
  const s = CATEGORY_STYLE[cat] ?? { bg: 'bg-gray-100', text: 'text-gray-600' }
  return (
    <span className={`inline-block text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${s.bg} ${s.text} ${className}`}>
      {cat}
    </span>
  )
}

function FadeIn({
  children,
  delay = 0,
  from = 'bottom',
  className = '',
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

  const init =
    from === 'left' ? 'translateX(-28px)' :
    from === 'right' ? 'translateX(28px)' :
    'translateY(24px)'

  return (
    <div
      ref={ref}
      className={className}
      style={{
        transition: `opacity 0.55s ease ${delay}ms, transform 0.55s ease ${delay}ms`,
        opacity: vis ? 1 : 0,
        transform: vis ? 'none' : init,
      }}
    >
      {children}
    </div>
  )
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function FeaturedCard({ post }: { post: Post }) {
  return (
    <FadeIn from="left" className="group flex flex-col bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-shadow duration-300 cursor-pointer h-full">
      {/* Image */}
      <div
        className="h-56 flex items-center justify-center text-7xl select-none relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${post.gradientFrom}, ${post.gradientTo})` }}
      >
        <span className="group-hover:scale-110 transition-transform duration-500 drop-shadow-sm">{post.emoji}</span>
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
      </div>
      {/* Content */}
      <div className="flex flex-col flex-1 p-6">
        <CategoryBadge cat={post.category} className="mb-3 self-start" />
        <h2 className="font-black text-gray-900 text-xl leading-snug mb-3 group-hover:text-forest transition-colors duration-200">
          {post.title}
        </h2>
        <p className="text-gray-500 text-sm leading-relaxed flex-1 mb-5">{post.excerpt}</p>
        <div className="flex items-center justify-between text-xs text-gray-400 mt-auto pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-card-green flex items-center justify-center text-xs font-black text-forest">
              {post.author[0]}
            </div>
            <span className="font-medium text-gray-500">{post.author}</span>
          </div>
          <div className="flex items-center gap-3">
            <span>{post.date}</span>
            <span className="px-2 py-0.5 bg-gray-100 rounded-full">{post.readTime}</span>
          </div>
        </div>
      </div>
    </FadeIn>
  )
}

function PopularSidebar({ posts }: { posts: typeof POPULAR }) {
  return (
    <FadeIn from="right" className="flex flex-col gap-0 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden h-fit">
      <div className="px-5 pt-5 pb-3 border-b border-gray-100">
        <h3 className="font-black text-xs uppercase tracking-widest text-gray-400">Популярні статті</h3>
      </div>
      {posts.map((p, i) => {
        const s = CATEGORY_STYLE[p.category] ?? { bg: 'bg-gray-100', text: 'text-gray-600' }
        return (
          <div
            key={p.id}
            className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors duration-150 cursor-pointer group border-b border-gray-50 last:border-b-0"
          >
            <span className="text-2xl font-black text-gray-100 group-hover:text-gray-200 transition-colors shrink-0 w-6 text-center leading-none mt-0.5">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 leading-snug group-hover:text-forest transition-colors duration-150 mb-1.5">
                {p.title}
              </p>
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>{p.category}</span>
                <span className="text-xs text-gray-400">{p.date}</span>
                <span className="text-xs text-gray-300">· {p.readTime}</span>
              </div>
            </div>
          </div>
        )
      })}
    </FadeIn>
  )
}

function PostCard({ post, delay }: { post: Post; delay: number }) {
  return (
    <FadeIn delay={delay} className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-200 cursor-pointer h-full">
      <div
        className="h-36 flex items-center justify-center text-5xl select-none relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${post.gradientFrom}, ${post.gradientTo})` }}
      >
        <span className="group-hover:scale-110 transition-transform duration-500">{post.emoji}</span>
      </div>
      <div className="flex flex-col flex-1 p-4">
        <CategoryBadge cat={post.category} className="mb-2 self-start" />
        <h3 className="font-bold text-gray-800 text-sm leading-snug mb-2 group-hover:text-forest transition-colors duration-150 flex-1">
          {post.title}
        </h3>
        <p className="text-xs text-gray-400 leading-relaxed mb-3 line-clamp-2">{post.excerpt}</p>
        <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-100">
          <span className="font-medium text-gray-500 truncate max-w-[100px]">{post.author}</span>
          <span className="px-2 py-0.5 bg-gray-100 rounded-full shrink-0">{post.readTime}</span>
        </div>
      </div>
    </FadeIn>
  )
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function BlogPage() {
  const [activeCat, setActiveCat] = useState('Всі')
  const [search, setSearch] = useState('')

  const filtered = POSTS.filter(p => {
    const matchCat = activeCat === 'Всі' || p.category === activeCat
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  return (
    <div className="bg-cream min-h-screen">

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
            <h1
              className="font-black text-forest uppercase leading-none mb-3"
              style={{ fontSize: 'clamp(28px, 4.5vw, 56px)', letterSpacing: '-1px' }}
            >
              Блог про <span className="text-gray-800">вирощування</span>
            </h1>
          </FadeIn>
          <FadeIn delay={120}>
            <p className="text-gray-500 text-base max-w-lg leading-relaxed mb-8">
              Поради, гайди та натхнення для садівників — від балконних рослин до повноцінного городу
            </p>
          </FadeIn>

          {/* Category filter + search */}
          <FadeIn delay={180}>
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex flex-wrap gap-2">
                {ALL_CATS.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCat(cat)}
                    className={`text-xs font-bold uppercase tracking-wide px-4 py-2 rounded-full transition-all duration-150
                      ${activeCat === cat
                        ? 'bg-forest text-white shadow-sm scale-[1.03]'
                        : 'bg-white border border-gray-200 text-gray-600 hover:border-forest hover:text-forest'
                      }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Пошук статей..."
                  className="pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-full focus:outline-none focus:border-forest transition-colors w-48"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 pb-20">

        {/* ── Featured + Popular (only when no filter active) ─────────── */}
        {activeCat === 'Всі' && !search && (
          <section className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-12">
            <div className="lg:col-span-3">
              <FadeIn delay={0} className="mb-2">
                <span className="text-xs font-black uppercase tracking-widest text-gray-400">Головна стаття</span>
              </FadeIn>
              <FeaturedCard post={FEATURED} />
            </div>
            <div className="lg:col-span-2">
              <FadeIn delay={80} className="mb-2">
                <span className="text-xs font-black uppercase tracking-widest text-gray-400">Топ тижня</span>
              </FadeIn>
              <PopularSidebar posts={POPULAR} />
            </div>
          </section>
        )}

        {/* ── Posts grid ──────────────────────────────────────────────── */}
        <section>
          <FadeIn delay={0} className="flex items-center justify-between mb-5">
            <h2 className="font-black text-sm uppercase tracking-widest text-gray-700">
              {activeCat === 'Всі' && !search ? 'Нові статті' : `${filtered.length} ${filtered.length === 1 ? 'стаття' : filtered.length < 5 ? 'статті' : 'статей'}`}
            </h2>
            {(activeCat !== 'Всі' || search) && (
              <button
                onClick={() => { setActiveCat('Всі'); setSearch('') }}
                className="text-xs text-gray-400 hover:text-forest transition-colors font-medium"
              >
                ← Всі статті
              </button>
            )}
          </FadeIn>

          {filtered.length === 0 ? (
            <div className="py-20 text-center text-gray-400">
              <div className="text-4xl mb-3">🌾</div>
              <p>Статей не знайдено. Спробуйте інший запит.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {filtered.map((p, i) => (
                <PostCard key={p.id} post={p} delay={i * 60} />
              ))}
            </div>
          )}
        </section>

        {/* ── Newsletter ──────────────────────────────────────────────── */}
        <FadeIn delay={0} className="mt-16">
          <div className="bg-forest rounded-3xl p-8 md:p-10 relative overflow-hidden">
            <div aria-hidden className="absolute -top-10 -right-10 w-52 h-52 rounded-full bg-white/5 pointer-events-none" />
            <div aria-hidden className="absolute bottom-0 left-1/3 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="max-w-sm">
                <div className="text-white/60 text-xs font-bold uppercase tracking-wider mb-1.5">💌 Розсилка</div>
                <h3 className="text-white font-black text-xl uppercase mb-1">Корисне раз на тиждень</h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  Сезонні поради, нові статті та ексклюзивні матеріали — прямо у вашу скриньку.
                </p>
              </div>
              <form
                className="flex gap-2 flex-col sm:flex-row w-full md:w-auto md:min-w-[340px]"
                onSubmit={e => { e.preventDefault() }}
              >
                <input
                  type="email"
                  placeholder="your@email.com"
                  className="flex-1 px-4 py-3 rounded-xl bg-white/15 border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none focus:border-white/50 transition-colors"
                />
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-white text-forest font-black text-sm uppercase tracking-wide
                             hover:bg-amber-50 hover:scale-[1.03] active:scale-[0.97]
                             transition-all duration-150 shrink-0"
                >
                  Підписатися →
                </button>
              </form>
            </div>
          </div>
        </FadeIn>

      </div>
    </div>
  )
}
