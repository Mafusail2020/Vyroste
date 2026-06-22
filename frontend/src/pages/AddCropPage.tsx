import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface Variety {
  id: string
  name_uk: string
  growing_method: 'seedling' | 'direct' | 'both'
  seedling_sow_start_offset: number | null
  transplant_start_offset: number | null
  direct_sow_start_offset: number | null
  days_to_harvest: number | null
}

interface Category {
  id: string
  name_uk: string
  name_lat: string | null
  type: string
  varieties: Variety[]
}

interface CalendarMeta {
  id: string
  name: string
  calendar_type: 'horod' | 'sad' | 'mixed'
  selected_varieties: string[] | null
}

// Calendar type → allowed crop-category types (mixed = all).
const TYPE_ALLOWED: Record<string, string[]> = {
  horod: ['vegetable', 'herb'],
  sad:   ['flower', 'berry', 'tree'],
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

/* ─── Schedule builder (frost-relative offsets in days) ──────────────────── */

interface TaskDef {
  type: string
  icon: string
  name: string
  duration: string
  timing: string
  isAnchor?: boolean
}

function frostRel(days: number): string {
  if (days === 0) return 'У день останніх морозів'
  return days < 0
    ? `За ${Math.abs(days)} днів до останніх морозів`
    : `Через ${days} днів після останніх морозів`
}

function buildSchedule(v: Variety): TaskDef[] {
  const tasks: TaskDef[] = []
  const isSeedling = v.transplant_start_offset !== null

  if (isSeedling) {
    if (v.seedling_sow_start_offset !== null) {
      tasks.push({
        type: 'seeding', icon: '🌱', name: 'Посів (розсада)', duration: '7 днів',
        timing: frostRel(v.seedling_sow_start_offset), isAnchor: true,
      })
    }
    tasks.push({ type: 'bed_prep', icon: '⛏️', name: 'Підготовка ґрунту', duration: '7 днів',
      timing: 'За 7 днів до Висадки' })
    tasks.push({ type: 'transplanting', icon: '🌿', name: 'Висадка', duration: '7 днів',
      timing: frostRel(v.transplant_start_offset ?? 0) })
  } else {
    tasks.push({ type: 'bed_prep', icon: '⛏️', name: 'Підготовка ґрунту', duration: '7 днів',
      timing: 'За 7 днів до Прямого посіву' })
    tasks.push({ type: 'direct_sow', icon: '🌱', name: 'Прямий посів', duration: '7 днів',
      timing: frostRel(v.direct_sow_start_offset ?? 0), isAnchor: true })
  }

  tasks.push({ type: 'cultivating', icon: '🔧', name: 'Догляд', duration: '7 днів',
    timing: `Через 14 днів після ${isSeedling ? 'Висадки' : 'Посіву'} • Повторюється кожні 21 день до Збору` })
  tasks.push({ type: 'harvesting', icon: '🌾', name: 'Збір врожаю', duration: '30 днів',
    timing: `Через ${v.days_to_harvest ?? 90} днів після ${isSeedling ? 'Висадки' : 'Прямого посіву'}` })

  return tasks
}

/* ─── Component ──────────────────────────────────────────────────────────── */

export default function AddCropPage() {
  const navigate = useNavigate()

  const [categories,  setCategories]  = useState<Category[]>([])
  const [calendar,    setCalendar]    = useState<CalendarMeta | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [dropOpen,    setDropOpen]    = useState(false)
  const [category,    setCategory]    = useState<Category | null>(null)
  const [variety,     setVariety]     = useState<Variety | null>(null)
  const [label,       setLabel]       = useState('')
  const [color,       setColor]       = useState('#2B6117')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')
  const [success,     setSuccess]     = useState(false)

  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([
      api.get<Category[]>('/api/categories'),
      api.get<CalendarMeta[]>('/api/calendars').catch(() => ({ data: [] as CalendarMeta[] })),
    ]).then(([cat, cals]) => {
      setCategories(cat.data)
      const stored = localStorage.getItem('activeCalendarId')
      const active = cals.data.find(c => c.id === stored) ?? cals.data[0] ?? null
      setCalendar(active)
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (category) setColor(CROP_TYPE_COLORS[category.type] ?? '#2B6117')
  }, [category])

  const alreadyAdded = new Set(calendar?.selected_varieties ?? [])

  const allowedTypes = calendar ? TYPE_ALLOWED[calendar.calendar_type] : undefined
  const filtered = categories
    .filter(c => !allowedTypes || allowedTypes.includes(c.type))
    .filter(c =>
      c.name_uk.toLowerCase().includes(search.toLowerCase()) ||
      (c.name_lat ?? '').toLowerCase().includes(search.toLowerCase())
    )

  function pickCategory(cat: Category) {
    setCategory(cat)
    setVariety(cat.varieties.length === 1 ? cat.varieties[0] : null)  // auto-select lone sort
    setSearch(cat.name_uk)
    setDropOpen(false)
    setError('')
  }

  async function handleSave() {
    if (!category)  { setError('Оберіть культуру'); return }
    if (!variety)   { setError('Оберіть сорт'); return }
    if (!calendar)  { setError('Спочатку створіть календар у розділі «Календар».'); return }
    setSaving(true)
    setError('')
    try {
      await api.post(`/api/calendars/${calendar.id}/varieties/${variety.id}`)
      setSuccess(true)
    } catch {
      setError('Помилка збереження. Спробуйте ще раз.')
    } finally {
      setSaving(false)
    }
  }

  const schedule = variety ? buildSchedule(variety) : []
  const multi = (category?.varieties.length ?? 0) > 1

  /* ── Success screen ───────────────────────────────────────────────────── */
  if (success && category && variety) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <div className="text-5xl mb-4">🌱</div>
        <h2 className="text-2xl font-black text-forest uppercase mb-2">Додано!</h2>
        <p className="text-gray-500 mb-8">
          <strong>{label || variety.name_uk}</strong> додано до календаря «{calendar?.name}»
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => { setCategory(null); setVariety(null); setSearch(''); setLabel(''); setSuccess(false) }}
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
                {category ? (
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-sm font-medium text-gray-800">{category.name_uk}</span>
                    <span className="text-xs text-gray-400">{CROP_TYPE_LABELS[category.type]}</span>
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
                      type="text" autoFocus placeholder="Пошук..." value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-forest"
                    />
                  </div>
                  <div className="max-h-56 overflow-y-auto">
                    {filtered.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-400">Нічого не знайдено</div>
                    ) : filtered.map(cat => {
                      const addedCount = cat.varieties.reduce((n, v) => n + (alreadyAdded.has(v.id) ? 1 : 0), 0)
                      return (
                        <button
                          key={cat.id}
                          onClick={() => pickCategory(cat)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
                        >
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CROP_TYPE_COLORS[cat.type] ?? '#2B6117' }} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-800 truncate">{cat.name_uk}</div>
                            {cat.varieties.length > 1 && (
                              <div className="text-xs text-gray-400 truncate">{cat.varieties.length} сортів</div>
                            )}
                          </div>
                          <span className="text-xs text-gray-400 shrink-0">{CROP_TYPE_LABELS[cat.type]}</span>
                          {addedCount > 0 && <span className="text-xs text-forest font-medium shrink-0">✓ {addedCount}</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Variety (Сорт) — only when category has >1 ─────────────── */}
          {category && (
            <div
              style={{
                display: 'grid',
                gridTemplateRows: multi ? '1fr' : '0fr',
                transition: 'grid-template-rows 0.28s ease',
              }}
            >
              <div className="overflow-hidden">
                <div className="flex items-start gap-4 py-4 border-b border-gray-100">
                  <label className="w-44 text-sm font-semibold text-gray-700 shrink-0 pt-1.5">
                    Сорт
                  </label>
                  <div className="flex-1 flex flex-wrap gap-2">
                    {category.varieties.map(v => {
                      const sel = variety?.id === v.id
                      const added = alreadyAdded.has(v.id)
                      return (
                        <button
                          key={v.id}
                          onClick={() => { setVariety(v); setError('') }}
                          className={`text-sm px-3 py-1.5 rounded-lg border-2 transition-colors ${
                            sel ? 'border-forest bg-forest text-white'
                                : 'border-gray-200 bg-white text-gray-700 hover:border-forest/40'
                          }`}
                        >
                          {v.name_uk}
                          {added && <span className={`ml-1.5 ${sel ? 'text-white/80' : 'text-forest'}`}>✓</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Label ──────────────────────────────────────────────────── */}
          <div className="flex items-center gap-4 py-4 border-b border-gray-100">
            <label className="w-44 text-sm font-semibold text-gray-700 shrink-0">
              Назва <span className="font-normal text-gray-400">необов'язково</span>
            </label>
            <input
              type="text" value={label} onChange={e => setLabel(e.target.value)}
              placeholder="Напр. Томати на балконі"
              className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-forest hover:border-gray-300 transition-colors"
            />
          </div>

          {/* ── Color ──────────────────────────────────────────────────── */}
          <div className="flex items-center gap-4 py-4 border-b border-gray-100">
            <label className="w-44 text-sm font-semibold text-gray-700 shrink-0">Колір</label>
            <div className="flex items-center gap-3 flex-1 px-4 py-2 border-2 border-gray-200 rounded-xl hover:border-gray-300 transition-colors">
              <input
                type="color" value={color} onChange={e => setColor(e.target.value)}
                className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent p-0"
                style={{ appearance: 'none' }}
              />
              <span className="text-sm text-gray-600 font-mono">{color.toUpperCase()}</span>
            </div>
          </div>

          {/* ── Schedule ───────────────────────────────────────────────── */}
          {variety && (
            <div className="pt-6">
              <h2 className="text-lg font-black text-gray-800 mb-1">Розклад</h2>
              <p className="text-sm text-gray-400 mb-5">Дати прив'язані до останніх морозів вашого регіону</p>

              <div className="space-y-3">
                {schedule.map((task, idx) => (
                  <div key={idx} className="flex items-start gap-4 p-4 bg-white border border-gray-200 rounded-xl">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-base mt-0.5"
                      style={{ backgroundColor: TASK_COLORS[task.type] + '40' }}>
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
              disabled={!variety || saving}
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
