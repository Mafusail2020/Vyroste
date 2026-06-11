import * as L from 'leaflet'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import api from '../lib/api'

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

  useEffect(() => {
    Promise.all([
      api.get<Nursery[]>('/api/nurseries'),
      api.get<Region[]>('/api/regions'),
    ]).then(([nr, rr]) => {
      setNurseries(nr.data)
      setRegions(rr.data)
    }).finally(() => setLoading(false))
  }, [])

  const filtered = nurseries.filter(n => !regionFilter || n.region_id === regionFilter)

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
      <aside className="w-72 shrink-0 flex flex-col bg-white border-r border-gray-200 p-4 gap-3">
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
        className="w-72 shrink-0 flex flex-col bg-white border-r border-gray-200 overflow-hidden"
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
              : <span>📍</span>
            }
            Знайти найближчий
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-400 text-sm">
              <div className="text-3xl mb-2">🌱</div>
              <p>Розсадників не знайдено</p>
              <p className="text-xs mt-1 text-gray-300">Запустіть python scripts/seed_nurseries.py або додайте свій</p>
            </div>
          ) : filtered.map((n, i) => (
            <button key={n.id}
              onClick={() => { setActiveId(n.id); setFlyTarget([n.latitude, n.longitude]) }}
              className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${activeId === n.id ? 'bg-forest/5 border-l-2 border-l-forest' : ''}`}
              style={{ animation: `mapFadeLeft 0.5s cubic-bezier(0.16,1,0.3,1) ${240 + i * 60}ms both` }}
            >
              <p className={`text-sm font-semibold truncate ${activeId === n.id ? 'text-forest' : 'text-gray-800'}`}>
                {n.name}
              </p>
              {n.address && <p className="text-xs text-gray-400 mt-0.5 truncate">📍 {n.address}</p>}
              {n.phone && <p className="text-xs text-gray-400 truncate">📞 {n.phone}</p>}
            </button>
          ))}
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
    </div>
  )
}
