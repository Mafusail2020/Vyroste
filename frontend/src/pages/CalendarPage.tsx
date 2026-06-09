import { useEffect, useState } from 'react'
import api from '../lib/api'

interface CropWindow {
  crop_id: string
  crop_name: string
  crop_type: string
  lunar_preference: string | null
  direct_sow: boolean
  seedling_start: string | null
  ground_planting: string
  harvest_start: string
  harvest_end: string
}

const MONTHS_UK = ['Січ', 'Лют', 'Бер', 'Кві', 'Тра', 'Чер', 'Лип', 'Сер', 'Вер', 'Жов', 'Лис', 'Гру']

const CROP_TYPE_ICONS: Record<string, string> = {
  vegetable: '🥦', herb: '🌿', flower: '🌸', berry: '🍓', tree: '🌳',
}

const LUNAR_ICONS: Record<string, string> = {
  above_ground: '🌒', below_ground: '🌘', any: '○',
}

function yearFraction(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00')
  const year = d.getFullYear()
  const start = new Date(year, 0, 1).getTime()
  const end = new Date(year + 1, 0, 1).getTime()
  return (d.getTime() - start) / (end - start)
}

function monthFraction(monthIndex: number, year: number): number {
  const start = new Date(year, 0, 1).getTime()
  const end = new Date(year + 1, 0, 1).getTime()
  const m = new Date(year, monthIndex, 1).getTime()
  return (m - start) / (end - start)
}

const TODAY = new Date()
const YEAR = TODAY.getFullYear()
const TODAY_FRACTION = yearFraction(TODAY.toISOString().slice(0, 10))

