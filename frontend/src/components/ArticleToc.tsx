import { useEffect, useState } from 'react'
import type { TocItem } from '../lib/tiptap'

/** Wikipedia-style table of contents with scroll-spy. Heading ids are set on
 * the rendered article DOM by ArticlePage to match item.id. */
export default function ArticleToc({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState<string>('')

  useEffect(() => {
    if (items.length === 0) return
    const els = items.map(i => document.getElementById(i.id)).filter(Boolean) as HTMLElement[]
    if (els.length === 0) return
    const obs = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActiveId(visible[0].target.id)
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 },
    )
    els.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [items])

  if (items.length === 0) return null

  return (
    <div>
      <p className="font-black text-xs uppercase tracking-wide text-gray-400 mb-3">Зміст</p>
      <nav className="space-y-1 border-l-2 border-gray-100">
        {items.map(i => (
          <a
            key={i.id}
            href={`#${i.id}`}
            onClick={e => {
              e.preventDefault()
              document.getElementById(i.id)?.scrollIntoView({ behavior: 'smooth' })
            }}
            className={`block text-sm py-1 -ml-0.5 border-l-2 transition-colors ${
              i.level === 3 ? 'pl-5' : 'pl-3'
            } ${
              activeId === i.id
                ? 'border-forest text-forest font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {i.text}
          </a>
        ))}
      </nav>
    </div>
  )
}
