/* Per-page metadata. React 19 hoists <title>/<meta>/<link> rendered anywhere
 * into <head>, so no helmet dependency is needed. Combined with the prerender
 * step (scripts/prerender.mjs) these tags end up in the static HTML crawlers see. */

const SITE = import.meta.env.VITE_SITE_URL ?? 'https://vyroste.ua'
const DEFAULT_DESC =
  'Виросте — персональний садовий помічник: регіональний календар посіву, мапа перевірених розсадників та база знань для українських садівників.'
const DEFAULT_IMG = `${SITE}/og-default.png`   // drop a 1200×630 image at frontend/public/og-default.png

interface SeoProps {
  title: string
  description?: string | null
  image?: string | null
  type?: 'website' | 'article'
  path?: string
}

export default function Seo({ title, description, image, type = 'website', path }: SeoProps) {
  const pathname = path ?? (typeof window !== 'undefined' ? window.location.pathname : '/')
  const url = `${SITE}${pathname}`
  const desc = (description && description.trim()) || DEFAULT_DESC
  const img = image || DEFAULT_IMG
  const fullTitle = title ? `${title} · Виросте` : 'Виросте — садовий помічник'

  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={url} />

      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="Виросте" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={img} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={img} />
    </>
  )
}
