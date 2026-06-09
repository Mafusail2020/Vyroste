import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../lib/api'

interface Profile {
  id: string
  region_id: string | null
  plot_type: string | null
  selected_crops: string[] | null
  is_premium: boolean
}

interface GddCrop {
  crop_id: string
  crop_name: string
  gdd_accumulated: number
  gdd_to_harvest: number
  pct: number
}

interface GddData {
  region_id: string | null
  season_start: string | null
  crops: GddCrop[]
}

const PLOT_LABELS: Record<string, string> = {
  balcony: 'Балкон 🪴',
  dacha:   'Дача 🏡',
  garden:  'Город 🌿',
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [gdd,     setGdd]     = useState<GddData | null>(null)

  useEffect(() => {
    api.get<Profile>('/api/users/me').then((r) => setProfile(r.data)).catch(() => {})
    api.get<GddData>('/api/gdd/me').then((r) => setGdd(r.data)).catch(() => {})
  }, [])

  const needsOnboarding = profile && (!profile.region_id || !profile.plot_type)
  const cropCount       = profile?.selected_crops?.length ?? 0
  const gddCrops        = (gdd?.crops ?? []).filter(c => c.gdd_to_harvest > 0)
  const gddHasData      = gddCrops.some(c => c.gdd_accumulated > 0)

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-black text-forest uppercase mb-2">
        Вітаємо, {user?.email?.split('@')[0]}!
      </h1>
      <p className="text-gray-500 mb-10">Ваш особистий садовий центр</p>

      {needsOnboarding && (
        <div className="mb-8 p-5 rounded-2xl bg-card-green border border-green-200 flex items-center justify-between">
          <div>
            <div className="font-bold text-forest">Завершіть налаштування</div>
            <div className="text-sm text-gray-600">Оберіть регіон і культури, щоб отримати персональний календар</div>
          </div>
          <Link
            to="/onboarding"
            className="ml-4 shrink-0 px-5 py-2.5 rounded-xl bg-forest text-white font-bold text-sm uppercase hover:bg-forest-dark transition-colors"
          >
            Налаштувати
          </Link>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Тип ділянки</div>
          <div className="text-xl font-black text-gray-800">
            {profile?.plot_type ? PLOT_LABELS[profile.plot_type] : '—'}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Культур обрано</div>
          <div className="text-xl font-black text-gray-800">{cropCount}</div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Акаунт</div>
          <div className="text-xl font-black text-gray-800">
            {profile?.is_premium ? '⭐ Преміум' : 'Безкоштовний'}
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        <Link
          to="/calendar"
          className="group bg-card-green rounded-2xl p-6 hover:shadow-md transition-shadow"
        >
          <div className="text-2xl mb-2">📅</div>
          <div className="font-black text-forest uppercase text-sm mb-1">Календар посіву</div>
          <div className="text-xs text-gray-500">Персональні терміни для ваших культур</div>
        </Link>
        <Link
          to="/map"
          className="group bg-card-blue rounded-2xl p-6 hover:shadow-md transition-shadow"
        >
          <div className="text-2xl mb-2">🗺️</div>
          <div className="font-black text-navy uppercase text-sm mb-1">Мапа розсадників</div>
          <div className="text-xs text-gray-500">Знайдіть розсадники поблизу</div>
        </Link>
      </div>

      {/* GDD real progress — only when there's actual accumulated data */}
      {gddHasData && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="font-black text-sm uppercase tracking-wide text-gray-700">🌡️ Реальний прогрес GDD</h2>
            {gdd?.season_start && (
              <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full">
                з {new Date(gdd.season_start).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })}
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {gddCrops.map(c => (
              <div key={c.crop_id} className="bg-white rounded-xl p-4 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-800 truncate">{c.crop_name}</span>
                  <span className={`text-xs font-bold ml-2 shrink-0 ${c.pct >= 1 ? 'text-orange-500' : 'text-forest'}`}>
                    {Math.round(c.pct * 100)}%
                  </span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${c.pct >= 1 ? 'bg-orange-400' : 'bg-forest'}`}
                    style={{ width: `${Math.min(c.pct * 100, 100)}%` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-xs text-gray-400">
                  <span>{c.gdd_accumulated} GDD</span>
                  <span>ціль {c.gdd_to_harvest} GDD</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-300 mt-3">
            Дані оновлюються щодня о 08:00 UTC з Open-Meteo
          </p>
        </div>
      )}
    </div>
  )
}
