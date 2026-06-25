import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Star, MapPin, Phone, Globe, ChevronLeft, ChevronRight,
  ChevronDown, ThumbsUp, ThumbsDown, ArrowLeft,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

/* ─── lucide has no brand icons in this version → inline SVG socials ──────── */
function YTIcon() {
  return <svg viewBox="0 0 24 24" className="w-4 h-4 fill-gray-600" aria-hidden="true"><path d="M23 7s-.3-2-1.2-2.8c-1.1-1.2-2.4-1.2-3-1.3C16.1 2.8 12 2.8 12 2.8s-4.1 0-6.8.1c-.6.1-1.9.1-3 1.3C1.3 5 1 7 1 7S.7 9.2.7 11.4v2c0 2.2.3 4.4.3 4.4s.3 2 1.2 2.8c1.1 1.2 2.6 1.1 3.3 1.2C7.5 22 12 22 12 22s4.1 0 6.8-.2c.6-.1 1.9-.1 3-1.3.9-.8 1.2-2.8 1.2-2.8s.3-2.2.3-4.4v-2C23.3 9.2 23 7 23 7zm-13.5 9V8l8 4-8 4z" /></svg>
}
function FBIcon() {
  return <svg viewBox="0 0 24 24" className="w-4 h-4 fill-gray-600" aria-hidden="true"><path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.88v2.27h3.32l-.53 3.49h-2.79V24C19.61 23.1 24 18.1 24 12.07z" /></svg>
}
function IGIcon() {
  return <svg viewBox="0 0 24 24" className="w-4 h-4 fill-gray-600" aria-hidden="true"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85 0 3.2-.01 3.58-.07 4.85-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.64.07-4.85.07-3.2 0-3.58-.01-4.85-.07-3.26-.15-4.77-1.7-4.92-4.92-.06-1.27-.07-1.64-.07-4.85 0-3.2.01-3.58.07-4.85.15-3.23 1.66-4.77 4.92-4.92 1.27-.06 1.65-.07 4.85-.07zM12 0C8.74 0 8.33.01 7.05.07 2.7.27.27 2.69.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.2 4.36 2.62 6.78 6.98 6.98C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c4.35-.2 6.78-2.62 6.98-6.98.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.2-4.35-2.62-6.78-6.98-6.98C15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 100 12.32 6.16 6.16 0 000-12.32zM12 16a4 4 0 110-8 4 4 0 010 8zm6.41-10.85a1.44 1.44 0 100 2.88 1.44 1.44 0 000-2.88z" /></svg>
}

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface NurseryLike {
  name: string
  description: string | null
  address: string | null
  phone: string | null
  website: string | null
  latitude: number
  longitude: number
  photos: string[] | null
  videos: string[] | null
}

/* ─── Mock data (price table + reviews are not in the backend yet) ───────── */
const PHOTO_FALLBACK = [
  'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=900&q=70',
  'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=600&q=70',
  'https://images.unsplash.com/photo-1591857177580-dc82b9ac4e1e?auto=format&fit=crop&w=600&q=70',
  'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=600&q=70',
]

const PRICE_SECTIONS = [
  {
    name: 'Яблуні',
    rows: [
      { name: 'Яблуня Чемпіон', age: '2 роки', price: '100 грн' },
      { name: 'Яблуня Голден', age: '2 роки', price: '120 грн' },
      { name: 'Яблуня Айдаред', age: '3 роки', price: '150 грн' },
      { name: 'Яблуня Фуджі', age: '2 роки', price: '110 грн' },
    ],
  },
  {
    name: 'Сливи',
    rows: [
      { name: 'Слива Угорка', age: '2 роки', price: '90 грн' },
      { name: 'Слива Ренклод', age: '2 роки', price: '95 грн' },
    ],
  },
  { name: 'Груші', rows: [{ name: 'Груша Конференція', age: '2 роки', price: '130 грн' }] },
  { name: 'Ялинки', rows: [{ name: 'Ялина блакитна', age: '3 роки', price: '250 грн' }] },
]

