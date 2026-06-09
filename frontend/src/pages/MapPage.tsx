import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import api from '../lib/api'

// Fix default Leaflet marker icons for Vite bundler
import markerIconPng    from 'leaflet/dist/images/marker-icon.png'
import markerIcon2xPng  from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadowPng  from 'leaflet/dist/images/marker-shadow.png'

L.Icon.Default.mergeOptions({
  iconUrl:       markerIconPng,
  iconRetinaUrl: markerIcon2xPng,
  shadowUrl:     markerShadowPng,
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

/* ─── FlyController — inside MapContainer so it can use useMap() ─────────── */

function FlyController({ target }: { target: [number, number] | null }) {
  const map = useMap()
  const prevTarget = useRef<[number, number] | null>(null)
  useEffect(() => {
    if (target && target !== prevTarget.current) {
      prevTarget.current = target
      map.flyTo(target, 13, { duration: 1.5 })
    }
  }, [target, map])
  return null
}

/* ─── Component ──────────────────────────────────────────────────────────── */

const UA_CENTER: [number, number] = [49.0, 32.0]

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

  function findNearest() {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords
        setUserPos([latitude, longitude])
        setLocating(false)

        if (filtered.length === 0) return
        const nearest = filtered.reduce((best, n) => {
          const d = haversineKm(latitude, longitude, n.latitude, n.longitude)
          const bd = haversineKm(latitude, longitude, best.latitude, best.longitude)
          return d < bd ? n : best
        })
        setActiveId(nearest.id)
        setFlyTarget([nearest.latitude, nearest.longitude])
      },
      () => setLocating(false),
    )
  }

  const filtered = nurseries.filter(n => !regionFilter || n.region_id === regionFilter)

  /* ── Markers factory ─────────────────────────────────────────────────── */
  const activeIcon = new L.Icon({
    iconUrl: markerIconPng,
    iconRetinaUrl: markerIcon2xPng,
    shadowUrl: markerShadowPng,
    iconSize: [30, 49],
    iconAnchor: [15, 49],
    shadowSize: [41, 41],
  })

  if (loading) return (
    <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
      <div className="w-8 h-8 border-4 border-forest border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">

      {/* ── Sidebar ───────────────────────────────────────────────────── */}
      <aside className="w-72 shrink-0 flex flex-col bg-white border-r border-gray-200 overflow-hidden">

        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-100 shrink-0">
          <h1 className="font-black text-sm uppercase tracking-wide text-gray-700">Мапа розсадників</h1>
          <p className="text-xs text-gray-400 mt-0.5">{filtered.length} знайдено</p>
        </div>

        {/* Filters */}
        <div className="px-4 py-3 border-b border-gray-100 space-y-2 shrink-0">
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
            {locating ? (
              <span className="w-4 h-4 border-2 border-forest border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>📍</span>
            )}
            Знайти найближчий
          </button>
        </div>

        {/* Nursery list */}
        <div className="flex-1 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-400 text-sm">
              <div className="text-3xl mb-2">🌱</div>
              <p>Розсадників не знайдено</p>
              <p className="text-xs mt-1">Запустіть seed_nurseries.py або зареєструйте свій</p>
            </div>
          ) : filtered.map(n => (
            <button key={n.id}
              onClick={() => { setActiveId(n.id); setFlyTarget([n.latitude, n.longitude]) }}
              className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${activeId === n.id ? 'bg-forest/5 border-l-2 border-l-forest' : ''}`}
            >
              <p className={`text-sm font-semibold truncate ${activeId === n.id ? 'text-forest' : 'text-gray-800'}`}>
                {n.name}
              </p>
              {n.address && <p className="text-xs text-gray-400 mt-0.5 truncate">📍 {n.address}</p>}
              {n.phone && <p className="text-xs text-gray-400 truncate">📞 {n.phone}</p>}
            </button>
          ))}
        </div>

        {/* Footer CTA */}
        <div className="px-4 py-3 border-t border-gray-100 shrink-0">
          <Link
            to="/nurseries/register"
            className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-forest text-white text-sm font-bold uppercase tracking-wide hover:bg-forest-dark transition-colors"
          >
            + Додати розсадник
          </Link>
        </div>
      </aside>

      {/* ── Map ───────────────────────────────────────────────────────── */}
      <div className="flex-1 relative">
        <MapContainer
          center={UA_CENTER}
          zoom={6}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FlyController target={flyTarget} />

          {/* User location marker */}
          {userPos && (
            <Marker position={userPos} icon={new L.Icon({
              iconUrl: 'data:image/svg+xml;base64,' + btoa(`
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                  <circle cx="12" cy="12" r="8" fill="#3B82F6" stroke="white" stroke-width="2"/>
                  <circle cx="12" cy="12" r="3" fill="white"/>
                </svg>
              `),
              iconSize: [24, 24],
              iconAnchor: [12, 12],
            })}>
              <Popup><strong>Ваше місцезнаходження</strong></Popup>
            </Marker>
          )}

          {/* Nursery markers */}
          {filtered.map(n => (
            <Marker
              key={n.id}
              position={[n.latitude, n.longitude]}
              icon={activeId === n.id ? activeIcon : undefined}
              eventHandlers={{ click: () => setActiveId(n.id) }}
            >
              <Popup minWidth={220}>
                <div className="text-sm">
                  <p className="font-bold text-gray-800 mb-1">{n.name}</p>
                  {n.description && <p className="text-gray-500 text-xs mb-2">{n.description}</p>}
                  {n.address && <p className="text-xs text-gray-500">📍 {n.address}</p>}
                  {n.phone && (
                    <p className="text-xs mt-1">
                      📞 <a href={`tel:${n.phone}`} className="text-forest hover:underline">{n.phone}</a>
                    </p>
                  )}
                  {n.email && (
                    <p className="text-xs mt-0.5">
                      ✉️ <a href={`mailto:${n.email}`} className="text-forest hover:underline">{n.email}</a>
                    </p>
                  )}
                  {n.website && (
                    <p className="text-xs mt-0.5">
                      🌐 <a href={n.website} target="_blank" rel="noopener noreferrer" className="text-forest hover:underline">
                        {n.website.replace(/^https?:\/\//, '')}
                      </a>
                    </p>
                  )}
                  <a
                    href={`https://maps.google.com/?q=${n.latitude},${n.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-3 px-3 py-1.5 bg-forest text-white text-xs font-semibold rounded-lg hover:bg-forest-dark"
                  >
                    🗺️ Прокласти маршрут
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
