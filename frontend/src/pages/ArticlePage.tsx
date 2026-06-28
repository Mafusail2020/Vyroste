import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { JSONContent } from '@tiptap/react'
import api from '../lib/api'
import { renderArticleHtml, extractToc, slugifyHeading } from '../lib/tiptap'
import KbSidebar, { type KbCategory } from '../components/KbSidebar'
import ArticleToc from '../components/ArticleToc'
import BookmarkButton from '../components/BookmarkButton'

interface RelatedArticle {
  id: string
  title: string
  slug: string
  excerpt: string | null
  cover_image: string | null
  reading_minutes: number
}

interface Article {
  id: string
  category_id: string | null
  title: string
  slug: string
  excerpt: string | null
  content: JSONContent
  cover_image: string | null
  tags: string[] | null
  author: string | null
  views: number
  reading_minutes: number
  created_at: string
  related: RelatedArticle[]
}

export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>()
  const [article, setArticle] = useState<Article | null>(null)
  const [categories, setCategories] = useState<KbCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.get<KbCategory[]>('/api/knowledge/categories').then(r => setCategories(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!slug) return
    setLoading(true); setNotFound(false)
    api.get<Article>(`/api/knowledge/articles/${slug}`)
      .then(r => {
        setArticle(r.data)
        api.post(`/api/knowledge/articles/${r.data.id}/view`).catch(() => {})
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

  const html = useMemo(() => (article ? renderArticleHtml(article.content) : ''), [article])
  const toc = useMemo(() => (article ? extractToc(article.content) : []), [article])

  // Assign ids to rendered headings so the TOC anchors + scroll-spy line up.
  useEffect(() => {
    if (!contentRef.current) return
    contentRef.current.querySelectorAll('h2, h3').forEach(h => {
      if (h.textContent) h.id = slugifyHeading(h.textContent)
    })
  }, [html])

  const activeCat = categories.find(c => c.id === article?.category_id)

  if (loading) return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="h-64 bg-white rounded-2xl border border-gray-100 animate-pulse" />
    </div>
  )
  if (notFound || !article) return (
    <div className="max-w-xl mx-auto px-6 py-20 text-center text-gray-400">
      <div className="text-4xl mb-3">📭</div>
      <p className="font-semibold text-gray-500">Статтю не знайдено</p>
      <Link to="/knowledge" className="text-forest hover:underline text-sm mt-3 inline-block">← До бази знань</Link>
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-10">

        {/* ── Main: article ── */}
        <article className="min-w-0">
          <Link to="/knowledge" className="text-sm text-gray-400 hover:text-forest">← База знань</Link>

          {activeCat && (
            <Link to={`/knowledge?category=${activeCat.slug}`}
              className="inline-block ml-4 text-xs font-bold uppercase tracking-wide text-forest bg-forest/10 px-2.5 py-1 rounded-full">
              {activeCat.emoji} {activeCat.name}
            </Link>
          )}

          <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight mt-3 mb-3">{article.title}</h1>

          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400 mb-6">
            <span>{article.author}</span>
            <span>·</span>
            <span>⏱ {article.reading_minutes} хв читання</span>
            <span>·</span>
            <span>👁 {article.views}</span>
            <span className="ml-auto"><BookmarkButton articleId={article.id} /></span>
          </div>

          {article.cover_image && (
            <img src={article.cover_image} alt={article.title} className="w-full rounded-2xl object-cover mb-8 max-h-96" />
          )}

          <div ref={contentRef} className="prose-article" dangerouslySetInnerHTML={{ __html: html }} />

          {(article.tags?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-gray-100">
              {article.tags!.map(t => (
                <Link key={t} to={`/knowledge?q=${encodeURIComponent(t)}`}
                  className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 hover:bg-forest/10 hover:text-forest">
                  #{t}
                </Link>
              ))}
            </div>
          )}

          {/* Related */}
          {article.related.length > 0 && (
            <div className="mt-12">
              <h2 className="font-black text-sm uppercase tracking-wide text-gray-700 mb-4">Схожі статті</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {article.related.map(r => (
                  <Link key={r.id} to={`/knowledge/${r.slug}`}
                    className="flex gap-3 bg-white rounded-xl border border-gray-100 p-3 hover:shadow-md transition-all">
                    {r.cover_image
                      ? <img src={r.cover_image} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
                      : <div className="w-16 h-16 rounded-lg bg-card-green flex items-center justify-center text-xl shrink-0">📄</div>}
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 text-sm leading-tight line-clamp-2">{r.title}</p>
                      <p className="text-xs text-gray-400 mt-1">⏱ {r.reading_minutes} хв</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </article>

        {/* ── Sidebar ── */}
        <aside className="space-y-8">
          <div className="sticky top-24 space-y-8">
            <ArticleToc items={toc} />
            <KbSidebar categories={categories} activeSlug={activeCat?.slug} />
          </div>
        </aside>
      </div>
    </div>
  )
}
