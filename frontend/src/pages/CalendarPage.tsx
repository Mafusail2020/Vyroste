import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import { getMonthMoonDays, type MoonDay } from '../lib/moonPhase'

/* ─── Types ──────────────────────────────────────────────────────────────── */

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

interface CalendarMeta {
  id: string
  name: string
  region_id: string | null
  region_name: string | null
  calendar_type: 'horod' | 'sad' | 'mixed'
  variety_count: number
}

const CAL_TYPE_LABELS: Record<string, string> = {
  horod: '🥕 Город',
  sad:   '🌸 Сад',
  mixed: '🌿 Змішаний',
}

interface RegionMeta {
  id: string
  region: string
  city: string
}

type TaskType = 'seeding' | 'bed_prep' | 'transplanting' | 'direct_sow' | 'cultivating' | 'harvesting'

interface Task {
  id: string
  type: TaskType
  start: Date
  end: Date
}

interface Segment {
  task: Task
  cropId: string
  cropName: string
  startDay: number
  endDay: number
  isFirst: boolean
  isLast: boolean
  lane: number
}

/* ─── Constants ──────────────────────────────────────────────────────────── */

const DAY_W    = 30   // px per day column
const LABEL_W  = 80   // px for month label
const TASK_H   = 22   // px task bar height
const TASK_GAP = 2    // px gap between bars
const TOP_PAD  = 4    // px top padding in row
const MOON_H   = 16   // px moon strip height
const WD_H     = 11   // px weekday-initial band at top of each cell (keep bars/moon below it)

const MONTHS_SHORT = ['Січ','Лют','Бер','Кві','Тра','Чер','Лип','Сер','Вер','Жов','Лис','Гру']

// Indexed by Date.getDay() (0 = Sunday … 6 = Saturday).
const WEEKDAY_UK = ['Нд','Пн','Вт','Ср','Чт','Пт','Сб']

// Shared toolbar button styling so every control reads as one family.
const BTN_BASE   = 'px-3 py-1 text-xs font-semibold border rounded-lg transition-colors'
const BTN_REST   = 'border-gray-300 text-gray-700 hover:bg-gray-50'
const BTN_ACTIVE = 'border-forest bg-forest text-white'

const TASK_CFG: Record<TaskType, { label: string; icon: string; bg: string; fg: string }> = {
  seeding:       { label: 'Посів (розсада)',    icon: '🌱', bg: '#FDE68A', fg: '#78350F' },
  bed_prep:      { label: 'Підготовка ґрунту',  icon: '⛏️',  bg: '#D6D3D1', fg: '#1C1917' },
  transplanting: { label: 'Висадка',            icon: '🌿', bg: '#2B6117', fg: '#FFFFFF' },
  direct_sow:    { label: 'Прямий посів',       icon: '🌱', bg: '#22C55E', fg: '#FFFFFF' },
  cultivating:   { label: 'Догляд',             icon: '🔧', bg: '#86EFAC', fg: '#14532D' },
  harvesting:    { label: 'Збір врожаю',        icon: '🌾', bg: '#FB923C', fg: '#FFFFFF' },
}

// Fallback palette by crop type, used only when a plant has no user-picked colour.
const CROP_COLORS: Record<string, string> = {
  vegetable: '#2B6117', herb: '#0D9488', flower: '#EC4899', berry: '#DC2626', tree: '#78350F',
}