const REVIEWS = [
  { id: 1, name: 'Вася',  date: '01.01.2026', rating: 4, likes: 12, dislikes: 1, text: 'Гарний розсадник, саджанці прийнялися всі. Консультація на висоті, рекомендую усім сусідам.' },
  { id: 2, name: 'Оля',   date: '15.12.2025', rating: 5, likes: 8,  dislikes: 0, text: 'Замовляла яблуні — приїхали з закритою кореневою системою, упаковано дбайливо. Дуже задоволена.' },
  { id: 3, name: 'Петро', date: '03.11.2025', rating: 4, likes: 5,  dislikes: 2, text: 'Ціни адекватні, асортимент великий. Доставка Новою поштою без проблем.' },
  { id: 4, name: 'Ірина', date: '20.10.2025', rating: 4, likes: 3,  dislikes: 0, text: 'Брала сливи та груші. Все прижилось, навесні буде видно врожай. Дякую за поради щодо посадки.' },
]

/* ─── Star row ───────────────────────────────────────────────────────────── */
function Stars({ value, size = 'w-4 h-4' }: { value: number; size?: string }) {
  return (
    <div className="flex">
      {[0, 1, 2, 3, 4].map(i => (
        <Star key={i} className={`${size} ${i < Math.round(value) ? 'text-amber-400 fill-amber-400' : 'text-gray-300 fill-gray-300'}`} />
      ))}
    </div>
  )
}

