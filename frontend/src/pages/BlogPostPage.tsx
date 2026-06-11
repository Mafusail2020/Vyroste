import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../lib/api'

interface Post {
  id: string
  category: string
  title: string
  excerpt: string | null
  content: string | null
  author: string
  emoji: string
  gradient_from: string
  gradient_to: string
  views: number
  created_at: string
}

const CATEGORY_STYLE: Record<string, { bg: string; text: string }> = {
  'Місячний календар': { bg: 'bg-purple-100',  text: 'text-purple-700' },
  'Вирощування':       { bg: 'bg-card-green',  text: 'text-forest' },
  'Поради':            { bg: 'bg-card-blue',   text: 'text-navy' },
  'Технології':        { bg: 'bg-amber-100',   text: 'text-amber-700' },
  'Мапи':              { bg: 'bg-teal-100',    text: 'text-teal-700' },
}

export default function BlogPostPage() {
  const { id } = useParams<{ id: string }>()
  const [post, setPost]       = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const viewCalled = useRef(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    api.get<Post>(`/api/blog/posts/${id}`)
      .then(r => {
        setPost(r.data)
        if (!viewCalled.current) {
          viewCalled.current = true
          api.post(`/api/blog/posts/${id}/view`).catch(() => {})
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="max-w-3xl mx-auto px-6 py-12 space-y-4 animate-pulse">
      <div className="h-8 bg-gray-200 rounded-lg w-1/4" />
      <div className="h-64 bg-gray-200 rounded-3xl" />
      <div className="h-6 bg-gray-200 rounded-lg w-3/4" />
      <div className="h-4 bg-gray-200 rounded-lg w-full" />
      <div className="h-4 bg-gray-200 rounded-lg w-5/6" />
    </div>
  )

  if (notFound || !post) return (
    <div className="max-w-xl mx-auto px-6 py-24 text-center">
      <div className="text-5xl mb-4">🌾</div>
      <h2 className="text-2xl font-black text-gray-700 uppercase mb-3">Статтю не знайдено</h2>
      <Link to="/blog" className="text-forest hover:underline text-sm">← До блогу</Link>
    </div>
  )

  const catStyle = CATEGORY_STYLE[post.category] ?? { bg: 'bg-gray-100', text: 'text-gray-600' }
  const date = new Date(post.created_at).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })

  const paragraphs = (post.content ?? post.excerpt ?? '').split('\n').filter(Boolean)

  return (
    <article className="bg-cream min-h-screen">

      {/* Hero image */}
      <div
        className="h-64 md:h-80 flex items-center justify-center text-8xl select-none relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${post.gradient_from}, ${post.gradient_to})` }}
      >
        <span className="drop-shadow-sm" style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))' }}>
          {post.emoji}
        </span>
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* Back */}
        <Link
          to="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-forest transition-colors mb-6 group"
        >
          <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
          Назад до блогу
        </Link>

        {/* Category + meta */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className={`inline-block text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${catStyle.bg} ${catStyle.text}`}>
            {post.category}
          </span>
          <span className="text-sm text-gray-400">{date}</span>
          <span className="text-sm text-gray-300">·</span>
          <span className="text-sm text-gray-400 flex items-center gap-1">
            <span>👁</span> {post.views.toLocaleString('uk-UA')} переглядів
          </span>
        </div>

        {/* Title */}
        <h1 className="font-black text-gray-900 leading-tight mb-4" style={{ fontSize: 'clamp(22px, 3.5vw, 36px)' }}>
          {post.title}
        </h1>

        {/* Author */}
        <div className="flex items-center gap-2 mb-8 pb-8 border-b border-gray-200">
          <div className="w-8 h-8 rounded-full bg-card-green flex items-center justify-center text-sm font-black text-forest shrink-0">
            {post.author[0]}
          </div>
          <span className="text-sm font-semibold text-gray-600">{post.author}</span>
        </div>

        {/* Body */}
        {paragraphs.length > 0 ? (
          <div className="prose prose-sm max-w-none">
            {paragraphs.map((p, i) => (
              <p key={i} className="text-gray-700 leading-relaxed mb-4 text-base">
                {p}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 italic text-sm">Повний текст статті ще не додано.</p>
        )}

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-forest text-white font-bold text-sm uppercase tracking-wide hover:bg-forest-dark transition-colors hover:scale-[1.02] active:scale-[0.98]"
          >
            ← Ще статті
          </Link>
        </div>
      </div>
    </article>
  )
}