// Pick readable text (near-black / white) for a given background colour.
function readableText(hex: string): string {
  const h = hex.replace('#', '')
  if (h.length < 6) return '#FFFFFF'
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? '#1C1917' : '#FFFFFF'
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function generateTasks(w: CropWindow, offset: number): Task[] {
  const gp = addDays(parseDate(w.ground_planting), offset)
  const hs = addDays(parseDate(w.harvest_start),   offset)
  const he = addDays(parseDate(w.harvest_end),     offset)
  const tasks: Task[] = []

  const mk = (type: TaskType, start: Date, end: Date): Task => ({
    id: `${w.crop_id}-${type}-${start.getTime()}`,
    type, start, end,
  })

  if (w.seedling_start) {
    const ss = addDays(parseDate(w.seedling_start), offset)
    tasks.push(mk('seeding', ss, addDays(ss, 7)))
  }

  const bedStart = addDays(gp, -7)
  tasks.push(mk('bed_prep', bedStart, gp))
  tasks.push(mk(w.direct_sow ? 'direct_sow' : 'transplanting', gp, addDays(gp, 7)))

  let cs = addDays(gp, 14)
  while (cs < hs) {
    const ce = addDays(cs, 7)
    tasks.push(mk('cultivating', cs, ce < hs ? ce : hs))
    cs = addDays(cs, 21)
  }

  tasks.push(mk('harvesting', hs, he))
  return tasks
}

function buildSegments(
  tasks: Task[], cropId: string, cropName: string,
  year: number, month: number, hiddenTypes: Set<TaskType>
): Omit<Segment, 'lane'>[] {
  const days = daysInMonth(year, month)
  const mStart = new Date(year, month, 1)
  const mEnd   = new Date(year, month, days, 23, 59, 59)
  const segs: Omit<Segment, 'lane'>[] = []

  for (const task of tasks) {
    if (hiddenTypes.has(task.type)) continue
    if (task.end <= mStart || task.start > mEnd) continue
    const startDay = task.start < mStart ? 1          : task.start.getDate()
    const endDay   = task.end   > mEnd   ? days       : Math.min(task.end.getDate(), days)
    if (startDay > endDay) continue
    segs.push({ task, cropId, cropName, startDay, endDay, isFirst: task.start >= mStart, isLast: task.end <= mEnd })
  }
  return segs
}

function assignLanes(segs: Omit<Segment, 'lane'>[]): Segment[] {
  const sorted = [...segs].sort((a, b) => a.startDay - b.startDay || a.task.type.localeCompare(b.task.type))
  const laneEnd: number[] = []
  return sorted.map(seg => {
    let lane = 0
    while (lane < laneEnd.length && laneEnd[lane] >= seg.startDay) lane++
    laneEnd[lane] = seg.endDay
    return { ...seg, lane }
  })
}

/* ─── Component ──────────────────────────────────────────────────────────── */

export default function CalendarPage() {
  const today = new Date()
  const todayYear = today.getFullYear()

  const [windows,      setWindows]      = useState<CropWindow[]>([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')
  const [calendars,    setCalendars]    = useState<CalendarMeta[]>([])
  const [activeId,     setActiveId]     = useState<string | null>(null)
  const [regions,      setRegions]      = useState<RegionMeta[]>([])
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [creating,     setCreating]     = useState(false)
  const [newName,      setNewName]      = useState('')
  const [newRegion,    setNewRegion]    = useState('')
  const [newType,      setNewType]      = useState('mixed')
  const [editingId,    setEditingId]    = useState<string | null>(null)
  const [editName,     setEditName]     = useState('')
  const [regionEditId, setRegionEditId] = useState<string | null>(null)
  const [typeEditId,   setTypeEditId]   = useState<string | null>(null)
  const [reloadKey,    setReloadKey]    = useState(0)
  const [year,         setYear]         = useState(today.getFullYear())
  const [search,       setSearch]       = useState('')
  const [selectedId,   setSelectedId]   = useState<string | null>(null)
  const [hiddenTypes,  setHiddenTypes]  = useState<Set<TaskType>>(new Set())
  const [cropOffsets,  setCropOffsets]  = useState<Record<string, number>>({})
  const [sidebarOpen,  setSidebarOpen]  = useState(true)
  const [showMoon,     setShowMoon]     = useState(false)
  const [moonData,     setMoonData]     = useState<MoonDay[][]>([])
  const [gddMap,       setGddMap]       = useState<Record<string, number>>({})
  const [liveOff,      setLiveOff]      = useState<{ id: string; delta: number } | null>(null)
  const [hoveredCrop,  setHoveredCrop]  = useState<string | null>(null)
  const [showDragHint, setShowDragHint] = useState(() => !localStorage.getItem('calDragHintSeen'))
  const [monthInView,  setMonthInView]  = useState(true)
  // Per-plant colours picked on the add-crop screen (id → hex), read-only here.
  const [cropColorMap] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('cropColors') || '{}') } catch { return {} }
  })

  const dragRef     = useRef<{ id: string; startX: number; base: number } | null>(null)
  const liveRef     = useRef<{ id: string; delta: number } | null>(null)
  const scrollRef   = useRef<HTMLDivElement>(null)
  const todayRowRef = useRef<HTMLDivElement>(null)
  const activeIdRef = useRef<string | null>(null)   // current id for the drag handler (stable closure)

  const offsetsKey = (id: string) => `calOffsets:${id}`

  // Load the user's calendars + region list once.
  useEffect(() => {
    Promise.all([
      api.get<CalendarMeta[]>('/api/calendars'),
      api.get<RegionMeta[]>('/api/regions').catch(() => ({ data: [] as RegionMeta[] })),
    ])
      .then(([cs, rs]) => {
        setCalendars(cs.data)
        setRegions(rs.data)
        const stored = localStorage.getItem('activeCalendarId')
        const pick = cs.data.find(c => c.id === stored) ?? cs.data[0]
        if (pick) setActiveId(pick.id)
        else setLoading(false)   // user has no calendars yet
      })
      .catch(e => { setError(e?.response?.data?.detail ?? 'Помилка завантаження'); setLoading(false) })
  }, [])

  // (Re)load windows whenever the active calendar changes.
  useEffect(() => {
    if (!activeId) return
    localStorage.setItem('activeCalendarId', activeId)
    activeIdRef.current = activeId
    // Restore this calendar's saved date shifts (auto-saved per calendar).
    try { setCropOffsets(JSON.parse(localStorage.getItem(offsetsKey(activeId)) || '{}')) }
    catch { setCropOffsets({}) }
    setLoading(true)
    api.get<CropWindow[]>(`/api/calendars/${activeId}/windows`)
      .then(r => setWindows(r.data))
      .catch(e => setError(e?.response?.data?.detail ?? 'Помилка завантаження'))
      .finally(() => setLoading(false))
    api.get<{ crops: { crop_id: string; pct: number }[] }>(`/api/gdd/me?calendar_id=${activeId}`)
      .then(r => {
        const m: Record<string, number> = {}
        for (const c of r.data.crops) m[c.crop_id] = c.pct
        setGddMap(m)
      })
      .catch(() => {})
  }, [activeId, reloadKey])

  const activeCal = calendars.find(c => c.id === activeId) ?? null

  async function changeRegion(c: CalendarMeta, regionId: string) {
    if (!regionId || regionId === c.region_id) return
    const r = await api.patch<CalendarMeta>(`/api/calendars/${c.id}`, { region_id: regionId })
    setCalendars(p => p.map(x => (x.id === c.id ? r.data : x)))
    if (c.id === activeId) setReloadKey(k => k + 1)   // dates depend on region
  }

  async function changeType(c: CalendarMeta, calType: string) {
    if (calType === (c.calendar_type || 'mixed')) return
    try {
      const r = await api.patch<CalendarMeta>(`/api/calendars/${c.id}`, { calendar_type: calType })
      setCalendars(p => p.map(x => (x.id === c.id ? r.data : x)))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Не вдалось змінити тип (застосуйте міграцію 008)')
    }
  }

  async function createCalendar() {
    try {
      const r = await api.post<CalendarMeta>('/api/calendars', {
        name: newName.trim() || 'Новий календар',
        region_id: newRegion || activeCal?.region_id || null,
        calendar_type: newType,
      })
      setCalendars(p => [...p, r.data])
      setActiveId(r.data.id)
      setCreating(false); setSwitcherOpen(false); setNewName(''); setNewRegion(''); setNewType('mixed')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Не вдалось створити календар')
    }
  }

  function startRename(c: CalendarMeta) {
    setEditingId(c.id)
    setEditName(c.name)
  }

  async function commitRename() {
    if (!editingId) return
    const id = editingId
    const name = editName.trim()
    setEditingId(null)
    if (!name || name === calendars.find(c => c.id === id)?.name) return
    const r = await api.patch<CalendarMeta>(`/api/calendars/${id}`, { name })
    setCalendars(p => p.map(c => (c.id === id ? r.data : c)))
  }

  async function deleteCalendar() {
    if (!activeId || calendars.length <= 1) return
    if (!window.confirm(`Видалити календар «${activeCal?.name}»?`)) return
    await api.delete(`/api/calendars/${activeId}`)
    const rest = calendars.filter(c => c.id !== activeId)
    setCalendars(rest)
    setSwitcherOpen(false)
    setActiveId(rest[0]?.id ?? null)
  }

  useEffect(() => {
    setMoonData(Array.from({ length: 12 }, (_, m) => getMonthMoonDays(year, m)))
  }, [year])

  // Float a "today" button whenever the current month row is scrolled out of
  // view (or we're browsing a different year).
  useEffect(() => {
    if (year !== todayYear) return            // different year: no current-month row to watch
    const el = todayRowRef.current
    const root = scrollRef.current
    if (!el || !root) return
    const obs = new IntersectionObserver(
      ([entry]) => setMonthInView(entry.isIntersecting),
      { root, threshold: 0.2 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [year, todayYear, windows, showMoon, loading])

  function goToToday() {
    const cy = today.getFullYear()
    if (year !== cy) {
      setYear(cy)
      setTimeout(() => todayRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60)
    } else {
      todayRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return
      const delta = Math.round((e.clientX - dragRef.current.startX) / DAY_W)
      const v = { id: dragRef.current.id, delta: dragRef.current.base + delta }
      liveRef.current = v
      setLiveOff(v)
    }
    const onUp = () => {
      if (!dragRef.current) return
      if (liveRef.current) {
        const { id, delta } = liveRef.current
        setCropOffsets(p => {
          const next = { ...p, [id]: delta }
          if (activeIdRef.current) localStorage.setItem(offsetsKey(activeIdRef.current), JSON.stringify(next))
          return next
        })
      }
      dragRef.current = null
      liveRef.current = null
      setLiveOff(null)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  function startDrag(e: React.MouseEvent, cropId: string) {
    e.preventDefault()
    const base = liveOff?.id === cropId ? liveOff.delta : (cropOffsets[cropId] ?? 0)
    dragRef.current = { id: cropId, startX: e.clientX, base }
    if (showDragHint) { setShowDragHint(false); localStorage.setItem('calDragHintSeen', '1') }
  }

  function effectiveOffset(cropId: string) {
    return liveOff?.id === cropId ? liveOff.delta : (cropOffsets[cropId] ?? 0)
  }

  const visible = windows.filter(w => !search || w.crop_name.toLowerCase().includes(search.toLowerCase()))
  const lunarMap: Record<string, string | null> = Object.fromEntries(
    windows.map(w => [w.crop_id, w.lunar_preference])
  )
  // Resolved bar colour per plant: user-picked, else type fallback.
  const cropColors: Record<string, string> = Object.fromEntries(
    windows.map(w => [w.crop_id, cropColorMap[w.crop_id] ?? CROP_COLORS[w.crop_type] ?? '#2B6117'])
  )

  /* ── Early returns ────────────────────────────────────────────────────── */
  if (loading) return (
    <div className="max-w-full px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="animate-pulse bg-gray-200 rounded-full w-8 h-8" />
        <div className="animate-pulse bg-gray-200 rounded-lg h-7 w-36" />
        <div className="animate-pulse bg-gray-200 rounded-full w-8 h-8" />
      </div>
      <div className="space-y-3">
        {[0.7, 1, 0.85, 0.6, 0.9, 0.75].map((w, i) => (
          <div key={i} className="flex gap-3 items-center">
            <div className="animate-pulse bg-gray-200 rounded-lg h-12 w-20 shrink-0" />
            <div
              className="animate-pulse bg-gray-200 rounded-lg h-12"
              style={{ width: `${w * 100}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  )
  if (error) return (
    <div className="max-w-xl mx-auto px-6 py-16 text-center text-red-600">{error}</div>
  )
  if (calendars.length === 0) return (
    <div className="max-w-xl mx-auto px-6 py-16 text-center text-gray-500">
      Ще немає календарів. Завершіть{' '}
      <Link to="/onboarding" className="text-forest underline">налаштування</Link>, щоб створити перший.
    </div>
  )

  const gridMinW = LABEL_W + 31 * DAY_W
  const showTodayFab = year !== todayYear || !monthInView

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden select-none bg-white">

      {/* ── Sidebar ───────────────────────────────────────────────────── */}
      <aside className={`flex-none bg-white border-r border-gray-200 flex flex-col transition-all duration-200 overflow-hidden ${sidebarOpen ? 'w-52' : 'w-12'}`}>

        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-3 border-b border-gray-100 shrink-0">
          {sidebarOpen && <span className="font-black text-xs uppercase tracking-wide text-gray-700 flex-1">Мої культури</span>}
          <button onClick={() => setSidebarOpen(v => !v)} className="p-1 rounded hover:bg-gray-100 text-gray-500 shrink-0">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="currentColor">
              <rect y="2" width="15" height="2" rx="1"/>
              <rect y="6.5" width="15" height="2" rx="1"/>
              <rect y="11" width="15" height="2" rx="1"/>
            </svg>
          </button>
        </div>

        {sidebarOpen && (
          <>
            {/* Search */}
            <div className="px-2 pt-2 pb-1 shrink-0">
              <input type="text" placeholder="Пошук культур..." value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:border-forest" />
            </div>

            {/* Crop list */}
            <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
              <p className="text-xs text-gray-400 px-2 py-1 uppercase tracking-wide">Групи за роком</p>
              {visible.map(w => {
                const active = selectedId === w.crop_id || hoveredCrop === w.crop_id
                return (
                  <button key={w.crop_id}
                    onClick={() => setSelectedId(selectedId === w.crop_id ? null : w.crop_id)}
                    onMouseEnter={() => setHoveredCrop(w.crop_id)}
                    onMouseLeave={() => setHoveredCrop(null)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition-colors ${active ? 'bg-forest/10 text-forest' : 'hover:bg-gray-50 text-gray-700'}`}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cropColors[w.crop_id] }} />
                    <span className="truncate font-medium">{w.crop_name}</span>
                    {w.lunar_preference === 'above_ground' && <span className="ml-auto text-gray-400" title="Сприятливі наземні (надземні) дні">🌒</span>}
                    {w.lunar_preference === 'below_ground' && <span className="ml-auto text-gray-400" title="Сприятливі підземні (кореневі) дні">🌘</span>}
                  </button>
                )
              })}
              {/* Lunar-icon legend */}
              {visible.some(w => w.lunar_preference === 'above_ground' || w.lunar_preference === 'below_ground') && (
                <p className="px-2 pt-1 text-[10px] text-gray-400 leading-snug">
                  🌒 наземні · 🌘 підземні культури
                </p>
              )}
              <Link to="/crops/add" className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-forest hover:bg-forest/5 rounded-lg">
                <span className="font-bold text-lg leading-none">+</span>
                <span>Додати культуру</span>
              </Link>
            </div>

            {/* Task type filter */}
            <div className="border-t border-gray-100 px-2 py-2 space-y-0.5 shrink-0">
              <div className="flex items-center justify-between px-2 mb-1.5">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Фільтр задач</p>
                <button
                  onClick={() => setHiddenTypes(prev =>
                    prev.size > 0 ? new Set() : new Set(Object.keys(TASK_CFG) as TaskType[])
                  )}
                  className="text-[10px] font-semibold text-forest hover:underline"
                >
                  {hiddenTypes.size > 0 ? 'Показати всі' : 'Сховати всі'}
                </button>
              </div>
              {(Object.entries(TASK_CFG) as [TaskType, typeof TASK_CFG[TaskType]][]).map(([type, cfg]) => (
                <button key={type}
                  onClick={() => setHiddenTypes(prev => { const n = new Set(prev); n.has(type) ? n.delete(type) : n.add(type); return n })}
                  className={`flex items-center gap-1.5 w-full px-2 py-0.5 rounded text-xs transition-opacity ${hiddenTypes.has(type) ? 'opacity-25' : 'opacity-100'}`}
                >
                  <span className="text-gray-600 truncate">{cfg.icon} {cfg.label}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </aside>

      {/* ── Main ──────────────────────────────────────────────────────── */}
      <div className="relative flex-1 flex flex-col overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-200 shrink-0">
          <div className={`${BTN_BASE} ${BTN_REST} flex items-center gap-1 px-1`}>
            <button onClick={() => setYear(y => y - 1)}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500 text-lg leading-none">‹</button>
            <span className="font-bold text-gray-800 w-10 text-center text-sm">{year}</span>
            <button onClick={() => setYear(y => y + 1)}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500 text-lg leading-none">›</button>
          </div>
          {/* Calendar panel toggle */}
          <button
            onClick={() => setSwitcherOpen(v => !v)}
            className={`${BTN_BASE} ml-1 flex items-center gap-1.5 ${switcherOpen ? BTN_ACTIVE : BTN_REST}`}
          >
            <span className="shrink-0">📅</span>
            <span className="truncate shrink-0 max-w-[180px]">{activeCal?.name ?? 'Календарі'}</span>
            {activeCal?.region_name && (
              <span className={`hidden lg:inline truncate shrink-0 max-w-[130px] font-normal ${switcherOpen ? 'text-white/70' : 'text-gray-400'}`}>
                · {activeCal.region_name}
              </span>
            )}
          </button>

          <button
            onClick={() => setShowMoon(v => !v)}
            className={`${BTN_BASE} ${showMoon ? BTN_ACTIVE : BTN_REST}`}
          >
            🌙 Місяць
          </button>

          {showMoon && (
            <div className="flex items-center gap-3 text-xs text-gray-500 border-l border-gray-200 pl-3">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block bg-green-400/70" />
                Наземні
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: 'rgba(120,53,15,0.5)' }} />
                Підземні
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block bg-gray-200" />
                Відпочинок
              </span>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            {showDragHint && (
              <span className="text-xs text-gray-400 hidden sm:flex items-center gap-1.5">
                ✋ Тягніть смугу для зміщення дат
                <button onClick={() => { setShowDragHint(false); localStorage.setItem('calDragHintSeen', '1') }}
                  className="text-gray-300 hover:text-gray-500 leading-none" title="Сховати підказку">×</button>
              </span>
            )}
            {Object.keys(cropOffsets).length > 0 && (
              <button onClick={() => { setCropOffsets({}); if (activeId) localStorage.removeItem(offsetsKey(activeId)) }}
                className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500">
                Скинути
              </button>
            )}
          </div>
        </div>

        {/* Scrollable grid */}
        <div ref={scrollRef} className="flex-1 overflow-auto">
          <div className="min-h-full flex flex-col" style={{ minWidth: gridMinW }}>

            {/* ── Day number header — sticky top ─────────────────────── */}
            <div className="shrink-0 sticky top-0 z-30 flex border-b-2 border-gray-300 bg-white shadow-sm">
              <div className="shrink-0 border-r border-gray-200 bg-white" style={{ width: LABEL_W }} />
              <div className="flex">
                {Array.from({ length: 31 }, (_, i) => {
                  const isTodayCol = today.getFullYear() === year && today.getDate() === i + 1
                  return (
                    <div key={i + 1}
                      className={`border-l border-gray-100 text-center py-1 ${isTodayCol ? 'bg-forest/10' : ''}`}
                      style={{ width: DAY_W }}
                    >
                      {isTodayCol
                        ? <div className="mx-auto w-5 h-5 rounded-full bg-forest text-white text-xs font-bold flex items-center justify-center leading-none">{i + 1}</div>
                        : <div className="text-xs font-bold text-gray-400">{i + 1}</div>}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── Month rows ─────────────────────────────────────────── */}
            {Array.from({ length: 12 }, (_, month) => {
              const days      = daysInMonth(year, month)
              const isCurrent = year === today.getFullYear() && month === today.getMonth()
              const todayDay  = today.getDate()

              // Build segments for this month
              const rawSegs: Omit<Segment, 'lane'>[] = []
              visible.forEach(w => {
                if (selectedId && w.crop_id !== selectedId) return
                const tasks = generateTasks(w, effectiveOffset(w.crop_id))
                buildSegments(tasks, w.crop_id, w.crop_name, year, month, hiddenTypes)
                  .forEach(s => rawSegs.push(s))
              })
              const segs    = assignLanes(rawSegs)
              const lanes   = segs.length > 0 ? Math.max(...segs.map(s => s.lane)) + 1 : 0
              const moonOff = showMoon ? MOON_H : 0
              const rowH    = Math.max(40, WD_H + TOP_PAD * 2 + moonOff + lanes * (TASK_H + TASK_GAP))
              const monthMoon = moonData[month] ?? []

              return (
                <div key={month} ref={isCurrent ? todayRowRef : undefined}
                  className={`flex flex-1 border-b ${isCurrent ? 'border-forest/30' : 'border-gray-100'}`}
                  style={{ minHeight: rowH }}>

                  {/* Month label — sticky left */}
                  <div className={`shrink-0 sticky left-0 z-10 flex flex-col items-end justify-start pr-3 pt-1.5 border-r border-gray-200 ${isCurrent ? 'bg-amber-50' : 'bg-white'}`}
                    style={{ width: LABEL_W }}>
                    <span className={`text-xs font-black uppercase ${isCurrent ? 'text-forest' : 'text-gray-400'}`}>
                      {MONTHS_SHORT[month]}
                    </span>
                    {isCurrent && <span className="text-xs text-forest/50">{year}</span>}
                  </div>

                  {/* Day grid */}
                  <div className="flex-1 relative" style={{ minHeight: rowH }}>

                    {/* Cell backgrounds */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {Array.from({ length: 31 }, (_, i) => {
                        const day     = i + 1
                        const inMonth = day <= days
                        const isToday = isCurrent && day === todayDay
                        const dow     = inMonth ? new Date(year, month, day).getDay() : -1
                        const weekend = dow === 0 || dow === 6
                        return (
                          <div key={day}
                            style={{
                              width: DAY_W,
                              ...(!inMonth ? {
                                backgroundImage:
                                  'repeating-linear-gradient(45deg, transparent 0 5px, rgba(0,0,0,0.045) 5px 6px)',
                              } : {}),
                            }}
                            className={`relative h-full border-l ${
                              isToday   ? 'bg-forest/10 border-forest/30' :
                              !inMonth  ? 'bg-gray-100 border-gray-100' :
                              weekend   ? 'bg-gray-50 border-gray-100' :
                                          'border-gray-100'
                            }`}
                          >
                            {inMonth && (
                              <span
                                className={`absolute top-px left-0.5 leading-none text-gray-500 opacity-50 ${weekend ? 'font-semibold' : ''}`}
                                style={{ fontSize: 8 }}
                              >
                                {WEEKDAY_UK[dow]}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Moon strip */}
                    {showMoon && (
                      <div className="absolute inset-x-0 flex pointer-events-none" style={{ top: WD_H, height: MOON_H }}>
                        {Array.from({ length: 31 }, (_, i) => {
                          const md = monthMoon[i]
                          if (!md) return <div key={i} style={{ width: DAY_W }} className="h-full" />
                          const bg = md.favor === 'above_ground' ? 'rgba(34,197,94,0.13)'
                                   : md.favor === 'below_ground' ? 'rgba(120,53,15,0.09)'
                                   : 'transparent'
                          return (
                            <div key={i} style={{ width: DAY_W, backgroundColor: bg }}
                              className="h-full flex items-center justify-center pointer-events-auto cursor-default"
                              title={`${i + 1}: ${md.icon} ${md.nameUk}`}
                            >
                              {md.isMajor
                                ? <span style={{ fontSize: 9, lineHeight: 1 }}>{md.icon}</span>
                                : <span style={{
                                    width: 5, height: 5, borderRadius: '50%', display: 'block',
                                    backgroundColor:
                                      md.favor === 'above_ground' ? 'rgba(34,197,94,0.55)'
                                      : md.favor === 'below_ground' ? 'rgba(120,53,15,0.35)'
                                      : 'rgba(0,0,0,0.08)',
                                  }} />
                              }
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Today vertical line */}
                    {isCurrent && (
                      <div className="absolute top-0 h-full w-px bg-red-400/70 z-10 pointer-events-none"
                        style={{ left: (todayDay - 0.5) * DAY_W }} />
                    )}

                    {/* Task bars */}
                    {segs.map(seg => {
                      const cfg      = TASK_CFG[seg.task.type]
                      const left     = (seg.startDay - 1) * DAY_W
                      const width    = Math.max((seg.endDay - seg.startDay + 1) * DAY_W - 1, DAY_W - 1)
                      const top      = WD_H + TOP_PAD + moonOff + seg.lane * (TASK_H + TASK_GAP)
                      const dragging = dragRef.current?.id === seg.cropId

                      const radius = seg.isFirst && seg.isLast ? '4px'
                        : seg.isFirst ? '4px 0 0 4px'
                        : seg.isLast  ? '0 4px 4px 0'
                        : '0'

                      // Lunar glow: check moon phase at midpoint day of this segment
                      const midIdx = Math.floor((seg.startDay + seg.endDay) / 2) - 1
                      const midMoon = showMoon ? monthMoon[midIdx] : undefined
                      const pref = lunarMap[seg.cropId]
                      const lunarMatch = midMoon && pref && pref !== 'any' && (midMoon.favor as string) === pref

                      // Ripeness (% of GDD to harvest) — only meaningful on harvest bars.
                      const ripe = seg.task.type === 'harvesting' ? Math.round((gddMap[seg.cropId] ?? 0) * 100) : null
                      // Crop hover highlight: emphasise the hovered crop, dim the rest.
                      const dim  = hoveredCrop !== null && hoveredCrop !== seg.cropId
                      const emph = hoveredCrop === seg.cropId

                      return (
                        <div key={seg.task.id + '-' + month}
                          onMouseDown={e => startDrag(e, seg.cropId)}
                          onMouseEnter={() => setHoveredCrop(seg.cropId)}
                          onMouseLeave={() => setHoveredCrop(null)}
                          title={`${seg.cropName}: ${cfg.label}\n${seg.task.start.toLocaleDateString('uk-UA')} – ${seg.task.end.toLocaleDateString('uk-UA')}${ripe ? `\nГотовність до збору: ${ripe}%` : ''}${lunarMatch ? `\n${midMoon?.icon} Сприятливий місячний день` : ''}`}
                          className={`absolute flex items-center gap-1 px-1.5 text-xs font-medium overflow-hidden z-10 transition-opacity ${dragging ? 'opacity-70 cursor-grabbing' : dim ? 'opacity-30 cursor-grab' : 'cursor-grab hover:brightness-95'}`}
                          style={{
                            left, width, top, height: TASK_H, borderRadius: radius,
                            backgroundColor: cropColors[seg.cropId], color: readableText(cropColors[seg.cropId]),
                            boxShadow: emph ? '0 0 0 1px rgba(43,97,23,0.9)'
                              : lunarMatch ? '0 0 0 2px rgba(34,197,94,0.75)'
                              : undefined,
                            zIndex: emph ? 20 : undefined,
                          }}
                        >
                          <span className="shrink-0 leading-none">{cfg.icon}</span>
                          {width > 60 && <span className="truncate leading-none">{seg.cropName} – {cfg.label}</span>}
                          {ripe !== null && ripe > 0 && width > 90 && (
                            <span className="ml-auto shrink-0 text-xs font-semibold opacity-90 leading-none" title="Готовність до збору врожаю">
                              🌡 {ripe}%
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

          </div>
        </div>

        {/* Floating "today" button — appears when current month scrolled away */}
        {showTodayFab && (
          <button onClick={goToToday}
            className="absolute bottom-5 right-5 z-40 flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-forest text-white text-sm font-bold shadow-lg hover:bg-forest-dark transition-colors">
            <span>📍</span> Сьогодні
          </button>
        )}
      </div>

      {/* ── Right calendar panel (Seedtime-style) ─────────────────────── */}
      <aside className={`flex-none bg-white border-l border-gray-200 overflow-hidden transition-all duration-200 ${switcherOpen ? 'w-72' : 'w-0'}`}>
        <div className="w-72 h-full flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
            <span className="font-black text-xs uppercase tracking-wide text-gray-700">Мої календарі</span>
            <button onClick={() => setSwitcherOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {calendars.map(c => (
              <div key={c.id}
                onClick={() => setActiveId(c.id)}
                className={`rounded-xl border-2 p-3 cursor-pointer transition-colors ${
                  c.id === activeId ? 'border-forest bg-forest/5' : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${c.id === activeId ? 'text-forest' : 'text-gray-300'}`}>●</span>
                  {editingId === c.id ? (
                    <>
                      <input
                        autoFocus value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onClick={e => e.stopPropagation()}
                        onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditingId(null) }}
                        onBlur={() => setEditingId(null)}
                        className="flex-1 min-w-0 text-sm font-semibold px-1.5 py-0.5 border border-forest rounded-md focus:outline-none"
                      />
                      <button
                        onMouseDown={e => { e.preventDefault(); e.stopPropagation(); commitRename() }}
                        title="Зберегти"
                        className="shrink-0 w-6 h-6 rounded-md bg-forest text-white flex items-center justify-center hover:bg-forest-dark text-sm leading-none"
                      >
                        ✓
                      </button>
                    </>
                  ) : (
                    <span className={`flex-1 text-sm font-semibold truncate ${c.id === activeId ? 'text-forest' : 'text-gray-700'}`}>{c.name}</span>
                  )}
                </div>
                {/* Non-active: static region · count */}
                {editingId !== c.id && c.id !== activeId && (
                  <div className="text-xs text-gray-400 mt-1 pl-5">{c.region_name ?? 'Без регіону'} · {c.variety_count} культур</div>
                )}

                {/* Active: editable region select + count */}
                {c.id === activeId && editingId !== c.id && (
                  <div className="mt-2 pl-5 space-y-2" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      {regionEditId === c.id ? (
                        <select
                          autoFocus
                          value={c.region_id ?? ''}
                          onChange={e => { changeRegion(c, e.target.value); setRegionEditId(null) }}
                          onBlur={() => setRegionEditId(null)}
                          className="flex-1 min-w-0 text-xs px-2 py-1 border border-forest rounded-lg bg-white focus:outline-none"
                        >
                          {!c.region_id && <option value="" disabled>Оберіть регіон</option>}
                          {regions.map(r => <option key={r.id} value={r.id}>{r.region}</option>)}
                        </select>
                      ) : (
                        <button
                          onClick={() => setRegionEditId(c.id)}
                          className="flex-1 min-w-0 text-left text-xs text-gray-500 hover:text-forest truncate"
                          title="Змінити регіон"
                        >
                          📍 {c.region_name ?? 'Оберіть регіон'}
                        </button>
                      )}
                      <span className="text-xs text-gray-400 shrink-0">{c.variety_count} культур</span>
                    </div>

                    {/* Calendar type — label, becomes select on click */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 shrink-0">Тип:</span>
                      {typeEditId === c.id ? (
                        <select
                          autoFocus
                          value={c.calendar_type || 'mixed'}
                          onChange={e => { changeType(c, e.target.value); setTypeEditId(null) }}
                          onBlur={() => setTypeEditId(null)}
                          className="flex-1 min-w-0 text-xs px-2 py-1 border border-forest rounded-lg bg-white focus:outline-none"
                        >
                          <option value="horod">🥕 Город</option>
                          <option value="sad">🌸 Сад</option>
                          <option value="mixed">🌿 Змішаний</option>
                        </select>
                      ) : (
                        <button
                          onClick={() => setTypeEditId(c.id)}
                          className="flex-1 min-w-0 text-left text-xs text-gray-500 hover:text-forest truncate"
                          title="Змінити тип календаря"
                        >
                          {CAL_TYPE_LABELS[c.calendar_type] ?? CAL_TYPE_LABELS.mixed}
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-2 mt-1 border-t border-gray-100">
                      <button onClick={e => { e.stopPropagation(); startRename(c) }} className="text-xs font-medium text-gray-500 hover:text-forest">Перейменувати</button>
                      {calendars.length > 1 && (
                        <button onClick={e => { e.stopPropagation(); deleteCalendar() }}
                          className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-1.5 py-0.5 rounded flex items-center gap-1"
                          title="Видалити календар">🗑 Видалити</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 p-2 shrink-0">
            {creating ? (
              <div className="space-y-2">
                <input
                  type="text" autoFocus placeholder="Назва календаря" value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full text-xs px-2.5 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-forest"
                />
                <select
                  value={newRegion} onChange={e => setNewRegion(e.target.value)}
                  className="w-full text-xs px-2.5 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-forest bg-white"
                >
                  <option value="">Регіон (як активний)</option>
                  {regions.map(r => <option key={r.id} value={r.id}>{r.region}</option>)}
                </select>
                <select
                  value={newType} onChange={e => setNewType(e.target.value)}
                  className="w-full text-xs px-2.5 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-forest bg-white"
                >
                  <option value="mixed">🌿 Змішаний</option>
                  <option value="horod">🥕 Город</option>
                  <option value="sad">🌸 Сад</option>
                </select>
                <div className="flex gap-2">
                  <button onClick={createCalendar} className="flex-1 text-xs font-bold py-2 rounded-lg bg-forest text-white hover:bg-forest-dark">Створити</button>
                  <button onClick={() => setCreating(false)} className="px-3 text-xs py-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">Скасувати</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-forest text-white text-sm font-bold hover:bg-forest-dark transition-colors"
              >
                <span className="text-base leading-none">+</span> Новий календар
              </button>
            )}
          </div>
        </div>
      </aside>
    </div>
  )
}
