import * as L from 'leaflet'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { Star, ChevronRight, Navigation } from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../lib/api'

function copyPhone(phone: string) {
  navigator.clipboard?.writeText(phone).then(
    () => toast.success('Скопійовано!'),
    () => toast.error('Не вдалось скопіювати'),
  )
}

// No reviews table yet — derive a stable mock rating (4.5–4.9) from the id.
function mockRating(id: string): number {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return 4.5 + (h % 5) / 10
}

const COVER_PLACEHOLDER =
  'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=600&q=60'

/* ─── Custom DivIcon markers (no PNG imports needed) ─────────────────────── */

function makeIcon(color: string, size: number) {
  return L.divIcon({
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${color};border:3px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.35);
      display:flex;align-items:center;justify-content:center;
      font-size:${Math.round(size * 0.55)}px;line-height:1;
    ">🌱</div>`,
    className: '',
    iconSize:     [size, size],
    iconAnchor:   [size / 2, size / 2],
    popupAnchor:  [0, -(size / 2 + 4)],
  })
}

const nurseryIcon = makeIcon('#4B9F2F', 28)
const nurseryIconActive = makeIcon('#2B6117', 36)
const userDotIcon = L.divIcon({
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#3B82F6;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
  className: '',
  iconSize:   [16, 16],
  iconAnchor: [8, 8],
})

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface Nursery {
  id: string
  name: string
  description: string | null
  address: string | null
  latitude: number
  longitude: number
  phone: string | null
  email: string | null
  website: string | null
  region_id: string | null
  photos: string[] | null
  videos: string[] | null
  tags: string[] | null
  admin_tags: string[] | null
}

interface Region {
  id: string
  region: string
  city: string
}

/* ─── Haversine distance (km) ────────────────────────────────────────────── */

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/* ─── AnimateControls — slides zoom +/- in from top ─────────────────────── */

function AnimateControls() {
  const map = useMap()
  useEffect(() => {
    const ctrl = map.getContainer().querySelector('.leaflet-top.leaflet-left') as HTMLElement | null
    if (!ctrl) return
    ctrl.style.opacity = '0'
    ctrl.style.transform = 'translateY(-28px)'
    requestAnimationFrame(() => requestAnimationFrame(() => {
      ctrl.style.transition = 'opacity 0.55s ease-out 300ms, transform 0.65s cubic-bezier(0.16,1,0.3,1) 300ms'
      ctrl.style.opacity = '1'
      ctrl.style.transform = 'none'
    }))
  }, [map])
  return null
}

/* ─── FlyController — must live inside MapContainer ─────────────────────── */

function FlyController({ target }: { target: [number, number] | null }) {
  const map = useMap()
  const prev = useRef<[number, number] | null>(null)
  useEffect(() => {
    if (target && target !== prev.current) {
      prev.current = target
      map.flyTo(target, 13, { animate: true, duration: 1.5 })
    }
  }, [target, map])
  return null
}

/* ─── Component ──────────────────────────────────────────────────────────── */

const UA_CENTER: [number, number] = [49.0, 32.0]

const MAP_KEYFRAMES = `
  @keyframes mapSlideLeft {
    from { opacity: 0; transform: translateX(-100%); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes mapSlideDown {
    from { opacity: 0; transform: translateY(-20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes mapFadeLeft {
    from { opacity: 0; transform: translateX(-20px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes mapFadeUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes mapSlideRight {
    from { transform: translateX(100%); }
    to   { transform: translateX(0); }
  }
`