/* ─── Component ──────────────────────────────────────────────────────────── */
export default function NurseryDetailOverlay({ nursery, onClose }: {
  nursery: NurseryLike
  onClose: () => void
}) {
  const { user } = useAuth()
  const photos = nursery.photos?.length ? nursery.photos : PHOTO_FALLBACK
  const videos = nursery.videos ?? []
  const reviewCount = REVIEWS.length
  const avgRating = REVIEWS.reduce((s, r) => s + r.rating, 0) / (reviewCount || 1)

  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['Яблуні']))
  const [vid, setVid] = useState(0)
  const [form, setForm] = useState({ rating: 0, text: '' })
  const [submitted, setSubmitted] = useState(false)
  const [votes, setVotes] = useState<Record<number, 'up' | 'down' | undefined>>({})

  function vote(id: number, dir: 'up' | 'down') {
    setVotes(v => ({ ...v, [id]: v[id] === dir ? undefined : dir }))
  }

  function toggleSection(name: string) {
    setOpenSections(prev => {
      const n = new Set(prev)
      n.has(name) ? n.delete(name) : n.add(name)
      return n
    })
  }

  function submitReview(e: React.FormEvent) {
    e.preventDefault()
    // Moderation: do NOT add to the list — send for review, clear, confirm.
    setForm({ rating: 0, text: '' })
    setSubmitted(true)
  }

  const userName = user?.email?.split('@')[0] ?? ''

  /* ── Gallery: layout adapts to image count ── */
  function Gallery() {
    const n = photos.length
    if (n === 1) return <img src={photos[0]} alt="" className="w-full h-72 object-cover" />
    if (n === 2) return (
      <div className="grid grid-cols-2 gap-1 h-72">
        {photos.map((p, i) => <img key={i} src={p} alt="" className="w-full h-full object-cover" />)}
      </div>
    )
    if (n === 3) return (
      <div className="grid grid-cols-3 gap-1 h-72">
        {photos.map((p, i) => <img key={i} src={p} alt="" className="w-full h-full object-cover" />)}
      </div>
    )
    // 4+: one large left, rest in a 2-col grid on the right
    return (
      <div className="flex gap-1 h-72">
        <img src={photos[0]} alt="" className="w-1/2 h-full object-cover" />
        <div className="w-1/2 grid grid-cols-2 grid-rows-2 gap-1">
          {photos.slice(1, 5).map((p, i) => <img key={i} src={p} alt="" className="w-full h-full object-cover" />)}
        </div>
      </div>
    )
  }

  const cleanUrl = (u: string) => u.replace(/^https?:\/\//, '').replace(/\/$/, '')

  return (
    <div className="fixed inset-0 z-[2000] bg-[#faf9f5] overflow-y-auto">

      {/* Back button */}
      <div className="sticky top-0 z-10 bg-[#faf9f5]/95 backdrop-blur border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <button onClick={onClose} className="flex items-center gap-2 text-sm font-semibold text-[#65814f] hover:text-[#4f6640]">
            <ArrowLeft className="w-4 h-4" /> Повернутися до мапи
          </button>
        </div>
      </div>

      {/* Gallery */}
      <div className="max-w-7xl mx-auto"><Gallery /></div>

      {/* Main 2-column */}
      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-[65%_35%] gap-8">

        {/* ── Left: description + price ── */}
        <div>
          <p className="text-sm text-gray-500">Сімейний розплідник</p>
          <h1 className="text-3xl font-black text-gray-800 tracking-tight">{nursery.name}</h1>

          <div className="flex items-center gap-2 mt-1.5 mb-4">
            <span className="text-sm font-bold text-gray-700">{avgRating.toFixed(1).replace('.', ',')}</span>
            <Stars value={avgRating} />
            <span className="text-sm text-gray-400">({reviewCount})</span>
          </div>

          {nursery.description && <p className="text-sm text-gray-500 leading-relaxed mb-6">{nursery.description}</p>}

          <p className="text-sm font-bold text-gray-600 mb-2">Прайс ▾</p>
          <div className="border border-gray-200">
            {PRICE_SECTIONS.map(sec => {
              const open = openSections.has(sec.name)
              return (
                <div key={sec.name}>
                  <button onClick={() => toggleSection(sec.name)}
                    className="w-full flex items-center justify-between px-4 py-2 bg-[#81996c] text-white font-bold text-sm">
                    {sec.name}
                    <ChevronDown className={`w-4 h-4 transition-transform ${open ? '' : '-rotate-90'}`} />
                  </button>
                  {open && (
                    <table className="w-full text-sm">
                      <tbody>
                        {sec.rows.map((r, i) => (
                          <tr key={i} className={i % 2 ? 'bg-gray-50' : 'bg-white'}>
                            <td className="px-4 py-1.5 border-b border-gray-100 text-gray-700">{r.name}</td>
                            <td className="px-4 py-1.5 border-b border-gray-100 text-gray-500 w-24">{r.age}</td>
                            <td className="px-4 py-1.5 border-b border-gray-100 text-gray-700 w-24 text-right">{r.price}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )
            })}
          </div>

          <p className="mt-6 text-sm font-bold text-gray-700">Доставка Нова пошта, Укрпошта, Самовивіз</p>
        </div>

        {/* ── Right: map + contacts + videos ── */}
        <div className="space-y-5">
          {/* Mini map (OSM embed) */}
          <div className="border border-gray-200">
            <iframe
              title="Розташування"
              loading="lazy"
              className="w-full h-36 block"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${nursery.longitude - 0.012}%2C${nursery.latitude - 0.008}%2C${nursery.longitude + 0.012}%2C${nursery.latitude + 0.008}&layer=mapnik&marker=${nursery.latitude}%2C${nursery.longitude}`}
            />
            <a href={`https://maps.google.com/?q=${nursery.latitude},${nursery.longitude}`} target="_blank" rel="noreferrer"
              className="block text-center text-xs text-[#65814f] py-1 hover:underline border-t border-gray-200">
              Відкрити в картах →
            </a>
          </div>

          {/* Contacts */}
          <div className="space-y-3 text-sm">
            {nursery.address && (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                <span className="text-gray-700 flex-1">{nursery.address}</span>
                <a href={`https://maps.google.com/?q=${nursery.latitude},${nursery.longitude}`} target="_blank" rel="noreferrer"
                  className="text-xs px-2 py-0.5 bg-[#81996c] text-white">карта</a>
              </div>
            )}
            {nursery.phone && (
              <a href={`tel:${nursery.phone}`} className="flex items-center gap-2 text-gray-700 hover:text-[#65814f]">
                <Phone className="w-4 h-4 text-gray-500" /> {nursery.phone}
              </a>
            )}
            {nursery.website && (
              <a href={nursery.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-gray-700 hover:text-[#65814f]">
                <Globe className="w-4 h-4 text-gray-500" /> {cleanUrl(nursery.website)}
              </a>
            )}
            <div className="flex gap-2 pt-1">
              {[YTIcon, FBIcon, IGIcon].map((Icon, i) => (
                <span key={i} className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-[#65814f] transition-colors">
                  <Icon />
                </span>
              ))}
            </div>
          </div>

          {/* Video carousel — arrows outside, round; smaller video */}
          {videos.length > 0 && (
            <div>
              <div className="flex items-center gap-2">
                {videos.length > 1 && (
                  <button onClick={() => setVid(v => (v - 1 + videos.length) % videos.length)}
                    className="shrink-0 w-8 h-8 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center hover:bg-gray-300 transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}
                <div className="flex-1 bg-black aspect-video border border-gray-200 overflow-hidden">
                  {/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)/.test(videos[vid])
                    ? <iframe src={videos[vid].replace('watch?v=', 'embed/')} title="video" className="w-full h-full" allowFullScreen />
                    : <video src={videos[vid]} controls className="w-full h-full" />}
                </div>
                {videos.length > 1 && (
                  <button onClick={() => setVid(v => (v + 1) % videos.length)}
                    className="shrink-0 w-8 h-8 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center hover:bg-gray-300 transition-colors">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                )}
              </div>
              {videos.length > 1 && (
                <div className="flex justify-center gap-1.5 mt-2">
                  {videos.map((_, i) => (
                    <button key={i} onClick={() => setVid(i)}
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${i === vid ? 'bg-[#65814f]' : 'bg-gray-300'}`} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Reviews ── */}
      <div className="max-w-7xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-black text-gray-800 mb-6">{reviewCount} відгуків про {nursery.name}</h2>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">

          {/* Review feed */}
          <div className="space-y-4">
            {REVIEWS.map(r => (
              <div key={r.id} className="bg-[#dae5cd] p-4 rounded-sm">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-gray-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-gray-800 text-sm">{r.name}</p>
                        <p className="text-xs text-gray-500">{r.date}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs font-bold text-gray-600">{r.rating.toFixed(1)}</span>
                        <Stars value={r.rating} size="w-3 h-3" />
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 mt-2 leading-relaxed">{r.text}</p>
                    <div className="flex items-center justify-end gap-2 mt-3 text-xs text-gray-600">
                      <span>Чи був відгук корисним</span>
                      <button onClick={() => vote(r.id, 'up')}
                        className={`flex items-center gap-1 px-1.5 h-6 rounded-full transition-colors ${
                          votes[r.id] === 'up' ? 'bg-[#65814f]' : 'bg-[#a9c08f] hover:bg-[#97b07b]'
                        }`}>
                        <ThumbsUp className="w-3 h-3 text-white" />
                        <span className="text-white font-semibold">{r.likes + (votes[r.id] === 'up' ? 1 : 0)}</span>
                      </button>
                      <button onClick={() => vote(r.id, 'down')}
                        className={`flex items-center gap-1 px-1.5 h-6 rounded-full transition-colors ${
                          votes[r.id] === 'down' ? 'bg-[#9c6b5a]' : 'bg-[#a9c08f] hover:bg-[#97b07b]'
                        }`}>
                        <ThumbsDown className="w-3 h-3 text-white" />
                        <span className="text-white font-semibold">{r.dislikes + (votes[r.id] === 'down' ? 1 : 0)}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Leave a review */}
          <div className="bg-[#c5d8b3] p-5 rounded-sm h-fit">
            <h3 className="font-black text-gray-800 mb-1">Залишити відгук</h3>
            <p className="font-bold text-gray-700 text-sm mb-4">{nursery.name}</p>

            {submitted ? (
              <div className="bg-white p-4 text-sm text-[#4f6640] font-semibold rounded-sm">
                ✓ Ваш відгук успішно відправлено на перевірку модератору.
              </div>
            ) : !user ? (
              <div className="bg-white p-4 text-sm text-gray-600 rounded-sm">
                Щоб залишити відгук, <Link to="/login" className="text-[#65814f] font-semibold hover:underline">увійдіть</Link> у свій акаунт.
              </div>
            ) : (
              <form onSubmit={submitReview} className="space-y-3">
                {/* Review is posted from the logged-in account */}
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-9 h-9 rounded-full bg-[#65814f] text-white flex items-center justify-center text-sm font-bold shrink-0 uppercase">
                    {userName.charAt(0)}
                  </div>
                  <span className="text-sm font-semibold text-gray-700 truncate">{userName}</span>
                </div>

                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(s => (
                    <button key={s} type="button" onClick={() => setForm(f => ({ ...f, rating: s }))}>
                      <Star className={`w-7 h-7 ${s <= form.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-400'}`} />
                    </button>
                  ))}
                </div>

                <textarea value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
                  required rows={5} placeholder="Ваш відгук…"
                  className="w-full bg-white px-3 py-2 text-sm border border-gray-300 focus:outline-none focus:border-[#65814f] resize-none" />

                <button type="submit"
                  className="w-full py-3 bg-[#65814f] text-white font-bold text-sm uppercase tracking-wide hover:bg-[#55703f] transition-colors">
                  Надіслати
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
