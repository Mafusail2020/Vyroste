import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'react-hot-toast'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import * as L from 'leaflet'
import {
  ArrowLeft, Sprout, MapPin, Tags, Phone, Images,
  UploadCloud, X, Loader2, Check,
} from 'lucide-react'
import api from '../lib/api'

/* ─── Validation schema ──────────────────────────────────────────────────── */

const nurserySchema = z.object({
  name: z.string().min(3, 'Назва надто коротка'),
  description: z.string().max(500, 'Опис не може перевищувати 500 символів'),
  address: z.string().min(5, 'Введіть повну адресу'),
  categories: z.array(z.string()).min(1, 'Оберіть хоча б одну категорію'),
  phone: z.string().regex(/^\+380\d{9}$/, 'Формат: +380XXXXXXXXX'),
  instagram: z.string().url('Невірний формат посилання').optional().or(z.literal('')),
  photos: z.any(),
})

type NurseryForm = z.infer<typeof nurserySchema>

/* ─── Static data ────────────────────────────────────────────────────────── */

const CATEGORIES = [
  { value: 'овочі',  label: 'Овочі',  icon: '🥕' },
  { value: 'квіти',  label: 'Квіти',  icon: '🌸' },
  { value: 'ягоди',  label: 'Ягоди',  icon: '🍓' },
  { value: 'дерева', label: 'Дерева', icon: '🌳' },
  { value: 'крафт',  label: 'Крафт',  icon: '🧺' },
] as const

const MAX_PHOTOS = 5
const MAX_BYTES = 2 * 1024 * 1024 // 2 MB
const DESC_LIMIT = 500

interface PhotoItem {
  file: File
  url: string
}

interface GeoResult { lat: string; lon: string; display_name: string }

/* ─── Map picker helpers ─────────────────────────────────────────────────── */

const UA_CENTER: [number, number] = [49.0, 32.0]

const PIN_ICON = L.divIcon({
  html: '<div style="font-size:30px;line-height:1;transform:translateY(-2px);filter:drop-shadow(0 2px 3px rgba(0,0,0,.4))">📍</div>',
  className: '',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
})

function MapClick({ onPick }: { onPick: (lat: number, lon: number) => void }) {
  useMapEvents({ click: e => onPick(e.latlng.lat, e.latlng.lng) })
  return null
}

function Recenter({ lat, lon }: { lat: number | null; lon: number | null }) {
  const map = useMap()
  useEffect(() => {
    if (lat !== null && lon !== null) map.flyTo([lat, lon], 14, { duration: 0.8 })
  }, [lat, lon, map])
  return null
}

/* ─── Reusable card shell ────────────────────────────────────────────────── */

