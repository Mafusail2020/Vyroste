import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface Crop {
  id: string
  name_uk: string
  name_lat: string | null
  type: string
  seedling_start_week: number | null
  ground_planting_week: number
  days_to_harvest: number
  lunar_preference: string | null
}

interface Profile {
  selected_crops: string[] | null
}

/* ─── Constants ──────────────────────────────────────────────────────────── */

const CROP_TYPE_COLORS: Record<string, string> = {
  vegetable: '#2B6117', herb: '#0D9488', flower: '#EC4899', berry: '#DC2626', tree: '#78350F',
}

const CROP_TYPE_LABELS: Record<string, string> = {
  vegetable: 'Овочі', herb: 'Зелень', flower: 'Квіти', berry: 'Ягоди', tree: 'Дерева',
}

const TASK_COLORS: Record<string, string> = {
  seeding:       '#FDE68A',
  bed_prep:      '#D6D3D1',
  transplanting: '#2B6117',
  direct_sow:    '#22C55E',
  cultivating:   '#86EFAC',
  harvesting:    '#FB923C',
}

/* ─── Schedule builder ───────────────────────────────────────────────────── */

interface TaskDef {
  type: string
  icon: string
  name: string
  duration: string
  timing: string
  isAnchor?: boolean
}

function buildSchedule(crop: Crop): TaskDef[] {
  const tasks: TaskDef[] = []
  const hasIndoor = crop.seedling_start_week !== null
  const gpWeeks = crop.ground_planting_week

  if (hasIndoor) {
    tasks.push({
      type: 'seeding',
      icon: '🌱',
      name: 'Посів (розсада)',
      duration: '7 днів',
      timing: `За ${crop.seedling_start_week} тижнів до останніх морозів`,
      isAnchor: true,
    })
  }

  tasks.push({
    type: 'bed_prep',
    icon: '⛏️',
    name: 'Підготовка ґрунту',
    duration: '7 днів',
    timing: `За 7 днів до ${hasIndoor ? 'Висадки' : 'Прямого посіву'}`,
  })

  if (hasIndoor) {
    tasks.push({
      type: 'transplanting',
      icon: '🌿',
      name: 'Висадка',
      duration: '7 днів',
      timing: `Через ${(crop.seedling_start_week ?? 0) * 7} днів після Посіву`,
    })
  } else {
    const rel = gpWeeks >= 0
      ? `Через ${gpWeeks} тижнів після останніх морозів`
      : `За ${Math.abs(gpWeeks)} тижнів до останніх морозів`
    tasks.push({
      type: 'direct_sow',
      icon: '🌱',
      name: 'Прямий посів',
      duration: '7 днів',
      timing: rel,
      isAnchor: true,
    })
  }

  tasks.push({
    type: 'cultivating',
    icon: '🔧',
    name: 'Догляд',
    duration: '7 днів',
    timing: `Через 14 днів після ${hasIndoor ? 'Висадки' : 'Посіву'} • Повторюється кожні 21 день до Збору врожаю`,
  })

  tasks.push({
    type: 'harvesting',
    icon: '🌾',
    name: 'Збір врожаю',
    duration: '30 днів',
    timing: `Через ${crop.days_to_harvest} днів після ${hasIndoor ? 'Висадки' : 'Прямого посіву'}`,
  })

  return tasks
}

/* ─── Component ──────────────────────────────────────────────────────────── */

