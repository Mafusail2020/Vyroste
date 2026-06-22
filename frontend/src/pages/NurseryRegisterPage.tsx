import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import api from '../lib/api'

interface Region {
  id: string
  region: string
  city: string
}

interface GeoResult {
  lat: string
  lon: string
  display_name: string
}

export default function NurseryRegisterPage() {
  const navigate = useNavigate()

  const [regions,     setRegions]     = useState<Region[]>([])
  const [name,        setName]        = useState('')
  const [description, setDescription] = useState('')
  const [address,     setAddress]     = useState('')
  const [lat,         setLat]         = useState<number | null>(null)
  const [lon,         setLon]         = useState<number | null>(null)
  const [phone,       setPhone]       = useState('')
  const [email,       setEmail]       = useState('')
  const [website,     setWebsite]     = useState('')
  const [regionId,    setRegionId]    = useState('')
  const [tags,        setTags]        = useState<string[]>([])
  const [tagInput,    setTagInput]    = useState('')
  const [photos,      setPhotos]      = useState('')   // newline-separated URLs
  const [videos,      setVideos]      = useState('')   // newline-separated URLs
  const [geoLoading,  setGeoLoading]  = useState(false)
  const [geoMsg,      setGeoMsg]      = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [success,     setSuccess]     = useState(false)

  useEffect(() => {
    api.get<Region[]>('/api/regions').then(r => setRegions(r.data))
  }, [])

  async function geocode() {
    if (!address.trim()) return
    setGeoLoading(true)
    setGeoMsg('')
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address + ', Україна')}&format=json&limit=1&countrycodes=ua&accept-language=uk`
      const resp = await fetch(url)
      const data: GeoResult[] = await resp.json()
      if (data[0]) {
        setLat(parseFloat(data[0].lat))
        setLon(parseFloat(data[0].lon))
        setGeoMsg(`✓ ${data[0].display_name}`)
      } else {
        setGeoMsg('Адресу не знайдено. Перевірте написання або введіть координати вручну.')
      }
    } catch {
      setGeoMsg('Помилка пошуку. Перевірте інтернет-з\'єднання.')
    } finally {
      setGeoLoading(false)
    }
  }

  function addTag(raw: string) {
    const t = raw.trim().replace(/,$/, '')
    if (t && !tags.includes(t)) setTags(prev => [...prev, t])
    setTagInput('')
  }

  function toUrlList(text: string): string[] {
    return text.split('\n').map(s => s.trim()).filter(Boolean)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { toast.error('Введіть назву розсадника'); return }
    if (lat === null || lon === null) { toast.error('Вкажіть адресу та знайдіть координати'); return }
    setSubmitting(true)
    try {
      await api.post('/api/nurseries', {
        name:        name.trim(),
        description: description.trim() || null,
        address:     address.trim() || null,
        latitude:    lat,
        longitude:   lon,
        phone:       phone.trim() || null,
        email:       email.trim() || null,
        website:     website.trim() || null,
        region_id:   regionId || null,
        tags,
        photos:      toUrlList(photos),
        videos:      toUrlList(videos),
      })
      setSuccess(true)
    } catch {
      toast.error('Помилка надсилання. Спробуйте ще раз.')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="max-w-xl mx-auto px-6 py-20 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-2xl font-black text-forest uppercase mb-3">Заявку надіслано!</h2>
        <p className="text-gray-500 mb-8">
          Ваш розсадник відправлено на перевірку. Ми зв'яжемось з вами протягом 3 робочих днів.
        </p>
        <button
          onClick={() => navigate('/map')}
          className="px-6 py-2.5 rounded-xl bg-forest text-white font-bold text-sm uppercase hover:bg-forest-dark transition-colors"
        >
          До мапи
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 pb-16">

      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600 transition-colors">
          ← Назад
        </button>
        <h1 className="text-2xl font-black text-forest uppercase">Додати розсадник</h1>
      </div>

      <p className="text-sm text-gray-500 mb-8 -mt-4">
        Після перевірки адміністратором ваш розсадник з'явиться на карті.
      </p>

      <form onSubmit={handleSubmit} className="space-y-0">

        {/* Name */}
        <div className="flex items-start gap-4 py-4 border-b border-gray-100">
          <label className="w-40 text-sm font-semibold text-gray-700 shrink-0 pt-2.5">
            Назва <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Садовий центр «Зелена садиба»"
            className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-forest hover:border-gray-300 transition-colors"
          />
        </div>

        {/* Region */}
        <div className="flex items-center gap-4 py-4 border-b border-gray-100">
          <label className="w-40 text-sm font-semibold text-gray-700 shrink-0">Регіон</label>
          <select
            value={regionId}
            onChange={e => setRegionId(e.target.value)}
            className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-forest hover:border-gray-300 transition-colors bg-white"
          >
            <option value="">Оберіть регіон...</option>
            {regions.map(r => (
              <option key={r.id} value={r.id}>{r.region}</option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div className="flex items-start gap-4 py-4 border-b border-gray-100">
          <label className="w-40 text-sm font-semibold text-gray-700 shrink-0 pt-2.5">
            Опис <span className="text-gray-400 font-normal">необов.</span>
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Розкажіть про асортимент, спеціалізацію, особливості..."
            rows={3}
            className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-forest hover:border-gray-300 transition-colors resize-none"
          />
        </div>

        {/* Address + geocoding */}
        <div className="flex items-start gap-4 py-4 border-b border-gray-100">
          <label className="w-40 text-sm font-semibold text-gray-700 shrink-0 pt-2.5">
            Адреса <span className="text-red-400">*</span>
          </label>
          <div className="flex-1 space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={address}
                onChange={e => { setAddress(e.target.value); setGeoMsg('') }}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), geocode())}
                placeholder="вул. Садова, 12, Київ"
                className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-forest hover:border-gray-300 transition-colors"
              />
              <button
                type="button"
                onClick={geocode}
                disabled={geoLoading || !address.trim()}
                className="px-4 py-2.5 bg-forest text-white rounded-xl text-sm font-semibold hover:bg-forest-dark transition-colors disabled:opacity-40 shrink-0"
              >
                {geoLoading ? '...' : '📍 Знайти'}
              </button>
            </div>

            {geoMsg && (
              <p className={`text-xs ${geoMsg.startsWith('✓') ? 'text-forest' : 'text-amber-600'}`}>
                {geoMsg}
              </p>
            )}

            {lat !== null && lon !== null && (
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-400 block mb-1">Широта</label>
                  <input
                    type="number"
                    step="any"
                    value={lat}
                    onChange={e => setLat(parseFloat(e.target.value))}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:border-forest"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-400 block mb-1">Довгота</label>
                  <input
                    type="number"
                    step="any"
                    value={lon}
                    onChange={e => setLon(parseFloat(e.target.value))}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:border-forest"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Phone */}
        <div className="flex items-center gap-4 py-4 border-b border-gray-100">
          <label className="w-40 text-sm font-semibold text-gray-700 shrink-0">Телефон</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+38 050 123-45-67"
            className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-forest hover:border-gray-300 transition-colors"
          />
        </div>

        {/* Email */}
        <div className="flex items-center gap-4 py-4 border-b border-gray-100">
          <label className="w-40 text-sm font-semibold text-gray-700 shrink-0">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="info@moirozsiady.ua"
            className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-forest hover:border-gray-300 transition-colors"
          />
        </div>

        {/* Website */}
        <div className="flex items-center gap-4 py-4 border-b border-gray-100">
          <label className="w-40 text-sm font-semibold text-gray-700 shrink-0">Сайт</label>
          <input
            type="url"
            value={website}
            onChange={e => setWebsite(e.target.value)}
            placeholder="https://moirozsiady.ua"
            className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-forest hover:border-gray-300 transition-colors"
          />
        </div>

        {/* Tags */}
        <div className="flex items-start gap-4 py-4 border-b border-gray-100">
          <label className="w-40 text-sm font-semibold text-gray-700 shrink-0 pt-2.5">
            Теги <span className="text-gray-400 font-normal">для пошуку</span>
          </label>
          <div className="flex-1">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map(t => (
                <span key={t} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-forest/10 text-forest">
                  {t}
                  <button type="button" onClick={() => setTags(prev => prev.filter(x => x !== t))} className="hover:text-forest-dark">×</button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput) } }}
              onBlur={() => tagInput && addTag(tagInput)}
              placeholder="троянди, хвойні, саджанці плодових — Enter після кожного"
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-forest hover:border-gray-300 transition-colors"
            />
          </div>
        </div>

        {/* Photos */}
        <div className="flex items-start gap-4 py-4 border-b border-gray-100">
          <label className="w-40 text-sm font-semibold text-gray-700 shrink-0 pt-2.5">
            Фото <span className="text-gray-400 font-normal">URL, по 1 на рядок</span>
          </label>
          <textarea
            value={photos}
            onChange={e => setPhotos(e.target.value)}
            placeholder={'https://.../photo1.jpg\nhttps://.../photo2.jpg'}
            rows={2}
            className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:border-forest hover:border-gray-300 transition-colors resize-none"
          />
        </div>

        {/* Videos */}
        <div className="flex items-start gap-4 py-4 border-b border-gray-100">
          <label className="w-40 text-sm font-semibold text-gray-700 shrink-0 pt-2.5">
            Відео <span className="text-gray-400 font-normal">URL, по 1 на рядок</span>
          </label>
          <textarea
            value={videos}
            onChange={e => setVideos(e.target.value)}
            placeholder={'https://youtu.be/...\nhttps://.../clip.mp4'}
            rows={2}
            className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:border-forest hover:border-gray-300 transition-colors resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-8">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:border-gray-300 transition-colors"
          >
            Скасувати
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 rounded-xl bg-forest text-white font-bold text-sm uppercase tracking-wide hover:bg-forest-dark transition-colors disabled:opacity-40"
          >
            {submitting ? 'Надсилання...' : 'Надіслати на перевірку'}
          </button>
        </div>
      </form>
    </div>
  )
}