export default function MapPage() {
  const [nurseries,    setNurseries]    = useState<Nursery[]>([])
  const [regions,      setRegions]      = useState<Region[]>([])
  const [loading,      setLoading]      = useState(true)
  const [regionFilter, setRegionFilter] = useState('')
  const [flyTarget,    setFlyTarget]    = useState<[number, number] | null>(null)
  const [userPos,      setUserPos]      = useState<[number, number] | null>(null)
  const [locating,     setLocating]     = useState(false)
  const [activeId,     setActiveId]     = useState<string | null>(null)
  const [tagFilters,   setTagFilters]   = useState<Set<string>>(new Set())
  const [panelWidth,   setPanelWidth]   = useState(384)

  function toggleTag(t: string) {
    setTagFilters(prev => {
      const next = new Set(prev)
      next.has(t) ? next.delete(t) : next.add(t)
      return next
    })
  }
  const resizing = useRef(false)

  // Drag the panel's left edge to resize it.
  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!resizing.current) return
      const w = window.innerWidth - e.clientX
      setPanelWidth(Math.min(Math.max(w, 340), Math.min(900, window.innerWidth * 0.75)))
    }
    const up = () => { resizing.current = false; document.body.style.userSelect = '' }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
  }, [])

  function startResize(e: React.MouseEvent) {
    e.preventDefault()
    resizing.current = true
    document.body.style.userSelect = 'none'
  }

  useEffect(() => {
    Promise.all([
      api.get<Nursery[]>('/api/nurseries'),
      api.get<Region[]>('/api/regions'),
    ]).then(([nr, rr]) => {
      setNurseries(nr.data)
      setRegions(rr.data)
    }).finally(() => setLoading(false))
  }, [])

  const allTags = [...new Set(nurseries.flatMap(n => n.tags ?? []))].sort()
  const filtered = nurseries.filter(n =>
    (!regionFilter || n.region_id === regionFilter) &&
    (tagFilters.size === 0 || (n.tags ?? []).some(t => tagFilters.has(t)))
  )
  const selected = activeId
    ? filtered.find(n => n.id === activeId) ?? nurseries.find(n => n.id === activeId) ?? null
    : null

  function findNearest() {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords
        setUserPos([latitude, longitude])
        setLocating(false)
        if (filtered.length === 0) return
        const nearest = [...filtered].sort((a, b) =>
          haversineKm(latitude, longitude, a.latitude, a.longitude) -
          haversineKm(latitude, longitude, b.latitude, b.longitude)
        )[0]
        setActiveId(nearest.id)
        setFlyTarget([nearest.latitude, nearest.longitude])
      },
      () => setLocating(false),
    )
  }

  if (loading) return (
    <div className="flex" style={{ height: 'calc(100vh - 4rem)' }}>
      <aside className="w-80 shrink-0 flex flex-col bg-white border-r border-gray-200 p-4 gap-3">
        <div className="animate-pulse bg-gray-200 rounded-lg h-8 w-3/4" />
        <div className="animate-pulse bg-gray-200 rounded-lg h-10 w-full" />
        {[0, 1, 2].map(i => (
          <div key={i} className="animate-pulse bg-gray-200 rounded-xl h-24 w-full" />
        ))}
      </aside>
      <div className="flex-1 animate-pulse bg-gray-100" />
    </div>
  )

  return (
    <div className="flex" style={{ height: 'calc(100vh - 4rem)' }}>
      <style>{MAP_KEYFRAMES}</style>

      {/* ── Sidebar ───────────────────────────────────────────────────── */}
      <aside
        className="w-80 shrink-0 flex flex-col bg-white border-r border-gray-200 overflow-hidden"
        style={{ animation: 'mapSlideLeft 0.65s cubic-bezier(0.16,1,0.3,1) both' }}
      >

        <div
          className="px-4 pt-4 pb-3 border-b border-gray-100 shrink-0"
          style={{ animation: 'mapSlideDown 0.55s cubic-bezier(0.16,1,0.3,1) 80ms both' }}
        >
          <h1 className="font-black text-sm uppercase tracking-wide text-gray-700">Мапи розсадників</h1>
          <p className="text-xs text-gray-400 mt-0.5">{filtered.length} знайдено</p>
        </div>

        <div
          className="px-4 py-3 border-b border-gray-100 space-y-2 shrink-0"
          style={{ animation: 'mapSlideDown 0.55s cubic-bezier(0.16,1,0.3,1) 160ms both' }}
        >
          <select
            value={regionFilter}
            onChange={e => setRegionFilter(e.target.value)}
            className="w-full text-sm px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-forest bg-white"
          >
            <option value="">Усі регіони</option>
            {regions.map(r => (
              <option key={r.id} value={r.id}>{r.region}</option>
            ))}
          </select>

          <button
            onClick={findNearest}
            disabled={locating}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border-2 border-forest/40 text-forest text-sm font-semibold hover:bg-forest/5 transition-colors disabled:opacity-50"
          >
            {locating
              ? <span className="w-4 h-4 border-2 border-forest border-t-transparent rounded-full animate-spin" />
              : <Navigation className="w-4 h-4" />
            }
            Знайти найближчий
          </button>

          {allTags.length > 0 && (
            <div className="space-y-2 pt-1">
              {/* Add-tag dropdown (shows only not-yet-selected tags) */}
              <select
                value=""
                onChange={e => { if (e.target.value) toggleTag(e.target.value) }}
                className="w-full text-sm px-3 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-forest"
              >
                <option value="">+ Додати тег для фільтру…</option>
                {allTags.filter(t => !tagFilters.has(t)).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              {/* Selected tags: delete one by one, or all at once */}
              {tagFilters.size > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {[...tagFilters].map(t => (
                    <span key={t} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-forest text-white">
                      {t}
                      <button onClick={() => toggleTag(t)} className="hover:text-white/70 leading-none">×</button>
                    </span>
                  ))}
                  <button onClick={() => setTagFilters(new Set())}
                    className="text-xs text-gray-400 hover:text-gray-600 underline ml-1">
                    скинути всі
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-400 text-sm">
              <div className="text-3xl mb-2">🌱</div>
              <p>Розсадників не знайдено</p>
              <p className="text-xs mt-1 text-gray-300">Запустіть python scripts/seed_nurseries.py або додайте свій</p>
            </div>
          ) : filtered.map((n, i) => {
            const active = activeId === n.id
            const rating = mockRating(n.id)
            const cats = (n.tags ?? []).join(', ')
            const select = () => { setActiveId(n.id); setFlyTarget([n.latitude, n.longitude]) }
            return (
              <div key={n.id}
                onClick={select}
                className={`rounded-sm border bg-white overflow-hidden cursor-pointer transition-shadow hover:shadow-md ${
                  active ? 'border-forest ring-1 ring-forest' : 'border-gray-200'
                }`}
                style={{ animation: `mapFadeLeft 0.5s cubic-bezier(0.16,1,0.3,1) ${200 + i * 70}ms both` }}
              >
                {/* Cover */}
                <div className="h-36 bg-gray-100">
                  <img src={n.photos?.[0] ?? COVER_PLACEHOLDER} alt={n.name} loading="lazy"
                    className="w-full h-full object-cover" />
                </div>

                <div className="p-3">
                  <p className="text-[11px] uppercase tracking-wide text-gray-400">Розсадник</p>
                  <h3 className="font-bold text-gray-800 text-sm leading-tight">{n.name}</h3>

                  {/* Rating */}
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs font-bold text-gray-700">{rating.toFixed(1)}</span>
                    <div className="flex">
                      {[0, 1, 2, 3, 4].map(s => (
                        <Star key={s} className={`w-3 h-3 ${s < Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}`} />
                      ))}
                    </div>
                  </div>

                  {/* Categories */}
                  {cats && <p className="text-xs text-gray-600 mt-1.5 line-clamp-2">{cats}</p>}

                  {/* Green divider */}
                  <div className="h-[3px] rounded-full bg-forest/40 my-2.5" />

                  {/* Phone (above) + address, with the details button */}
                  <div className="flex items-end justify-between gap-2">
                    <div className="min-w-0">
                      {n.phone && (
                        <button onClick={e => { e.stopPropagation(); copyPhone(n.phone!) }}
                          className="text-base font-black text-gray-800 leading-tight truncate text-left hover:text-forest transition-colors"
                          title="Натисніть, щоб скопіювати">
                          {n.phone}
                        </button>
                      )}
                      {n.address && <p className="text-xs text-gray-500 mt-0.5 truncate">{n.address}</p>}
                    </div>
                    <button onClick={e => { e.stopPropagation(); select() }}
                      className="shrink-0 group flex items-center gap-1 bg-[#7E8C6E] text-white font-semibold text-xs px-3 py-1.5 rounded-sm hover:bg-[#6f7d60] transition-colors">
                      докладніше
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div
          className="px-4 py-3 border-t border-gray-100 shrink-0"
          style={{ animation: 'mapFadeUp 0.5s cubic-bezier(0.16,1,0.3,1) 320ms both' }}
        >
          <Link
            to="/nurseries/register"
            className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-forest text-white text-sm font-bold uppercase tracking-wide hover:bg-forest-dark transition-colors"
          >
            + Додати розсадник
          </Link>
        </div>
      </aside>

      {/* ── Map ───────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
        <MapContainer
          center={UA_CENTER}
          zoom={6}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FlyController target={flyTarget} />
          <AnimateControls />

          {userPos && (
            <Marker position={userPos} icon={userDotIcon}>
              <Popup><strong>Ваше місцезнаходження</strong></Popup>
            </Marker>
          )}

          {filtered.map(n => (
            <Marker
              key={n.id}
              position={[n.latitude, n.longitude]}
              icon={activeId === n.id ? nurseryIconActive : nurseryIcon}
              eventHandlers={{ click: () => setActiveId(n.id) }}
            >
              <Popup minWidth={220} maxWidth={280}>
                <div className="text-sm space-y-1">
                  <p className="font-bold text-gray-800">{n.name}</p>
                  {n.description && <p className="text-gray-500 text-xs">{n.description}</p>}
                  {n.address && <p className="text-xs text-gray-500">📍 {n.address}</p>}
                  {n.phone && (
                    <p className="text-xs">
                      📞 <a href={`tel:${n.phone}`} className="text-forest hover:underline">{n.phone}</a>
                    </p>
                  )}
                  {n.email && (
                    <p className="text-xs">
                      ✉️ <a href={`mailto:${n.email}`} className="text-forest hover:underline">{n.email}</a>
                    </p>
                  )}
                  {n.website && (
                    <p className="text-xs">
                      🌐 <a href={n.website} target="_blank" rel="noopener noreferrer" className="text-forest hover:underline">
                        {n.website.replace(/^https?:\/\//, '')}
                      </a>
                    </p>
                  )}
                  <a
                    href={`https://maps.google.com/?q=${n.latitude},${n.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block pt-1"
                  >
                    <span className="px-3 py-1.5 bg-forest text-white text-xs font-semibold rounded-lg hover:bg-forest-dark inline-block">
                      🗺️ Прокласти маршрут
                    </span>
                  </a>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* ── Drag handle to resize the detail panel ────────────────────── */}
      {selected && (
        <div
          onMouseDown={startResize}
          title="Перетягніть, щоб змінити ширину"
          className="w-1.5 shrink-0 cursor-col-resize bg-gray-200 hover:bg-forest/40 active:bg-forest/60 transition-colors"
        />
      )}

      {/* ── Right detail panel — slides in on marker/list click ───────── */}
      {selected && (
        <aside
          key={selected.id}
          className="shrink-0 bg-white border-l border-gray-200 overflow-y-auto"
          style={{ width: panelWidth, animation: 'mapSlideRight 0.4s cubic-bezier(0.16,1,0.3,1) both' }}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-5 pt-4 pb-3 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="font-black text-lg text-forest leading-tight">{selected.name}</h2>
              {selected.address && <p className="text-xs text-gray-400 mt-0.5">📍 {selected.address}</p>}
            </div>
            <button
              onClick={() => setActiveId(null)}
              className="shrink-0 w-7 h-7 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 text-lg leading-none flex items-center justify-center"
              title="Закрити"
            >
              ×
            </button>
          </div>

          <div className="p-5 space-y-5">
            {/* Photos */}
            {(selected.photos?.length ?? 0) > 0 && (
              <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
                {selected.photos!.map((src, i) => (
                  <img key={i} src={src} alt={`${selected.name} ${i + 1}`}
                    className="h-40 w-auto rounded-xl object-cover shrink-0 border border-gray-100" loading="lazy" />
                ))}
              </div>
            )}

            {/* Videos */}
            {(selected.videos?.length ?? 0) > 0 && (
              <div className="space-y-2">
                {selected.videos!.map((url, i) => (
                  /youtu\.?be/.test(url) ? (
                    <iframe key={i} src={url.replace('watch?v=', 'embed/')}
                      className="w-full aspect-video rounded-xl border border-gray-100"
                      allowFullScreen title={`video-${i}`} />
                  ) : (
                    <video key={i} src={url} controls
                      className="w-full rounded-xl border border-gray-100 bg-black" />
                  )
                ))}
              </div>
            )}

            {/* Tags + admin badges */}
            {((selected.tags?.length ?? 0) > 0 || (selected.admin_tags?.length ?? 0) > 0) && (
              <div className="flex flex-wrap gap-1.5">
                {selected.admin_tags?.map(t => (
                  <span key={`a-${t}`} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-forest/10 text-forest border border-forest/20">
                    ✓ {t}
                  </span>
                ))}
                {selected.tags?.map(t => (
                  <button key={`t-${t}`}
                    onClick={() => toggleTag(t)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      tagFilters.has(t) ? 'bg-forest text-white border-forest' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-forest/40'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}

            {/* Description */}
            {selected.description && (
              <p className="text-sm text-gray-600 leading-relaxed">{selected.description}</p>
            )}

            {/* Contacts */}
            <div className="space-y-2 text-sm border-t border-gray-100 pt-4">
              {selected.phone && (
                <a href={`tel:${selected.phone}`} className="flex items-center gap-2 text-gray-600 hover:text-forest">
                  <span>📞</span> {selected.phone}
                </a>
              )}
              {selected.email && (
                <a href={`mailto:${selected.email}`} className="flex items-center gap-2 text-gray-600 hover:text-forest">
                  <span>✉️</span> {selected.email}
                </a>
              )}
              {selected.website && (
                <a href={selected.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-600 hover:text-forest">
                  <span>🌐</span> {selected.website.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>

            {/* Route */}
            <a
              href={`https://maps.google.com/?q=${selected.latitude},${selected.longitude}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-forest text-white text-sm font-bold uppercase tracking-wide hover:bg-forest-dark transition-colors"
            >
              🗺️ Прокласти маршрут
            </a>
          </div>
        </aside>
      )}
    </div>
  )
}
