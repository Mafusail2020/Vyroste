import { useEffect, useRef, useState, type FormEvent } from 'react'
import { toast } from 'react-hot-toast'
import Seo from '../components/Seo'

/* ─── Data ───────────────────────────────────────────────────────────────── */

const SOCIALS = [
  {
    name: 'Instagram',
    handle: '@hatazkrayu',
    desc: 'Фото, естетика та анонси',
    href: 'https://www.instagram.com/hatazkrayu/',
    active: true,
    iconBg: 'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
      </svg>
    ),
  },
  {
    name: 'YouTube',
    handle: '@hatazkrayu',
    desc: 'Відеоогляди, гайди та інтерв\'ю',
    href: 'https://www.youtube.com/@hatazkrayu',
    active: true,
    iconBg: '#FF0000',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
  },
  {
    name: 'Facebook',
    handle: 'Скоро',
    desc: 'Новини проєкту та обговорення',
    href: null,
    active: false,
    iconBg: '#1877F2',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
]

/* ─── Animated section wrapper ───────────────────────────────────────────── */

function FadeIn({ children, delay = 0, className = '' }: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect() } },
      { threshold: 0.1 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={className}
      style={{
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
      }}
    >
      {children}
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function ContactPage() {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  function handleSubscribe(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) { toast.error('Введіть email'); return }
    setSubscribed(true)
    toast.success('Підписку оформлено! Дякуємо 🌱')
    setEmail('')
  }

  return (
    <div className="bg-cream min-h-screen">
      <Seo title="Контакти" description="Звʼяжіться з командою Виросте — підтримка, співпраця та зворотний звʼязок." path="/contact" />

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-16 pb-14">
        {/* Decorative blobs */}
        <div aria-hidden className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-card-green opacity-40 blur-3xl pointer-events-none" />
        <div aria-hidden className="absolute -bottom-10 -left-16 w-60 h-60 rounded-full bg-card-blue opacity-30 blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto px-6 relative z-10">
          <FadeIn delay={0}>
            <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-1.5 text-xs font-semibold text-forest uppercase tracking-wide mb-5 shadow-sm">
              🌿 Завжди раді поспілкуватися
            </div>
          </FadeIn>
          <FadeIn delay={80}>
            <h1
              className="font-black text-forest uppercase leading-none mb-4"
              style={{ fontSize: 'clamp(32px, 5vw, 60px)', letterSpacing: '-1px' }}
            >
              Зв'яжіться з нами
            </h1>
          </FadeIn>
          <FadeIn delay={160}>
            <p className="text-gray-500 text-lg max-w-xl leading-relaxed">
              Ми завжди раді поспілкуватися, відповісти на запитання чи обговорити співпрацю.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── Info cards ──────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          {/* Address */}
          <FadeIn delay={0} className="group">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 h-full shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-200 cursor-default">
              <div className="w-10 h-10 rounded-xl bg-card-green flex items-center justify-center text-xl mb-4">
                📍
              </div>
              <h2 className="font-black text-sm uppercase tracking-wide text-gray-800 mb-3">Наша адреса</h2>
              <div className="text-sm text-gray-600 leading-relaxed">
                <p className="font-medium text-gray-800 mb-1">Офіс / Простір:</p>
                <p>вул. Подільська, 42, оф. 12</p>
                <p>м. Київ, 01001, Україна</p>
              </div>
            </div>
          </FadeIn>

          {/* Email */}
          <FadeIn delay={80} className="group">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 h-full shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-200">
              <div className="w-10 h-10 rounded-xl bg-card-blue flex items-center justify-center text-xl mb-4">
                ✉️
              </div>
              <h2 className="font-black text-sm uppercase tracking-wide text-gray-800 mb-3">Пишіть нам</h2>
              <div className="text-sm text-gray-600 leading-relaxed space-y-2">
                <div>
                  <p className="text-gray-400 text-xs uppercase tracking-wide font-semibold mb-0.5">Загальні питання</p>
                  <a
                    href="mailto:info@yourdomain.com"
                    className="text-forest font-semibold hover:underline transition-colors"
                  >
                    info@yourdomain.com
                  </a>
                </div>
                <div>
                  <p className="text-gray-400 text-xs uppercase tracking-wide font-semibold mb-0.5">Співпраця та медіа</p>
                  <a
                    href="mailto:partner@yourdomain.com"
                    className="text-forest font-semibold hover:underline transition-colors"
                  >
                    partner@yourdomain.com
                  </a>
                </div>
              </div>
            </div>
          </FadeIn>

          {/* Legal */}
          <FadeIn delay={160} className="group">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 h-full shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-200 cursor-default">
              <div className="w-10 h-10 rounded-xl bg-card-purple flex items-center justify-center text-xl mb-4">
                💼
              </div>
              <h2 className="font-black text-sm uppercase tracking-wide text-gray-800 mb-3">Офіційні реквізити</h2>
              <div className="text-sm text-gray-600 leading-relaxed space-y-1">
                <p className="font-semibold text-gray-800">ТОВ «Юр-Основа»</p>
                <p><span className="text-gray-400">ЄДРПОУ:</span> 12345678</p>
                <p className="break-all"><span className="text-gray-400">IBAN:</span> UA89300001000002600123456789</p>
                <p><span className="text-gray-400">Банк:</span> АТ «ПриватБанк»</p>
              </div>
            </div>
          </FadeIn>

        </div>
      </section>

      {/* ── Socials ─────────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <FadeIn delay={0}>
          <div className="mb-6">
            <h2 className="font-black text-xl uppercase text-gray-800 mb-1">
              🌱 Будьмо на зв'язку
            </h2>
            <p className="text-gray-500 text-sm">
              Приєднуйтесь до спільноти — бекстейдж, поради та щоденні оновлення
            </p>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {SOCIALS.map((s, i) => (
            <FadeIn key={s.name} delay={i * 80}>
              {s.active && s.href ? (
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm
                             hover:-translate-y-1 hover:shadow-md transition-all duration-200 group"
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: s.iconBg }}
                  >
                    {s.svg}
                  </div>
                  <div className="min-w-0">
                    <div className="font-black text-sm text-gray-800 group-hover:text-forest transition-colors">
                      {s.name}
                    </div>
                    <div className="text-xs text-gray-400 font-medium">{s.handle}</div>
                    <div className="text-xs text-gray-500 mt-0.5 truncate">{s.desc}</div>
                  </div>
                  <span className="ml-auto text-gray-300 group-hover:text-forest group-hover:translate-x-1 transition-all duration-200 text-lg">→</span>
                </a>
              ) : (
                <div className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm opacity-50 cursor-not-allowed">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 grayscale"
                    style={{ background: s.iconBg }}
                  >
                    {s.svg}
                  </div>
                  <div className="min-w-0">
                    <div className="font-black text-sm text-gray-800 flex items-center gap-2">
                      {s.name}
                      <span className="text-[10px] bg-amber-100 text-amber-600 font-bold px-1.5 py-0.5 rounded-full uppercase">Скоро</span>
                    </div>
                    <div className="text-xs text-gray-400 font-medium">{s.handle}</div>
                    <div className="text-xs text-gray-500 mt-0.5 truncate">{s.desc}</div>
                  </div>
                </div>
              )}
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── Newsletter ──────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <FadeIn delay={0}>
          <div className="bg-forest rounded-3xl p-8 md:p-10 relative overflow-hidden">
            {/* Decorative circle */}
            <div aria-hidden className="absolute -top-10 -right-10 w-52 h-52 rounded-full bg-white/5 pointer-events-none" />
            <div aria-hidden className="absolute bottom-0 left-1/3 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />

            <div className="relative z-10 max-w-lg">
              <div className="text-white/60 text-xs font-bold uppercase tracking-wider mb-2">💌 Наша розсилка</div>
              <h2 className="text-white font-black text-2xl uppercase mb-2">Нічого зайвого</h2>
              <p className="text-white/70 text-sm leading-relaxed mb-6">
                Лише користь раз на тиждень — сезонні поради, календарі та ексклюзивні пропозиції прямо на пошту.
              </p>

              {subscribed ? (
                <div className="flex items-center gap-3 bg-white/10 rounded-xl px-5 py-4 text-white font-semibold text-sm">
                  <span className="text-xl">✅</span>
                  Ви підписані! Очікуйте корисне у вашій скриньці.
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="flex gap-2 flex-col sm:flex-row">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="flex-1 px-4 py-3 rounded-xl bg-white/15 border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none focus:border-white/50 transition-colors"
                  />
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl bg-white text-forest font-black text-sm uppercase tracking-wide
                               hover:bg-amber-50 hover:scale-[1.03] active:scale-[0.97]
                               transition-all duration-150 shrink-0"
                  >
                    Підписатися →
                  </button>
                </form>
              )}
            </div>
          </div>
        </FadeIn>
      </section>

    </div>
  )
}