function Card({ icon, title, hint, children }: {
  icon: React.ReactNode
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-7">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-forest/10 text-forest flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div>
          <h2 className="font-bold text-gray-800 leading-tight">{title}</h2>
          {hint && <p className="text-xs text-gray-400">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

const inputBase =
  'w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder:text-gray-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-forest/25 focus:border-forest transition'

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="mt-1.5 text-xs text-red-500">{msg}</p>
}

/* ─── Component ──────────────────────────────────────────────────────────── */

export default function NurseryRegisterPage() {
  const navigate = useNavigate()
  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [dragging, setDragging] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  // Geocoding (client-side Nominatim, like the original «Знайти» flow).
  const [lat, setLat] = useState<number | null>(null)
  const [lon, setLon] = useState<number | null>(null)
  const [geoMsg, setGeoMsg] = useState('')

  const {
    register, handleSubmit, control, watch, setValue, getValues, formState: { errors },
  } = useForm<NurseryForm>({
    resolver: zodResolver(nurserySchema),
    defaultValues: {
      name: '', description: '', address: '', categories: [], phone: '+380', instagram: '', photos: [],
    },
  })

  const descLen = watch('description')?.length ?? 0

  /* ── Geocode ── */
  async function geocode() {
    const address = (getValues('address') || '').trim()
    if (address.length < 3) { setGeoMsg('Введіть адресу спочатку'); return }
    setGeoMsg('')
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address + ', Україна')}&format=json&limit=1&countrycodes=ua&accept-language=uk`
      const data: GeoResult[] = await (await fetch(url)).json()
      if (data[0]) {
        setLat(parseFloat(data[0].lat)); setLon(parseFloat(data[0].lon))
        setGeoMsg(`✓ ${data[0].display_name}`)
      } else {
        setGeoMsg('Адресу не знайдено. Уточніть написання.')
      }
    } catch {
      setGeoMsg('Помилка пошуку. Перевірте з\'єднання.')
    }
  }

  /* ── Pick a point on the map → set coords + reverse-geocode the address ── */
  async function pickPoint(la: number, lo: number) {
    setLat(la); setLon(lo)
    try {
      const d = await (await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${la}&lon=${lo}&format=json&accept-language=uk`,
      )).json()
      if (d.display_name) {
        setValue('address', d.display_name, { shouldValidate: true })
        setGeoMsg(`✓ ${d.display_name}`)
      }
    } catch { /* keep manual coords even if reverse-geocode fails */ }
  }

  /* ── Photos ── */
  function addFiles(list: FileList | File[]) {
    const accepted: PhotoItem[] = []
    for (const f of Array.from(list)) {
      if (!f.type.startsWith('image/')) { toast.error(`«${f.name}» — не зображення`); continue }
      if (f.size > MAX_BYTES) { toast.error(`«${f.name}» більше 2 МБ`); continue }
      accepted.push({ file: f, url: URL.createObjectURL(f) })
    }
    setPhotos(prev => {
      if (prev.length + accepted.length > MAX_PHOTOS) toast.error(`Максимум ${MAX_PHOTOS} фото`)
      const next = [...prev, ...accepted].slice(0, MAX_PHOTOS)
      setValue('photos', next.map(p => p.file))
      return next
    })
  }

  function removePhoto(idx: number) {
    setPhotos(prev => {
      URL.revokeObjectURL(prev[idx].url)
      const next = prev.filter((_, i) => i !== idx)
      setValue('photos', next.map(p => p.file))
      return next
    })
  }

  /* ── Submit ── */
  const onSubmit = async (data: NurseryForm) => {
    if (lat === null || lon === null) {
      toast.error('Вкажіть адресу та натисніть «Знайти»')
      return
    }
    setSubmitting(true)
    try {
      // 1. Upload photos → Supabase Storage, collect public URLs.
      const photoUrls: string[] = []
      for (const p of photos) {
        const fd = new FormData()
        fd.append('file', p.file)
        const r = await api.post<{ url: string }>('/api/nurseries/upload', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        photoUrls.push(r.data.url)
      }

      // 2. Create the nursery (pending verification).
      const payload = {
        name: data.name.trim(),
        description: data.description.trim() || null,
        address: data.address.trim(),
        latitude: lat,
        longitude: lon,
        phone: data.phone,
        website: data.instagram || null,
        tags: data.categories,
        photos: photoUrls,
      }
      console.log('Nursery registration payload →', JSON.stringify(payload, null, 2))
      await api.post('/api/nurseries', payload)
      setDone(true)
    } catch {
      toast.error('Помилка надсилання. Спробуйте ще раз.')
    } finally {
      setSubmitting(false)
    }
  }

  /* ── Success screen ── */
  if (done) return (
    <div className="max-w-xl mx-auto px-6 py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-forest/10 text-forest flex items-center justify-center mx-auto mb-5">
        <Check className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-black text-forest uppercase mb-3">Заявку надіслано!</h2>
      <p className="text-gray-500 mb-8">
        Ваш розсадник відправлено на перевірку. Ми зв'яжемось з вами протягом 3 робочих днів.
      </p>
      <button onClick={() => navigate('/map')}
        className="px-6 py-2.5 rounded-xl bg-forest text-white font-bold text-sm uppercase hover:bg-forest-dark transition-colors">
        До мапи
      </button>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 pb-16">

      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" /> Назад
        </button>
        <h1 className="text-2xl font-black text-forest uppercase">Додати розсадник</h1>
      </div>
      <p className="text-sm text-gray-500 mb-8">Після перевірки адміністратором ваш розсадник з'явиться на карті.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>

        {/* ── Card 1: Основна інформація ── */}
        <Card icon={<Sprout className="w-5 h-5" />} title="Основна інформація">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Назва <span className="text-red-400">*</span>
          </label>
          <input {...register('name')} placeholder="Садовий центр «Зелена садиба»" className={inputBase} />
          <FieldError msg={errors.name?.message} />

          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-semibold text-gray-700">
                Опис <span className="font-normal text-gray-400">необов'язково</span>
              </label>
              <span className={`text-xs ${descLen > DESC_LIMIT ? 'text-red-500' : 'text-gray-400'}`}>
                {descLen}/{DESC_LIMIT}
              </span>
            </div>
            <textarea {...register('description')} rows={3} placeholder="Розкажіть про асортимент, спеціалізацію, особливості…"
              className={`${inputBase} resize-none`} />
            <FieldError msg={errors.description?.message} />
          </div>
        </Card>

        {/* ── Card 2: Локація ── */}
        <Card icon={<MapPin className="w-5 h-5" />} title="Локація" hint="Знайдіть адресу або вкажіть точку на карті">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Адреса <span className="text-red-400">*</span>
          </label>
          <input
            {...register('address')}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); geocode() } }}
            placeholder="вул. Садова, 12, Київ"
            className={inputBase}
          />
          <FieldError msg={errors.address?.message} />
          {geoMsg && (
            <p className={`mt-2 text-xs ${geoMsg.startsWith('✓') ? 'text-forest' : 'text-amber-600'}`}>{geoMsg}</p>
          )}

          {/* Interactive picker: click or drag the marker to set the exact point */}
          <p className="mt-3 mb-1.5 text-xs text-gray-400">📍 Натисніть на карту або перетягніть маркер, щоб уточнити місце</p>
          <div className="rounded-xl overflow-hidden border border-gray-200" style={{ height: 280 }}>
            <MapContainer center={UA_CENTER} zoom={5} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapClick onPick={pickPoint} />
              <Recenter lat={lat} lon={lon} />
              {lat !== null && lon !== null && (
                <Marker
                  position={[lat, lon]}
                  icon={PIN_ICON}
                  draggable
                  eventHandlers={{ dragend: e => { const m = e.target.getLatLng(); pickPoint(m.lat, m.lng) } }}
                />
              )}
            </MapContainer>
          </div>
          {lat !== null && lon !== null && (
            <p className="mt-2 text-xs text-gray-400 font-mono">{lat.toFixed(5)}, {lon.toFixed(5)}</p>
          )}
        </Card>

        {/* ── Card 3: Спеціалізація ── */}
        <Card icon={<Tags className="w-5 h-5" />} title="Спеціалізація" hint="Оберіть, що ви вирощуєте">
          <Controller
            control={control}
            name="categories"
            render={({ field }) => (
              <div className="flex flex-wrap gap-2.5">
                {CATEGORIES.map(c => {
                  const active = field.value.includes(c.value)
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => field.onChange(
                        active ? field.value.filter(v => v !== c.value) : [...field.value, c.value]
                      )}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-full border-2 text-sm font-semibold transition-all ${
                        active
                          ? 'border-forest bg-forest/5 text-forest shadow-sm'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-forest/40'
                      }`}
                    >
                      <span>{c.icon}</span> {c.label}
                      {active && <Check className="w-3.5 h-3.5" />}
                    </button>
                  )
                })}
              </div>
            )}
          />
          <FieldError msg={errors.categories?.message} />
        </Card>

        {/* ── Card 4: Контакти ── */}
        <Card icon={<Phone className="w-5 h-5" />} title="Контакти">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Телефон <span className="text-red-400">*</span></label>
          <Controller
            control={control}
            name="phone"
            render={({ field }) => {
              const digits = (field.value || '').replace(/^\+380/, '').replace(/\D/g, '').slice(0, 9)
              return (
                <div className="flex items-center rounded-xl border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-forest/25 focus-within:border-forest transition">
                  <span className="px-3 py-2.5 bg-gray-50 text-gray-500 text-sm font-medium border-r border-gray-200 select-none">+380</span>
                  <input
                    inputMode="numeric"
                    value={digits}
                    onChange={e => field.onChange('+380' + e.target.value.replace(/\D/g, '').slice(0, 9))}
                    placeholder="50 123 45 67"
                    className="flex-1 px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none"
                  />
                </div>
              )
            }}
          />
          <FieldError msg={errors.phone?.message} />

          <div className="mt-4">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Instagram / Сайт <span className="font-normal text-gray-400">необов'язково</span>
            </label>
            <input {...register('instagram')} placeholder="https://instagram.com/moirozsiady" className={inputBase} />
            <FieldError msg={errors.instagram?.message} />
          </div>
        </Card>

        {/* ── Card 5: Фотографії ── */}
        <Card icon={<Images className="w-5 h-5" />} title="Фотографії" hint={`До ${MAX_PHOTOS} фото, макс 2 МБ кожне`}>
          <label
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }}
            className={`flex flex-col items-center justify-center gap-2 px-6 py-9 rounded-2xl border-2 border-dashed cursor-pointer transition-colors ${
              dragging ? 'border-forest bg-forest/5' : 'border-gray-200 hover:border-forest/40 bg-gray-50/50'
            }`}
          >
            <UploadCloud className={`w-8 h-8 ${dragging ? 'text-forest' : 'text-gray-400'}`} />
            <p className="text-sm font-semibold text-gray-600">Перетягніть фото сюди або натисніть</p>
            <p className="text-xs text-gray-400">Завантажте до {MAX_PHOTOS} фото, макс 2МБ · JPG, PNG</p>
            <input type="file" accept="image/*" multiple hidden
              onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = '' }} />
          </label>

          {photos.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-4">
              {photos.map((p, i) => (
                <div key={p.url} className="relative aspect-square rounded-xl overflow-hidden border border-gray-100 group">
                  <img src={p.url} alt={p.file.name} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <p className="mt-3 text-xs text-gray-400">{photos.length}/{MAX_PHOTOS} обрано</p>
        </Card>

        {/* ── Actions ── */}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => navigate(-1)}
            className="px-5 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:border-gray-300 transition-colors">
            Скасувати
          </button>
          <button type="submit" disabled={submitting}
            className="flex items-center gap-2 px-7 py-3 rounded-xl bg-forest text-white font-black text-sm uppercase tracking-wide hover:bg-forest-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? 'Збереження…' : 'Надіслати на перевірку'}
          </button>
        </div>
      </form>
    </div>
  )
}
