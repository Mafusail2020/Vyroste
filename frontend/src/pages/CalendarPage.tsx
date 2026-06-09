import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'

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

const MONTHS_SHORT = ['Січ','Лют','Бер','Кві','Тра','Чер','Лип','Сер','Вер','Жов','Лис','Гру']
const MONTHS_FULL  = ['Січень','Лютий','Березень','Квітень','Травень','Червень',
                      'Липень','Серпень','Вересень','Жовтень','Листопад','Грудень']

const TASK_CFG: Record<TaskType, { label: string; icon: string; bg: string; fg: string }> = {
  seeding:       { label: 'Посів (розсада)',    icon: '🌱', bg: '#FDE68A', fg: '#78350F' },
  bed_prep:      { label: 'Підготовка ґрунту',  icon: '⛏️',  bg: '#D6D3D1', fg: '#1C1917' },
  transplanting: { label: 'Висадка',            icon: '🌿', bg: '#2B6117', fg: '#FFFFFF' },
  direct_sow:    { label: 'Прямий посів',       icon: '🌱', bg: '#22C55E', fg: '#FFFFFF' },
  cultivating:   { label: 'Догляд',             icon: '🔧', bg: '#86EFAC', fg: '#14532D' },
  harvesting:    { label: 'Збір врожаю',        icon: '🌾', bg: '#FB923C', fg: '#FFFFFF' },
}

