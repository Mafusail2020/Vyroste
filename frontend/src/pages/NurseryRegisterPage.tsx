import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'react-hot-toast'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import * as L from 'leaflet'
import { type JSONContent } from '@tiptap/react'
import {
  ArrowLeft, Sprout, MapPin, Tags, Phone, Images, Globe, Video, Coins,
  UploadCloud, X, Loader2, Check, Plus, Trash2,
} from 'lucide-react'
import api from '../lib/api'
import TipTapEditor from '../components/TipTapEditor'
import { renderArticleHtml } from '../lib/tiptap'

/* ─── Validation schema ──────────────────────────────────────────────────── */

const urlOpt = z.string().url('Невірне посилання').optional().or(z.literal(''))

const nurserySchema = z.object({
  name: z.string().min(3, 'Назва надто коротка'),
  address: z.string().min(5, 'Введіть повну адресу'),
  categories: z.array(z.string()).min(1, 'Оберіть хоча б одну категорію'),
  phone: z.string().regex(/^\+380\d{9}$/, 'Формат: +380XXXXXXXXX'),
  website: urlOpt,
  youtube: urlOpt,
  facebook: urlOpt,
  instagram: urlOpt,
  photos: z.any(),
})

type NurseryForm = z.infer<typeof nurserySchema>

/* ─── Static data + types ────────────────────────────────────────────────── */

const CATEGORIES = [
  { value: 'овочі',  label: 'Овочі',  icon: '🥕' },
  { value: 'квіти',  label: 'Квіти',  icon: '🌸' },
  { value: 'ягоди',  label: 'Ягоди',  icon: '🍓' },
  { value: 'дерева', label: 'Дерева', icon: '🌳' },
  { value: 'крафт',  label: 'Крафт',  icon: '🧺' },
] as const

const MAX_PHOTOS = 5
const MAX_BYTES = 2 * 1024 * 1024 // 2 MB

interface PhotoItem { file: File; url: string }
interface GeoResult { lat: string; lon: string; display_name: string }
interface PriceRow { name: string; age: string; price: string }
interface PriceSection { name: string; rows: PriceRow[] }

/* ─── Map picker helpers ─────────────────────────────────────────────────── */

const UA_CENTER: [number, number] = [49.0, 32.0]

