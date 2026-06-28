/**
 * Post-build prerender: render each public route to static HTML so crawlers
 * (Google, and especially Facebook/Twitter which don't run JS) get real
 * <title>/<meta>/OG tags. Also writes sitemap.xml.
 *
 * Pipeline (wired into `npm run build`):
 *   tsc -b && vite build && node scripts/prerender.mjs
 *
 * Env:
 *   VITE_SITE_URL  public site origin for sitemap/canonical (default https://vyroste.ua)
 *   VITE_API_URL   API origin used to enumerate blog/KB slugs (default http://localhost:8000)
 *
 * Requires devDependency `puppeteer`. If puppeteer or the API is unavailable the
 * script logs a warning and exits 0 so the build still succeeds (SPA fallback).
 */
import { createServer } from 'node:http'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = join(__dirname, '..', 'dist')
const SITE = process.env.VITE_SITE_URL ?? 'https://vyroste.ua'
const API = process.env.VITE_API_URL ?? 'http://localhost:8000'
const PORT = 4178

const STATIC_ROUTES = ['/', '/about', '/contact', '/blog', '/knowledge', '/map', '/pricing']

function warn(msg) { console.warn(`[prerender] ${msg}`) }

async function fetchJson(url) {
  try {
    const r = await fetch(url)
    if (!r.ok) return null
    return await r.json()
  } catch { return null }
}

async function dynamicRoutes() {
  const routes = []
  const posts = await fetchJson(`${API}/api/blog/posts`)
  if (Array.isArray(posts)) routes.push(...posts.map(p => `/blog/${p.id}`))
  const arts = await fetchJson(`${API}/api/knowledge/articles`)
  if (Array.isArray(arts)) routes.push(...arts.map(a => `/knowledge/${a.slug}`).filter(Boolean))
  return routes
}

/** Minimal static file server over dist/ with SPA fallback to index.html. */
function startServer(indexHtml) {
  const types = {
    '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.json': 'application/json', '.ico': 'image/x-icon', '.webp': 'image/webp',
  }
  return new Promise(resolve => {
    const server = createServer(async (req, res) => {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0])
      const filePath = join(DIST, urlPath)
      const ext = urlPath.slice(urlPath.lastIndexOf('.'))
      if (ext && existsSync(filePath)) {
        res.writeHead(200, { 'Content-Type': types[ext] ?? 'application/octet-stream' })
        res.end(await readFile(filePath))
        return
      }
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end(indexHtml)   // SPA fallback so the router renders the route
    })
    server.listen(PORT, () => resolve(server))
  })
}

async function main() {
  if (!existsSync(join(DIST, 'index.html'))) {
    warn('dist/index.html missing — run `vite build` first. Skipping.')
    return
  }

  let puppeteer
  try {
    puppeteer = (await import('puppeteer')).default
  } catch {
    warn('puppeteer not installed — skipping prerender (SPA still works).')
    return
  }

  const indexHtml = await readFile(join(DIST, 'index.html'), 'utf-8')
  const routes = [...new Set([...STATIC_ROUTES, ...(await dynamicRoutes())])]
  const server = await startServer(indexHtml)

  let browser
  try {
    browser = await puppeteer.launch({ args: ['--no-sandbox'] })
  } catch (e) {
    warn(`could not launch browser (${e.message}) — skipping prerender.`)
    server.close()
    return
  }

  let ok = 0
  for (const route of routes) {
    const page = await browser.newPage()
    try {
      await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'networkidle0', timeout: 30000 })
      await page.waitForSelector('title', { timeout: 5000 }).catch(() => {})
      const html = await page.content()
      const outDir = route === '/' ? DIST : join(DIST, route)
      await mkdir(outDir, { recursive: true })
      await writeFile(join(outDir, 'index.html'), html, 'utf-8')
      ok++
    } catch (e) {
      warn(`failed ${route}: ${e.message}`)
    } finally {
      await page.close()
    }
  }

  // sitemap.xml from the same route list.
  const urls = [...new Set([...STATIC_ROUTES, ...routes])]
    .map(r => `  <url><loc>${SITE}${r === '/' ? '' : r}</loc></url>`)
    .join('\n')
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
  await writeFile(join(DIST, 'sitemap.xml'), sitemap, 'utf-8')

  await browser.close()
  server.close()
  console.log(`[prerender] ${ok}/${routes.length} routes prerendered + sitemap.xml written`)
}

main().catch(e => { warn(e.message); process.exit(0) })