export default function AddCropPage() {
  const navigate = useNavigate()

  const [crops,       setCrops]       = useState<Crop[]>([])
  const [profile,     setProfile]     = useState<Profile | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [dropOpen,    setDropOpen]    = useState(false)
  const [selected,    setSelected]    = useState<Crop | null>(null)
  const [label,       setLabel]       = useState('')
  const [color,       setColor]       = useState('#2B6117')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')
  const [success,     setSuccess]     = useState(false)

  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([
      api.get<Crop[]>('/api/crops'),
      api.get<Profile>('/api/users/me').catch(() => ({ data: null })),
    ]).then(([cr, pr]) => {
      setCrops(cr.data)
      setProfile(pr.data)
    }).finally(() => setLoading(false))
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Auto-set color from crop type
  useEffect(() => {
    if (selected) setColor(CROP_TYPE_COLORS[selected.type] ?? '#2B6117')
  }, [selected])

  const alreadyAdded = new Set(profile?.selected_crops ?? [])

  const filtered = crops.filter(c =>
    c.name_uk.toLowerCase().includes(search.toLowerCase()) ||
    (c.name_lat ?? '').toLowerCase().includes(search.toLowerCase())
  )

  function pickCrop(crop: Crop) {
    setSelected(crop)
    setSearch(crop.name_uk)
    setDropOpen(false)
    setError('')
  }

  async function handleSave() {
    if (!selected) { setError('Оберіть культуру'); return }
    setSaving(true)
    setError('')
    try {
      await api.post(`/api/users/me/crops/${selected.id}`)
      setSuccess(true)
    } catch {
      setError('Помилка збереження. Спробуйте ще раз.')
    } finally {
      setSaving(false)
    }
  }

  const schedule = selected ? buildSchedule(selected) : []

  /* ── Success screen ───────────────────────────────────────────────────── */
  if (success && selected) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <div className="text-5xl mb-4">🌱</div>
        <h2 className="text-2xl font-black text-forest uppercase mb-2">Додано!</h2>
        <p className="text-gray-500 mb-8">
          <strong>{label || selected.name_uk}</strong> додано до вашого календаря
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => { setSelected(null); setSearch(''); setLabel(''); setSuccess(false) }}
            className="px-5 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:border-gray-300"
          >
            Додати ще
          </button>
          <button
            onClick={() => navigate('/calendar')}
            className="px-5 py-2.5 rounded-xl bg-forest text-white font-bold text-sm uppercase hover:bg-forest-dark"
          >
            До календаря
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 pb-16">

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600 transition-colors">
          ← Назад
        </button>
        <h1 className="text-2xl font-black text-forest uppercase">Додати культуру</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-forest border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-0">

          {/* ── Crop category ──────────────────────────────────────────── */}
          <div className="flex items-start gap-4 py-4 border-b border-gray-100">
            <label className="w-44 text-sm font-semibold text-gray-700 shrink-0 pt-2.5">
              Категорія культури
            </label>
            <div className="flex-1 relative" ref={dropRef}>
              <div
                onClick={() => setDropOpen(v => !v)}
                className={`flex items-center justify-between px-4 py-2.5 border-2 rounded-xl cursor-pointer transition-colors ${
                  dropOpen ? 'border-forest bg-white' : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                {selected ? (
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-sm font-medium text-gray-800">{selected.name_uk}</span>
                    <span className="text-xs text-gray-400">{CROP_TYPE_LABELS[selected.type]}</span>
                  </div>
                ) : (
                  <span className="text-sm text-gray-400">Оберіть культуру...</span>
                )}
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${dropOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {dropOpen && (
                <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  <div className="p-2 border-b border-gray-100">
                    <input
                      type="text"
                      autoFocus
                      placeholder="Пошук..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-forest"
                    />
                  </div>
                  <div className="max-h-56 overflow-y-auto">
                    {filtered.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-400">Нічого не знайдено</div>
                    ) : filtered.map(crop => {
                      const added = alreadyAdded.has(crop.id)
                      return (
                        <button
                          key={crop.id}
                          onClick={() => pickCrop(crop)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
                        >
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CROP_TYPE_COLORS[crop.type] ?? '#2B6117' }} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-800 truncate">{crop.name_uk}</div>
                            {crop.name_lat && <div className="text-xs text-gray-400 truncate italic">{crop.name_lat}</div>}
                          </div>
                          <span className="text-xs text-gray-400 shrink-0">{CROP_TYPE_LABELS[crop.type]}</span>
                          {added && <span className="text-xs text-forest font-medium shrink-0">✓ В календарі</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Label ──────────────────────────────────────────────────── */}
          <div className="flex items-center gap-4 py-4 border-b border-gray-100">
            <label className="w-44 text-sm font-semibold text-gray-700 shrink-0">
              Назва <span className="font-normal text-gray-400">необов'язково</span>
            </label>
            <input
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="Напр. Томати на балконі"
              className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-forest hover:border-gray-300 transition-colors"
            />
          </div>

          {/* ── Color ──────────────────────────────────────────────────── */}
          <div className="flex items-center gap-4 py-4 border-b border-gray-100">
            <label className="w-44 text-sm font-semibold text-gray-700 shrink-0">
              Колір
            </label>
            <div className="flex items-center gap-3 flex-1 px-4 py-2 border-2 border-gray-200 rounded-xl hover:border-gray-300 transition-colors">
              <input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent p-0"
                style={{ appearance: 'none' }}
              />
              <span className="text-sm text-gray-600 font-mono">{color.toUpperCase()}</span>
            </div>
          </div>

          {/* ── Schedule ───────────────────────────────────────────────── */}
          {selected && (
            <div className="pt-6">
              <h2 className="text-lg font-black text-gray-800 mb-1">Розклад</h2>
              <p className="text-sm text-gray-400 mb-5">Задачі автоматично перераховуються при зміні дат початку</p>

              <div className="space-y-3">
                {schedule.map((task, idx) => (
                  <div key={idx} className="flex items-start gap-4 p-4 bg-white border border-gray-200 rounded-xl">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-base mt-0.5"
                      style={{ backgroundColor: TASK_COLORS[task.type] + '40' }}
                    >
                      {task.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-gray-800">{task.name}</span>
                        <span className="text-gray-300">•</span>
                        <span className="text-sm text-gray-400">Тривалість {task.duration}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{task.timing}</p>
                    </div>
                    {task.isAnchor && (
                      <div className="flex items-center gap-1 text-xs text-forest border border-forest/30 rounded-full px-2.5 py-1 shrink-0">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                          <path strokeLinecap="round" strokeWidth="2" d="M12 8v4m0 4h.01"/>
                        </svg>
                        Опорна задача
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Error ──────────────────────────────────────────────────── */}
          {error && (
            <div className="mt-4 px-4 py-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>
          )}

          {/* ── Actions ────────────────────────────────────────────────── */}
          <div className="flex justify-end gap-3 pt-8">
            <button
              onClick={() => navigate(-1)}
              className="px-5 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:border-gray-300 transition-colors"
            >
              Скасувати
            </button>
            <button
              onClick={handleSave}
              disabled={!selected || saving}
              className="px-6 py-2.5 rounded-xl bg-forest text-white font-bold text-sm uppercase tracking-wide hover:bg-forest-dark transition-colors disabled:opacity-40"
            >
              {saving ? 'Збереження...' : 'Зберегти в календар'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
