import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { generateHTML } from '@tiptap/html'
import type { JSONContent } from '@tiptap/react'

// Extensions shared by the editor and the read-time HTML renderer so both
// agree on the document schema. (Placeholder is editor-only, added there.)
export const articleExtensions = [StarterKit, Image]

/** Render a stored TipTap document (JSONB) to HTML for the reading view. */
export function renderArticleHtml(doc: JSONContent | null | undefined): string {
  if (!doc || typeof doc !== 'object' || !('type' in doc)) return ''
  try {
    return generateHTML(doc as JSONContent, articleExtensions)
  } catch {
    return ''
  }
}

/** Pull plain headings (H2/H3) out of a doc for the table of contents. */
export interface TocItem { id: string; text: string; level: number }

export function extractToc(doc: JSONContent | null | undefined): TocItem[] {
  const items: TocItem[] = []
  function walk(node: JSONContent) {
    if (node.type === 'heading' && (node.attrs?.level === 2 || node.attrs?.level === 3)) {
      const text = (node.content ?? []).map(c => c.text ?? '').join('')
      if (text) items.push({ id: slugifyHeading(text), text, level: node.attrs.level })
    }
    ;(node.content ?? []).forEach(walk)
  }
  if (doc && typeof doc === 'object' && 'content' in doc) walk(doc as JSONContent)
  return items
}

export function slugifyHeading(text: string): string {
  return 'h-' + text.toLowerCase().replace(/\s+/g, '-').replace(/[^\wа-яіїєґ-]/gi, '').slice(0, 50)
}
