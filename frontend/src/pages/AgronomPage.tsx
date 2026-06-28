import { useEffect, useRef, useState } from 'react'
import { toast } from 'react-hot-toast'
import { Plus } from 'lucide-react'
import api from '../lib/api'
import AgronomChat from '../components/AgronomChat'

interface Scan {
  id: string
  image_url: string | null
  crop: string
  diagnosis: string
  confidence: number
  severity: 'healthy' | 'low' | 'medium' | 'high'
  is_healthy: boolean
  steps: string[]
  timing: string
  prevention: string
  region_snapshot: string | null
  created_at: string
}

interface Cal { id: string; name: string; region_name: string | null }

const SEVERITY: Record<Scan['severity'], { label: string; ring: string; bg: string; text: string }> = {
  healthy: { label: 'Здорова',  ring: '#4B9F2F', bg: 'bg-green-50',  text: 'text-green-700'  },
  low:     { label: 'Легка',    ring: '#A3B83A', bg: 'bg-lime-50',   text: 'text-lime-700'   },
  medium:  { label: 'Середня',  ring: '#E0A028', bg: 'bg-amber-50',  text: 'text-amber-700'  },
  high:    { label: 'Серйозна', ring: '#DC2626', bg: 'bg-red-50',    text: 'text-red-700'    },
}

function ConfidenceRing({ value, color }: { value: number; color: string }) {
  return (
    <div className="relative w-16 h-16 shrink-0"
      style={{ borderRadius: '9999px', background: `conic-gradient(${color} ${value}%, #E5E7EB 0)` }}>
      <div className="absolute inset-[5px] rounded-full bg-white flex items-center justify-center">
        <span className="text-sm font-black text-gray-700">{value}%</span>
      </div>
    </div>
  )
}