const PIN_ICON = L.divIcon({
  html: '<div style="font-size:30px;line-height:1;transform:translateY(-2px);filter:drop-shadow(0 2px 3px rgba(0,0,0,.4))">📍</div>',
  className: '', iconSize: [30, 30], iconAnchor: [15, 30],
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

/* ─── Card shell ─────────────────────────────────────────────────────────── */

function Card({ icon, title, hint, children }: {
  icon: React.ReactNode; title: string; hint?: string; children: React.ReactNode
}) {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-7">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-forest/10 text-forest flex items-center justify-center shrink-0">{icon}</div>
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

function SocialInput({ icon, label, ...rest }: { icon: React.ReactNode; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5">{icon} {label}</label>
      <input className={inputBase} {...rest} />
    </div>
  )
}

/* ─── Component ──────────────────────────────────────────────────────────── */

export default function NurseryRegisterPage() {
  const navigate = useNavigate()
  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [dragging, setDragging] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const [descDoc, setDescDoc] = useState<JSONContent | null>(null)
  const [videosText, setVideosText] = useState('')
  const [prices, setPrices] = useState<PriceSection[]>([])

  const [lat, setLat] = useState<number | null>(null)
  const [lon, setLon] = useState<number | null>(null)
  const [geoMsg, setGeoMsg] = useState('')

  const {
    register, handleSubmit, control, setValue, getValues, formState: { errors },
  } = useForm<NurseryForm>({
    resolver: zodResolver(nurserySchema),
    defaultValues: {
      name: '', address: '', categories: [], phone: '+380',
      website: '', youtube: '', facebook: '', instagram: '', photos: [],
    },
  })

  /* ── Geocode ── */
  async function geocode() {
    const address = (getValues('address') || '').trim()
    if (address.length < 3) { setGeoMsg('Введіть адресу спочатку'); return }
    setGeoMsg('')
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address + ', Україна')}&format=json&limit=1&countrycodes=ua&accept-language=uk`
      const data: GeoResult[] = await (await fetch(url)).json()
      if (data[0]) { setLat(parseFloat(data[0].lat)); setLon(parseFloat(data[0].lon)); setGeoMsg(`✓ ${data[0].display_name}`) }
      else setGeoMsg('Адресу не знайдено. Уточніть написання.')
    } catch { setGeoMsg('Помилка пошуку. Перевірте з\'єднання.') }
  }

  async function pickPoint(la: number, lo: number) {
    setLat(la); setLon(lo)
    try {
      const d = await (await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${la}&lon=${lo}&format=json&accept-language=uk`)).json()
      if (d.display_name) { setValue('address', d.display_name, { shouldValidate: true }); setGeoMsg(`✓ ${d.display_name}`) }
    } catch { /* keep coords */ }
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

  /* ── Price editor ── */
  const addSection = () => setPrices(p => [...p, { name: '', rows: [{ name: '', age: '', price: '' }] }])
  const removeSection = (si: number) => setPrices(p => p.filter((_, i) => i !== si))
  const setSectionName = (si: number, v: string) => setPrices(p => p.map((s, i) => i === si ? { ...s, name: v } : s))
  const addRow = (si: number) => setPrices(p => p.map((s, i) => i === si ? { ...s, rows: [...s.rows, { name: '', age: '', price: '' }] } : s))
  const removeRow = (si: number, ri: number) => setPrices(p => p.map((s, i) => i === si ? { ...s, rows: s.rows.filter((_, j) => j !== ri) } : s))
  const setRow = (si: number, ri: number, f: keyof PriceRow, v: string) =>
    setPrices(p => p.map((s, i) => i === si ? { ...s, rows: s.rows.map((r, j) => j === ri ? { ...r, [f]: v } : r) } : s))

  /* ── Submit ── */
  const onSubmit = async (data: NurseryForm) => {
    if (lat === null || lon === null) { toast.error('Вкажіть адресу та натисніть «Знайти»'); return }
    setSubmitting(true)
    try {
      // Upload photos → URLs.
      const photoUrls: string[] = []
      for (const p of photos) {
        const fd = new FormData(); fd.append('file', p.file)
        const r = await api.post<{ url: string }>('/api/nurseries/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        photoUrls.push(r.data.url)
      }

      const videos = videosText.split('\n').map(s => s.trim()).filter(Boolean)
      const priceSections = prices
        .map(s => ({ name: s.name.trim(), rows: s.rows.filter(r => r.name.trim()).map(r => ({ name: r.name.trim(), age: r.age.trim(), price: r.price.trim() })) }))
        .filter(s => s.name && s.rows.length)

      await api.post('/api/nurseries', {
        name: data.name.trim(),
        description: renderArticleHtml(descDoc) || null,
        address: data.address.trim(),
        latitude: lat,
        longitude: lon,
        phone: data.phone,
        website: data.website || null,
        youtube: data.youtube || null,
        facebook: data.facebook || null,
        instagram: data.instagram || null,
        tags: data.categories,
        photos: photoUrls,
        videos,
        price_sections: priceSections,
      })
      setDone(true)
    } catch {
      toast.error('Помилка надсилання. Спробуйте ще раз.')
    } finally {
      setSubmitting(false)
    }
  }

  /* ── Success ── */
  if (done) return (
    <div className="max-w-xl mx-auto px-6 py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-forest/10 text-forest flex items-center justify-center mx-auto mb-5"><Check className="w-8 h-8" /></div>
      <h2 className="text-2xl font-black text-forest uppercase mb-3">Заявку надіслано!</h2>
      <p className="text-gray-500 mb-8">Ваш розсадник відправлено на перевірку. Ми зв'яжемось з вами протягом 3 робочих днів.</p>
      <button onClick={() => navigate('/map')} className="px-6 py-2.5 rounded-xl bg-[#6E9150] text-white font-bold text-sm uppercase hover:bg-[#5e7d42] transition-colors">До мапи</button>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 pb-16">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" /> Назад
        </button>
        <h1 className="text-2xl font-black text-forest uppercase">Додати розсадник</h1>
      </div>
      <p className="text-sm text-gray-500 mb-8">Після перевірки адміністратором ваш розсадник з'явиться на карті.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>

        {/* ── Основна інформація (rich description) ── */}
        <Card icon={<Sprout className="w-5 h-5" />} title="Основна інформація">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Назва <span className="text-red-400">*</span></label>
          <input {...register('name')} placeholder="Садовий центр «Зелена садиба»" className={inputBase} />
          <FieldError msg={errors.name?.message} />

          <div className="mt-4">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Опис <span className="font-normal text-gray-400">необов'язково · форматування, зображення</span>
            </label>
            <TipTapEditor
              initialContent={null}
              onChange={setDescDoc}
              uploadUrl="/api/nurseries/upload"
              placeholder="Розкажіть про асортимент, спеціалізацію, доставку, гарантії…"
            />
          </div>
        </Card>

        {/* ── Локація ── */}
        <Card icon={<MapPin className="w-5 h-5" />} title="Локація" hint="Знайдіть адресу або вкажіть точку на карті">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Адреса <span className="text-red-400">*</span></label>
          <input {...register('address')} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); geocode() } }}
            placeholder="вул. Садова, 12, Київ" className={inputBase} />
          <FieldError msg={errors.address?.message} />
          {geoMsg && <p className={`mt-2 text-xs ${geoMsg.startsWith('✓') ? 'text-forest' : 'text-amber-600'}`}>{geoMsg}</p>}

          <p className="mt-3 mb-1.5 text-xs text-gray-400">📍 Натисніть на карту або перетягніть маркер, щоб уточнити місце</p>
          <div className="rounded-xl overflow-hidden border border-gray-200" style={{ height: 280 }}>
            <MapContainer center={UA_CENTER} zoom={5} style={{ height: '100%', width: '100%' }}>
              <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <MapClick onPick={pickPoint} />
              <Recenter lat={lat} lon={lon} />
              {lat !== null && lon !== null && (
                <Marker position={[lat, lon]} icon={PIN_ICON} draggable
                  eventHandlers={{ dragend: e => { const m = e.target.getLatLng(); pickPoint(m.lat, m.lng) } }} />
              )}
            </MapContainer>
          </div>
          {lat !== null && lon !== null && <p className="mt-2 text-xs text-gray-400 font-mono">{lat.toFixed(5)}, {lon.toFixed(5)}</p>}
        </Card>

        {/* ── Спеціалізація ── */}
        <Card icon={<Tags className="w-5 h-5" />} title="Спеціалізація" hint="Оберіть, що ви вирощуєте">
          <Controller control={control} name="categories" render={({ field }) => (
            <div className="flex flex-wrap gap-2.5">
              {CATEGORIES.map(c => {
                const active = field.value.includes(c.value)
                return (
                  <button key={c.value} type="button"
                    onClick={() => field.onChange(active ? field.value.filter(v => v !== c.value) : [...field.value, c.value])}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full border-2 text-sm font-semibold transition-all ${
                      active ? 'border-forest bg-forest/5 text-forest shadow-sm' : 'border-gray-200 bg-white text-gray-600 hover:border-forest/40'
                    }`}>
                    <span>{c.icon}</span> {c.label}{active && <Check className="w-3.5 h-3.5" />}
                  </button>
                )
              })}
            </div>
          )} />
          <FieldError msg={errors.categories?.message} />
        </Card>

        {/* ── Контакти + соцмережі ── */}
        <Card icon={<Phone className="w-5 h-5" />} title="Контакти та соцмережі">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Телефон <span className="text-red-400">*</span></label>
          <Controller control={control} name="phone" render={({ field }) => {
            const digits = (field.value || '').replace(/^\+380/, '').replace(/\D/g, '').slice(0, 9)
            return (
              <div className="flex items-center rounded-xl border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-forest/25 focus-within:border-forest transition">
                <span className="px-3 py-2.5 bg-gray-50 text-gray-500 text-sm font-medium border-r border-gray-200 select-none">+380</span>
                <input inputMode="numeric" value={digits}
                  onChange={e => field.onChange('+380' + e.target.value.replace(/\D/g, '').slice(0, 9))}
                  placeholder="50 123 45 67" className="flex-1 px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none" />
              </div>
            )
          }} />
          <FieldError msg={errors.phone?.message} />

          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <SocialInput icon={<Globe className="w-4 h-4 text-gray-400" />} label="Сайт" {...register('website')} placeholder="https://site.ua" />
            <SocialInput icon={<span>▶️</span>} label="YouTube" {...register('youtube')} placeholder="https://youtube.com/@…" />
            <SocialInput icon={<span>📘</span>} label="Facebook" {...register('facebook')} placeholder="https://facebook.com/…" />
            <SocialInput icon={<span>📸</span>} label="Instagram" {...register('instagram')} placeholder="https://instagram.com/…" />
          </div>
          <div className="text-xs text-red-500 mt-1 space-y-0.5">
            {errors.website && <p>Сайт: {errors.website.message}</p>}
            {errors.youtube && <p>YouTube: {errors.youtube.message}</p>}
            {errors.facebook && <p>Facebook: {errors.facebook.message}</p>}
            {errors.instagram && <p>Instagram: {errors.instagram.message}</p>}
          </div>
        </Card>

        {/* ── Фотографії ── */}
        <Card icon={<Images className="w-5 h-5" />} title="Фотографії" hint={`До ${MAX_PHOTOS} фото, макс 2 МБ кожне`}>
          <label
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }}
            className={`flex flex-col items-center justify-center gap-2 px-6 py-9 rounded-2xl border-2 border-dashed cursor-pointer transition-colors ${
              dragging ? 'border-forest bg-forest/5' : 'border-gray-200 hover:border-forest/40 bg-gray-50/50'
            }`}>
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

        {/* ── Відео ── */}
        <Card icon={<Video className="w-5 h-5" />} title="Відео" hint="Посилання на YouTube або .mp4 — по одному на рядок">
          <textarea value={videosText} onChange={e => setVideosText(e.target.value)} rows={3}
            placeholder={'https://youtube.com/watch?v=…\nhttps://…/clip.mp4'}
            className={`${inputBase} resize-none font-mono text-xs`} />
        </Card>

        {/* ── Ціни (optional) ── */}
        <Card icon={<Coins className="w-5 h-5" />} title="Ціни" hint="Необов'язково — якщо додасте, з'явиться таблиця на сторінці">
          {prices.length === 0 && <p className="text-sm text-gray-400 mb-3">Прайс не додано.</p>}
          <div className="space-y-4">
            {prices.map((sec, si) => (
              <div key={si} className="border border-gray-200 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <input value={sec.name} onChange={e => setSectionName(si, e.target.value)}
                    placeholder="Назва розділу (напр. Яблуні)"
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold focus:outline-none focus:border-forest" />
                  <button type="button" onClick={() => removeSection(si)}
                    className="w-8 h-8 rounded-lg text-red-400 hover:bg-red-50 flex items-center justify-center shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-1.5">
                  {sec.rows.map((row, ri) => (
                    <div key={ri} className="flex gap-1.5">
                      <input value={row.name} onChange={e => setRow(si, ri, 'name', e.target.value)} placeholder="Назва товару"
                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-forest" />
                      <input value={row.age} onChange={e => setRow(si, ri, 'age', e.target.value)} placeholder="2 роки"
                        className="w-24 px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-forest" />
                      <input value={row.price} onChange={e => setRow(si, ri, 'price', e.target.value)} placeholder="100 грн"
                        className="w-24 px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-forest" />
                      <button type="button" onClick={() => removeRow(si, ri)}
                        className="w-8 shrink-0 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 flex items-center justify-center">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => addRow(si)}
                    className="flex items-center gap-1 text-xs font-semibold text-forest hover:underline mt-1">
                    <Plus className="w-3.5 h-3.5" /> Додати позицію
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={addSection}
            className="mt-3 flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 border-dashed border-gray-200 text-sm font-semibold text-gray-500 hover:border-forest/40 hover:text-forest transition-colors">
            <Plus className="w-4 h-4" /> Додати розділ цін
          </button>
        </Card>

        {/* ── Actions ── */}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => navigate(-1)}
            className="px-5 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:border-gray-300 transition-colors">
            Скасувати
          </button>
          <button type="submit" disabled={submitting}
            className="flex items-center gap-2 px-7 py-3 rounded-xl bg-[#6E9150] text-white font-black text-sm uppercase tracking-wide hover:bg-[#5e7d42] transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? 'Збереження…' : 'Надіслати на перевірку'}
          </button>
        </div>
      </form>
    </div>
  )
}