export default function CalendarPage() {
  const [windows, setWindows] = useState<CropWindow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    api.get<CropWindow[]>('/api/calendar')
      .then((r) => setWindows(r.data))
      .catch((e) => setError(e?.response?.data?.detail ?? 'Помилка завантаження'))
      .finally(() => setLoading(false))
  }, [])

  const cropTypes = [...new Set(windows.map((w) => w.crop_type))]
  const filtered = filter === 'all' ? windows : windows.filter((w) => w.crop_type === filter)

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-8 h-8 border-4 border-forest border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (error) return (
    <div className="max-w-2xl mx-auto px-6 py-16 text-center">
      <p className="text-red-600 mb-4">{error}</p>
      <a href="/onboarding" className="text-forest underline text-sm">Налаштувати профіль</a>
    </div>
  )

  if (windows.length === 0) return (
    <div className="max-w-2xl mx-auto px-6 py-16 text-center">
      <p className="text-gray-500 mb-4">Оберіть культури в налаштуваннях</p>
      <a href="/onboarding" className="text-forest underline text-sm">Перейти до налаштувань</a>
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-forest uppercase">Календар посіву {YEAR}</h1>
          <p className="text-gray-500 text-sm mt-1">Персональний графік для ваших культур</p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-3 rounded-sm bg-amber-300 inline-block" />
            Розсада (вдома)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-3 rounded-sm bg-forest inline-block" />
            У ґрунті
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-3 rounded-sm bg-yellow-500 inline-block" />
            Збір врожаю
          </span>
        </div>
      </div>

      {/* Crop type filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${filter === 'all' ? 'bg-forest text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'}`}
        >
          Усі ({windows.length})
        </button>
        {cropTypes.map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${filter === type ? 'bg-forest text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'}`}
          >
            {CROP_TYPE_ICONS[type]} {windows.filter((w) => w.crop_type === type).length}
          </button>
        ))}
      </div>

      {/* Gantt chart */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {/* Month header */}
        <div className="flex border-b border-gray-100">
          <div className="w-44 shrink-0 border-r border-gray-100 px-3 py-2 text-xs text-gray-400 font-medium">
            Культура
          </div>
          <div className="flex-1 relative h-8">
            {MONTHS_UK.map((label, i) => {
              const leftPct = monthFraction(i, YEAR) * 100
              return (
                <div
                  key={i}
                  className="absolute top-0 h-full flex items-center"
                  style={{ left: `${leftPct}%`, width: `${(1 / 12) * 100}%` }}
                >
                  <span className="text-xs text-gray-400 font-medium px-1">{label}</span>
                  <div className="absolute left-0 top-0 h-full w-px bg-gray-100" />
                </div>
              )
            })}
            {/* Today marker (header) */}
            <div
              className="absolute top-0 h-full w-0.5 bg-red-400 opacity-60 z-10"
              style={{ left: `${TODAY_FRACTION * 100}%` }}
            />
          </div>
        </div>

        {/* Crop rows */}
        {filtered.map((w, rowIdx) => {
          const gpFrac = yearFraction(w.ground_planting)
          const hsFrac = yearFraction(w.harvest_start)
          const heFrac = yearFraction(w.harvest_end)
          const seedFrac = w.seedling_start ? yearFraction(w.seedling_start) : null

          return (
            <div
              key={w.crop_id}
              className={`flex border-b border-gray-50 ${rowIdx % 2 === 0 ? '' : 'bg-gray-50/40'} hover:bg-cream/60 transition-colors group`}
            >
              {/* Crop label */}
              <div className="w-44 shrink-0 border-r border-gray-100 px-3 py-2.5 flex items-center gap-2">
                <span className="text-base">{CROP_TYPE_ICONS[w.crop_type]}</span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-800 truncate">{w.crop_name}</div>
                  {w.lunar_preference && w.lunar_preference !== 'any' && (
                    <div className="text-xs text-gray-400">{LUNAR_ICONS[w.lunar_preference]}</div>
                  )}
                </div>
              </div>

              {/* Gantt lane */}
              <div className="flex-1 relative h-10 my-1">
                {/* Month dividers */}
                {MONTHS_UK.map((_, i) => (
                  <div
                    key={i}
                    className="absolute top-0 h-full w-px bg-gray-100"
                    style={{ left: `${monthFraction(i, YEAR) * 100}%` }}
                  />
                ))}

                {/* Seedling band (amber) */}
                {seedFrac !== null && (
                  <div
                    className="absolute top-1.5 h-7 rounded bg-amber-300/80 flex items-center px-1.5 overflow-hidden"
                    style={{
                      left: `${Math.max(0, seedFrac) * 100}%`,
                      width: `${Math.max(0.01, gpFrac - Math.max(0, seedFrac)) * 100}%`,
                    }}
                    title={`Розсада: ${w.seedling_start} → ${w.ground_planting}`}
                  >
                    <span className="text-xs text-amber-900 font-medium whitespace-nowrap">🌱</span>
                  </div>
                )}

                {/* Growing band (forest green) */}
                <div
                  className="absolute top-1.5 h-7 rounded bg-forest/80 flex items-center px-1.5 overflow-hidden"
                  style={{
                    left: `${gpFrac * 100}%`,
                    width: `${Math.max(0.01, hsFrac - gpFrac) * 100}%`,
                  }}
                  title={`У ґрунті: ${w.ground_planting} → ${w.harvest_start}`}
                >
                  <span className="text-xs text-white font-medium whitespace-nowrap">
                    {w.direct_sow ? '🌱' : '🌿'}
                  </span>
                </div>

                {/* Harvest band (yellow) */}
                <div
                  className="absolute top-1.5 h-7 rounded bg-yellow-400/90 flex items-center px-1.5 overflow-hidden"
                  style={{
                    left: `${hsFrac * 100}%`,
                    width: `${Math.max(0.01, heFrac - hsFrac) * 100}%`,
                  }}
                  title={`Збір: ${w.harvest_start} → ${w.harvest_end}`}
                >
                  <span className="text-xs text-yellow-900 font-medium whitespace-nowrap">🌾</span>
                </div>

                {/* Today line */}
                <div
                  className="absolute top-0 h-full w-0.5 bg-red-400 opacity-50 z-10"
                  style={{ left: `${TODAY_FRACTION * 100}%` }}
                />
              </div>
            </div>
          )
        })}

        {/* Today label at bottom */}
        <div className="relative h-6 border-t border-gray-100">
          <div
            className="absolute bottom-0 flex flex-col items-center"
            style={{ left: `calc(${TODAY_FRACTION * 100}% + 11rem)`, transform: 'translateX(-50%)' }}
          >
            <div className="w-0.5 h-3 bg-red-400 opacity-60" />
            <span className="text-xs text-red-400 font-medium whitespace-nowrap">Сьогодні</span>
          </div>
        </div>
      </div>

      {/* Tooltip key */}
      <p className="text-xs text-gray-400 mt-3">Наведіть на смугу для перегляду точних дат</p>
    </div>
  )
}