function ResultCard({ scan }: { scan: Scan }) {
  const sev = SEVERITY[scan.severity] ?? SEVERITY.low
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Personalized banner — the data moat, made visible */}
      {scan.region_snapshot && (
        <div className="bg-forest/5 border-b border-forest/10 px-5 py-2.5 text-xs text-forest font-semibold flex items-center gap-2">
          <span>📍</span><span className="truncate">Поради для: {scan.region_snapshot}</span>
        </div>
      )}

      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          {scan.image_url && (
            <img src={scan.image_url} alt={scan.crop}
              className="w-24 h-24 rounded-xl object-cover border border-gray-100 shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wide text-gray-400 font-bold mb-0.5">{scan.crop || 'Рослина'}</p>
            <h2 className="text-xl font-black text-gray-800 leading-tight">{scan.diagnosis}</h2>
            <div className="mt-2 flex items-center gap-2">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${sev.bg} ${sev.text}`}>
                {scan.is_healthy ? '✓ Здорова рослина' : `Складність: ${sev.label}`}
              </span>
            </div>
          </div>
          <ConfidenceRing value={scan.confidence} color={sev.ring} />
        </div>

        {/* Treatment steps */}
        {scan.steps.length > 0 && (
          <div className="mt-6">
            <h3 className="text-xs font-black uppercase tracking-wide text-gray-400 mb-3">Що робити</h3>
            <ol className="space-y-2.5">
              {scan.steps.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-forest/10 text-forest text-xs font-black flex items-center justify-center mt-0.5">{i + 1}</span>
                  <span className="text-sm text-gray-700 leading-relaxed">{s}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Timing — the region/weather-aware kicker */}
        {scan.timing && (
          <div className="mt-5 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 flex gap-2.5">
            <span className="text-base leading-none mt-0.5">⏱</span>
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-amber-700 mb-0.5">Коли діяти</p>
              <p className="text-sm text-amber-900 leading-relaxed">{scan.timing}</p>
            </div>
          </div>
        )}

        {scan.prevention && (
          <div className="mt-4">
            <h3 className="text-xs font-black uppercase tracking-wide text-gray-400 mb-1.5">Профілактика</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{scan.prevention}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AgronomPage() {
  const [cals, setCals] = useState<Cal[]>([])
  const [calId, setCalId] = useState<string>('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  const [result, setResult] = useState<Scan | null>(null)
  const [history, setHistory] = useState<Scan[]>([])
  const [chatOpen, setChatOpen] = useState(false)
  const [seedScanId, setSeedScanId] = useState<string | null>(null)
  const [seedImage, setSeedImage] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.get<Cal[]>('/api/calendars').then(r => {
      setCals(r.data)
      if (r.data[0]) setCalId(r.data[0].id)
    }).catch(() => {})
    api.get<Scan[]>('/api/diagnose/history').then(r => setHistory(r.data)).catch(() => {})
  }, [])

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setResult(null)
    e.target.value = ''
  }

  async function diagnose() {
    if (!file) return
    setLoading(true)
    setResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      if (calId) fd.append('calendar_id', calId)
      const r = await api.post<Scan>('/api/diagnose', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setResult(r.data)
      setHistory(prev => [r.data, ...prev])
      setFile(null)
      setPreview(null)
      // Upload → diagnosis → chat auto-opens seeded with this scan → user keeps asking.
      setSeedImage(r.data.image_url)
      setSeedScanId(r.data.id)
      setChatOpen(true)
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { detail?: string } } }
      if (e.response?.status === 503) { setUnavailable(true); return }
      toast.error(e.response?.data?.detail ?? 'Не вдалось проаналізувати фото')
    } finally {
      setLoading(false)
    }
  }

  async function removeScan(id: string) {
    await api.delete(`/api/diagnose/${id}`).catch(() => {})
    setHistory(prev => prev.filter(s => s.id !== id))
    if (result?.id === id) setResult(null)
  }

  return (
    <>
    <div className={`max-w-3xl mx-auto px-6 py-12 transition-[margin] duration-300 ${chatOpen ? 'md:mr-[clamp(440px,50vw,760px)]' : ''}`}>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-forest uppercase mb-2">AI Агроном</h1>
        <p className="text-gray-500 max-w-xl">
          Сфотографуйте хвору рослину — штучний інтелект визначить проблему та дасть поради,
          підлаштовані під ваш регіон, погоду й культури.
        </p>
      </div>

      {unavailable ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <div className="text-5xl mb-4">🌱</div>
          <p className="font-bold text-gray-700">AI-агроном скоро буде доступний</p>
          <p className="text-sm text-gray-400 mt-1">Функція в активній розробці. Завітайте трохи згодом.</p>
        </div>
      ) : (
        <>
          {/* Uploader */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 mb-6">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full aspect-[16/9] rounded-xl border-2 border-dashed border-gray-200 hover:border-forest transition-colors flex items-center justify-center overflow-hidden bg-gray-50"
            >
              {preview
                ? <img src={preview} alt="Прев'ю" className="w-full h-full object-contain" />
                : <div className="text-center text-gray-400">
                    <div className="text-4xl mb-2">📸</div>
                    <p className="font-semibold text-gray-500">Завантажте або сфотографуйте рослину</p>
                    <p className="text-xs mt-1">JPEG, PNG · до 5 МБ</p>
                  </div>}
            </button>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={pick} className="hidden" />

            <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-center">
              {cals.length > 0 && (
                <select value={calId} onChange={e => setCalId(e.target.value)}
                  className="text-sm px-3 py-2.5 border-2 border-gray-200 rounded-xl bg-white focus:outline-none focus:border-forest sm:flex-1">
                  {cals.map(c => (
                    <option key={c.id} value={c.id}>{c.name}{c.region_name ? ` · ${c.region_name}` : ''}</option>
                  ))}
                </select>
              )}
              <button
                onClick={diagnose}
                disabled={!file || loading}
                className="px-6 py-2.5 rounded-xl bg-[#6E9150] text-white font-bold text-sm hover:bg-[#5e7d42] transition-colors disabled:opacity-40 flex items-center justify-center gap-2 sm:w-auto"
              >
                {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {loading ? 'Аналізую…' : 'Діагностувати'}
              </button>
            </div>
          </div>

          {result && (
            <div className="space-y-3">
              <ResultCard scan={result} />
              <button
                onClick={() => { setSeedImage(result.image_url); setSeedScanId(result.id); setChatOpen(true) }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white border-2 border-forest/30 text-forest font-bold text-sm hover:bg-forest/5 transition-colors"
              >
                💬 Запитати про цей діагноз
              </button>
            </div>
          )}

          {/* History */}
          {history.length > 0 && (
            <div className="mt-10">
              <h2 className="text-xs font-black uppercase tracking-wide text-gray-400 mb-3">Історія діагностик</h2>
              <div className="space-y-2">
                {history.map(s => (
                  <div key={s.id} className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-3 py-2.5">
                    {s.image_url
                      ? <img src={s.image_url} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0" />
                      : <div className="w-11 h-11 rounded-lg bg-card-green flex items-center justify-center shrink-0">🌿</div>}
                    <button onClick={() => setResult(s)} className="min-w-0 flex-1 text-left">
                      <p className="text-sm font-semibold text-gray-800 truncate">{s.diagnosis}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {s.crop} · {new Date(s.created_at).toLocaleDateString('uk-UA')}
                      </p>
                    </button>
                    <button onClick={() => removeScan(s.id)} className="text-xs text-red-400 hover:text-red-600 shrink-0">Видалити</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>

    {/* Floating toggle — shifts left with the panel when open */}
    <button
      onClick={() => setChatOpen(o => !o)}
      className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#6E9150] text-white shadow-xl hover:bg-[#5e7d42] hover:scale-105 grid place-items-center transition-all duration-300 ${chatOpen ? 'md:-translate-x-[clamp(440px,50vw,760px)] max-md:hidden' : ''}`}
      aria-label="AI Агроном чат"
    >
      <Plus className={`w-7 h-7 transition-transform duration-300 ${chatOpen ? 'rotate-45' : ''}`} strokeWidth={3} />
    </button>

    <AgronomChat
      open={chatOpen}
      onClose={() => setChatOpen(false)}
      calendarId={calId || undefined}
      seedScanId={seedScanId}
      seedImage={seedImage}
      onSeedHandled={() => setSeedScanId(null)}
    />
    </>
  )
}