const CROP_COLORS: Record<string, string> = {
  vegetable: '#2B6117', herb: '#0D9488', flower: '#EC4899', berry: '#DC2626', tree: '#78350F',
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

  const [windows,      setWindows]      = useState<CropWindow[]>([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')
  const [year,         setYear]         = useState(today.getFullYear())
  const [search,       setSearch]       = useState('')
  const [selectedId,   setSelectedId]   = useState<string | null>(null)
  const [hiddenTypes,  setHiddenTypes]  = useState<Set<TaskType>>(new Set())
  const [cropOffsets,  setCropOffsets]  = useState<Record<string, number>>({})
  const [sidebarOpen,  setSidebarOpen]  = useState(true)
  const [liveOff,      setLiveOff]      = useState<{ id: string; delta: number } | null>(null)

  const dragRef    = useRef<{ id: string; startX: number; base: number } | null>(null)
  const liveRef    = useRef<{ id: string; delta: number } | null>(null)

  useEffect(() => {
    api.get<CropWindow[]>('/api/calendar')
      .then(r => setWindows(r.data))
      .catch(e => setError(e?.response?.data?.detail ?? 'Помилка завантаження'))
      .finally(() => setLoading(false))
  }, [])

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
        setCropOffsets(p => ({ ...p, [id]: delta }))
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
  }

  function effectiveOffset(cropId: string) {
    return liveOff?.id === cropId ? liveOff.delta : (cropOffsets[cropId] ?? 0)
  }

  const visible = windows.filter(w => !search || w.crop_name.toLowerCase().includes(search.toLowerCase()))

  /* ── Early returns ────────────────────────────────────────────────────── */
  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-8 h-8 border-4 border-forest border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (error) return (
    <div className="max-w-xl mx-auto px-6 py-16 text-center text-red-600">{error}</div>
  )
  if (windows.length === 0) return (
    <div className="max-w-xl mx-auto px-6 py-16 text-center text-gray-500">
      Оберіть культури в <Link to="/onboarding" className="text-forest underline">налаштуваннях</Link>
    </div>
  )

  const gridMinW = LABEL_W + 31 * DAY_W

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden select-none bg-gray-50">

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
              {visible.map(w => (
                <button key={w.crop_id}
                  onClick={() => setSelectedId(selectedId === w.crop_id ? null : w.crop_id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition-colors ${selectedId === w.crop_id ? 'bg-forest/10 text-forest' : 'hover:bg-gray-50 text-gray-700'}`}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CROP_COLORS[w.crop_type] ?? '#2B6117' }} />
                  <span className="truncate font-medium">{w.crop_name}</span>
                  {w.lunar_preference === 'above_ground' && <span className="ml-auto text-gray-400">🌒</span>}
                  {w.lunar_preference === 'below_ground' && <span className="ml-auto text-gray-400">🌘</span>}
                </button>
              ))}
              <Link to="/onboarding" className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-forest hover:bg-forest/5 rounded-lg">
                <span className="font-bold text-lg leading-none">+</span>
                <span>Додати культуру</span>
              </Link>
            </div>

            {/* Task type filter */}
            <div className="border-t border-gray-100 px-2 py-2 space-y-0.5 shrink-0">
              <p className="text-xs text-gray-400 px-2 mb-1.5 uppercase tracking-wide">Фільтр задач</p>
              {(Object.entries(TASK_CFG) as [TaskType, typeof TASK_CFG[TaskType]][]).map(([type, cfg]) => (
                <button key={type}
                  onClick={() => setHiddenTypes(prev => { const n = new Set(prev); n.has(type) ? n.delete(type) : n.add(type); return n })}
                  className={`flex items-center gap-1.5 w-full px-2 py-0.5 rounded text-xs transition-opacity ${hiddenTypes.has(type) ? 'opacity-25' : 'opacity-100'}`}
                >
                  <span className="w-3 h-3 rounded-sm shrink-0 border border-black/10" style={{ backgroundColor: cfg.bg }} />
                  <span className="text-gray-600 truncate">{cfg.icon} {cfg.label}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </aside>

      {/* ── Main ──────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-200 shrink-0">
          <button onClick={() => setYear(today.getFullYear())}
            className="px-3 py-1 text-xs font-semibold border border-gray-300 rounded-lg hover:bg-gray-50">
            Сьогодні
          </button>
          <div className="flex items-center gap-1">
            <button onClick={() => setYear(y => y - 1)}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500 text-lg">‹</button>
            <span className="font-bold text-gray-800 w-12 text-center text-sm">{year}</span>
            <button onClick={() => setYear(y => y + 1)}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500 text-lg">›</button>
          </div>
          <span className="text-xs text-gray-400 border border-gray-200 rounded-lg px-2.5 py-1">12 місяців</span>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-gray-400 hidden sm:block">✋ Тягніть смугу для зміщення дат</span>
            {Object.keys(cropOffsets).length > 0 && (
              <button onClick={() => setCropOffsets({})}
                className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500">
                Скинути
              </button>
            )}
          </div>
        </div>

        {/* Scrollable grid */}
        <div className="flex-1 overflow-auto">
          <div style={{ minWidth: gridMinW }}>

            {/* ── Day number header — sticky top ─────────────────────── */}
            <div className="sticky top-0 z-30 flex border-b-2 border-gray-300 bg-white shadow-sm">
              <div className="shrink-0 border-r border-gray-200 bg-white" style={{ width: LABEL_W }} />
              <div className="flex">
                {Array.from({ length: 31 }, (_, i) => (
                  <div key={i + 1}
                    className={`border-l border-gray-100 text-center py-1 ${
                      today.getFullYear() === year && today.getDate() === i + 1 ? 'bg-yellow-50' : ''
                    }`}
                    style={{ width: DAY_W }}
                  >
                    <div className="text-xs font-bold text-gray-400">{i + 1}</div>
                  </div>
                ))}
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
              const segs  = assignLanes(rawSegs)
              const lanes = segs.length > 0 ? Math.max(...segs.map(s => s.lane)) + 1 : 0
              const rowH  = Math.max(40, TOP_PAD * 2 + lanes * (TASK_H + TASK_GAP))

              return (
                <div key={month} className={`flex border-b ${isCurrent ? 'border-forest/30' : 'border-gray-100'}`}
                  style={{ height: rowH }}>

                  {/* Month label — sticky left */}
                  <div className={`shrink-0 sticky left-0 z-10 flex flex-col items-end justify-start pr-3 pt-1.5 border-r border-gray-200 ${isCurrent ? 'bg-amber-50' : 'bg-white'}`}
                    style={{ width: LABEL_W }}>
                    <span className={`text-xs font-black uppercase ${isCurrent ? 'text-forest' : 'text-gray-400'}`}>
                      {MONTHS_SHORT[month]}
                    </span>
                    {isCurrent && <span className="text-xs text-forest/50">{year}</span>}
                  </div>

                  {/* Day grid */}
                  <div className="flex-1 relative" style={{ height: rowH }}>

                    {/* Cell backgrounds */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {Array.from({ length: 31 }, (_, i) => {
                        const day     = i + 1
                        const inMonth = day <= days
                        const isToday = isCurrent && day === todayDay
                        const weekend = inMonth && [0, 6].includes(new Date(year, month, day).getDay())
                        return (
                          <div key={day} style={{ width: DAY_W }}
                            className={`h-full border-l ${
                              isToday   ? 'bg-yellow-100 border-yellow-200' :
                              !inMonth  ? 'bg-gray-100/40 border-gray-50' :
                              weekend   ? 'bg-gray-50/60 border-gray-100' :
                                          'border-gray-100'
                            }`}
                          />
                        )
                      })}
                    </div>

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
                      const top      = TOP_PAD + seg.lane * (TASK_H + TASK_GAP)
                      const dragging = dragRef.current?.id === seg.cropId

                      const radius = seg.isFirst && seg.isLast ? '4px'
                        : seg.isFirst ? '4px 0 0 4px'
                        : seg.isLast  ? '0 4px 4px 0'
                        : '0'

                      return (
                        <div key={seg.task.id + '-' + month}
                          onMouseDown={e => startDrag(e, seg.cropId)}
                          title={`${seg.cropName}: ${cfg.label}\n${seg.task.start.toLocaleDateString('uk-UA')} – ${seg.task.end.toLocaleDateString('uk-UA')}`}
                          className={`absolute flex items-center gap-1 px-1.5 text-xs font-medium overflow-hidden z-10 ${dragging ? 'opacity-70 cursor-grabbing' : 'cursor-grab hover:brightness-95'}`}
                          style={{ left, width, top, height: TASK_H, borderRadius: radius, backgroundColor: cfg.bg, color: cfg.fg }}
                        >
                          <span className="shrink-0 leading-none">{cfg.icon}</span>
                          {width > 60 && <span className="truncate leading-none">{seg.cropName} – {cfg.label}</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* Month names footer */}
            <div className="flex border-t border-gray-200 bg-white/80">
              <div style={{ width: LABEL_W }} className="shrink-0 border-r border-gray-200" />
              <div className="flex-1 px-4 py-2 flex flex-wrap gap-x-6 gap-y-1">
                {MONTHS_FULL.map((m, i) => (
                  <span key={i} className="text-xs text-gray-400">{m}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
