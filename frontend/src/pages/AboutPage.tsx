import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Heart, Play } from 'lucide-react'
import Seo from '../components/Seo'

// ─── Animation ────────────────────────────────────────────────────────────────
function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setInView(true); obs.disconnect() }
    }, { threshold })
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, inView }
}

function Anim({ children, delay = 0, from = 'bottom', className = '' }: {
  children: React.ReactNode
  delay?: number
  from?: 'bottom' | 'left' | 'right'
  className?: string
}) {
  const { ref, inView } = useInView()
  const t = from === 'bottom' ? 'translateY(36px)' : from === 'left' ? 'translateX(-44px)' : 'translateX(44px)'
  return (
    <div ref={ref} className={className} style={{
      opacity: inView ? 1 : 0,
      transform: inView ? 'none' : t,
      transition: `opacity 0.7s ease-out ${delay}ms, transform 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
    }}>
      {children}
    </div>
  )
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const CHANNELS = [
  {
    handle: '@hatazkrayu',
    name: '«Хата з краю»',
    desc: 'Основний канал, з якого все почалося. Показуємо процес пошуку будинків у різних українських селах та допомагаємо відкривати потенціал сільської нерухомості.',
    color: '#BBE3BB',
    iconBg: '#D1FAE5',
    iconColor: '#059669',
    emoji: '🏡',
  },
  {
    handle: '@hatazkrayu-live',
    name: '«Хата з краю — LIVE»',
    desc: 'Влог про справжні сільські будні без прикрас. Масштабний ремонт, боротьба зі спекою й снігом, створення саду та городу. А ще — багато котів і розлючених ондатр.',
    color: '#C2E3F5',
    iconBg: '#DBEAFE',
    iconColor: '#2563EB',
    emoji: '🎬',
  },
  {
    handle: '@manivtsi',
    name: '«Манівці»',
    desc: 'Тревел-проєкт по Україні. Звертаємо з головних трас на манівці та показуємо красу, автентику і справжнє життя українських сіл.',
    color: '#D8C8F0',
    iconBg: '#EDE9FE',
    iconColor: '#7C3AED',
    emoji: '🗺️',
  },
]

const BLOG_TOPICS = [
  { emoji: '🔨', text: 'Складнощі та радощі ремонту старої хати своїми силами.' },
  { emoji: '🌱', text: 'Городній дзен: від висадки розсади і догляду за артишоками та лавандою до боротьби з бур\'янами.' },
  { emoji: '🏠', text: 'Хутірський побут, облаштування подвір\'я та створення затишку з мінімальним бюджетом.' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AboutPage() {
  const [up, setUp] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setUp(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const fadeUp = (delay: number): React.CSSProperties => ({
    opacity: up ? 1 : 0,
    transform: up ? 'none' : 'translateY(28px)',
    transition: `opacity 0.8s ease-out ${delay}ms, transform 0.9s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
  })

  return (
    <div className="bg-cream min-h-screen">
      <Seo title="Про нас" description="Виросте — українська платформа для садівників: наша місія, команда та підхід до точного календаря посіву." path="/about" />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-20 pb-24">
        <div
          className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, #BBE3BB33 0%, transparent 70%)', transform: 'translate(30%, -40%)' }}
        />
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <span className="inline-block text-5xl mb-6" style={fadeUp(0)}>🏡</span>
          <h1
            className="font-black text-forest uppercase leading-tight mb-6"
            style={{ fontSize: 'clamp(36px, 6vw, 72px)', letterSpacing: '-2px', ...fadeUp(120) }}
          >
            Наша&nbsp;Історія
          </h1>
          <p className="text-xl font-semibold text-gray-700 mb-4 leading-relaxed" style={fadeUp(260)}>
            Від мрії до хати біля моря
          </p>
          <p className="text-gray-500 text-base leading-relaxed max-w-2xl mx-auto" style={fadeUp(380)}>
            Усе почалося з великої мрії та кардинальних змін. Авторка проєкту родом із Маріуполя, і
            війна змінила в її житті абсолютно все. Проте незмінним залишилося одне — бажання мати
            власний дім у красивому місці.
          </p>
        </div>
      </section>

      {/* ── Story card ── */}
      <section className="pb-20">
        <div className="max-w-3xl mx-auto px-6">
          <Anim>
            <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-gray-100">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-6"
                style={{ background: 'linear-gradient(135deg, #BBE3BB, #C2E3F5)' }}
              >
                🌊
              </div>
              <p className="text-gray-600 text-base leading-8">
                Після тривалих пошуків мрія здійснилася: була знайдена та придбана стара сільська хата
                біля моря, яка своєю атмосферою нагадує рідний Маріуполь. З цього моменту почалася
                велика історія відновлення, ремонту та нового життя ближче до природи.
              </p>
            </div>
          </Anim>
        </div>
      </section>

      {/* ── YouTube channels ── */}
      <section className="pb-24">
        <div className="max-w-7xl mx-auto px-6">
          <Anim>
            <div className="flex items-center gap-4 mb-12">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gray-200" />
              <h2 className="font-black text-navy text-center whitespace-nowrap"
                style={{ fontSize: 'clamp(24px, 4vw, 42px)', letterSpacing: '-1px' }}>
                🎥 Наші відеопроєкти
              </h2>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gray-200" />
            </div>
          </Anim>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {CHANNELS.map((ch, i) => (
              <Anim key={ch.handle} delay={i * 100}>
                <div
                  className="rounded-3xl p-1.5 hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300"
                  style={{ background: `linear-gradient(135deg, ${ch.color}80, ${ch.color}30)`, border: `1.5px solid ${ch.color}` }}
                >
                  <div className="bg-white rounded-[20px] p-6 h-full flex flex-col">
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
                        style={{ background: ch.iconBg }}
                      >
                        {ch.emoji}
                      </div>
                      <div>
                        <p className="font-black text-gray-900 text-base leading-tight">{ch.name}</p>
                        <p className="text-xs font-mono text-gray-400 mt-0.5">{ch.handle}</p>
                      </div>
                    </div>
                    <p className="text-gray-500 text-sm leading-relaxed flex-1">{ch.desc}</p>
                    <div className="mt-5 pt-4 border-t border-gray-100 flex items-center gap-2">
                      <Play className="w-4 h-4 text-red-500 fill-red-500" />
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">YouTube</span>
                    </div>
                  </div>
                </div>
              </Anim>
            ))}
          </div>
        </div>
      </section>

      {/* ── Blog topics ── */}
      <section className="py-24" style={{ background: 'linear-gradient(135deg, #F0FDF4, #EFF6FF)' }}>
        <div className="max-w-3xl mx-auto px-6">
          <Anim>
            <h2 className="font-black text-navy text-center mb-3"
              style={{ fontSize: 'clamp(24px, 4vw, 42px)', letterSpacing: '-1px' }}>
              🌱 Про що наш блог?
            </h2>
            <p className="text-center text-gray-500 mb-10">
              Контент для тих, хто любить Україну, цікавиться життям поза великими містами та цінує
              працю своїми руками.
            </p>
          </Anim>

          <div className="space-y-4">
            {BLOG_TOPICS.map((t, i) => (
              <Anim key={i} delay={i * 80} from="left">
                <div className="bg-white rounded-2xl px-6 py-5 flex items-start gap-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <span className="text-2xl flex-shrink-0 mt-0.5">{t.emoji}</span>
                  <p className="text-gray-700 text-base leading-relaxed">{t.text}</p>
                </div>
              </Anim>
            ))}
          </div>
        </div>
      </section>

      {/* ── Support CTA ── */}
      <section className="py-24 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1E4510 0%, #2B6117 50%, #1A237E 100%)' }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 70% 50%, rgba(187,227,187,0.1) 0%, transparent 60%)' }}
        />
        <div className="relative max-w-2xl mx-auto px-6 text-center">
          <Anim>
            <Heart className="w-10 h-10 text-red-400 mx-auto mb-6" />
            <h2 className="font-black text-white uppercase leading-tight mb-5"
              style={{ fontSize: 'clamp(26px, 4vw, 46px)', letterSpacing: '-1.5px' }}>
              🤝 Підтримайте наш проєкт
            </h2>
            <p className="text-white/70 text-base leading-8 mb-4">
              Ми постійно розвиваємо наші канали, покращуємо хатинку та плануємо нові експедиції
              манівцями України. Усі роботи та зйомки ми ведемо самостійно.
            </p>
            <p className="text-white/80 text-base leading-8 mb-10">
              Якщо вам подобається наш україномовний контент і ви хочете підтримати ремонт нашої хати
              та розвиток каналу, ми будемо щиро вдячні за допомогу.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link
                to="/blog"
                className="inline-flex items-center gap-2 bg-white text-forest font-black text-sm px-7 py-3.5 rounded-full hover:bg-cream transition-all duration-300 hover:scale-[1.04] shadow-2xl"
              >
                Читати блог
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 bg-white/10 text-white font-bold text-sm px-7 py-3.5 rounded-full border border-white/20 hover:bg-white/20 transition-all duration-300"
              >
                Приєднатись до Виросте
              </Link>
            </div>
            <p className="mt-10 text-white/50 text-sm">
              Залишайтеся з нами — підписуйтесь на соцмережі та відкривайте сільську Україну разом із «Хатою з краю»!
            </p>
          </Anim>
        </div>
      </section>

    </div>
  )
}
