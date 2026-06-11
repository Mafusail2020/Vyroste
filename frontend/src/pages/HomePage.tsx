import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../components/Logo'
import {
  Calendar, MapPin, BookOpen, Newspaper,
  ArrowRight, Sparkles, Check, ChevronRight,
} from 'lucide-react'

// ─── Social SVGs ──────────────────────────────────────────────────────────────
function YTIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-red-600" aria-hidden="true">
      <path d="M23 7s-.3-2-1.2-2.8c-1.1-1.2-2.4-1.2-3-1.3C16.1 2.8 12 2.8 12 2.8s-4.1 0-6.8.1c-.6.1-1.9.1-3 1.3C1.3 5 1 7 1 7S.7 9.2.7 11.4v2c0 2.2.3 4.4.3 4.4s.3 2 1.2 2.8c1.1 1.2 2.6 1.1 3.3 1.2C7.5 22 12 22 12 22s4.1 0 6.8-.2c.6-.1 1.9-.1 3-1.3.9-.8 1.2-2.8 1.2-2.8s.3-2.2.3-4.4v-2C23.3 9.2 23 7 23 7zm-13.5 9V8l8 4-8 4z" />
    </svg>
  )
}
function FBIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-blue-700" aria-hidden="true">
      <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.88v2.27h3.32l-.53 3.49h-2.79V24C19.61 23.1 24 18.1 24 12.07z" />
    </svg>
  )
}
function IGIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-pink-600" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  )
}

// ─── Animation Primitives ─────────────────────────────────────────────────────
function useInView(threshold = 0.12) {
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
  const t = from === 'bottom' ? 'translateY(38px)' : from === 'left' ? 'translateX(-48px)' : 'translateX(48px)'
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'none' : t,
        transition: `opacity 0.7s ease-out ${delay}ms, transform 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  const [up, setUp] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setUp(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const spring = 'cubic-bezier(0.16,1,0.3,1)'

  const fadeUp = (delay: number, dist = 28): React.CSSProperties => ({
    opacity: up ? 1 : 0,
    transform: up ? 'none' : `translateY(${dist}px)`,
    transition: `opacity 0.8s ease-out ${delay}ms, transform 0.9s ${spring} ${delay}ms`,
  })

  const fadeSlide = (delay: number, dx: number, dy = 0, scale = 1): React.CSSProperties => ({
    opacity: up ? 1 : 0,
    transform: up ? 'none' : `translate(${dx}px, ${dy}px) scale(${scale})`,
    transition: `opacity 0.85s ease-out ${delay}ms, transform 0.95s ${spring} ${delay}ms`,
  })

  return (
    <section className="relative bg-cream overflow-hidden pt-20 pb-28">
      <div
        className="absolute top-0 right-0 w-[700px] h-[700px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, #BBE3BB33 0%, transparent 70%)', transform: 'translate(30%, -40%)' }}
      />
      <div
        className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, #C2E3F533 0%, transparent 70%)', transform: 'translate(-30%, 40%)' }}
      />

      <div className="relative max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-14 items-center">

        {/* Left: text */}
        <div>
          <span
            className="inline-flex items-center gap-1.5 bg-card-green text-forest text-[11px] font-black uppercase tracking-widest px-3.5 py-1.5 rounded-full mb-7 select-none"
            style={fadeUp(0, -14)}
          >
            <Sparkles className="w-3 h-3" />
            Сад та город без помилок
          </span>

          <h1
            className="font-black text-forest uppercase leading-none mb-7"
            style={{ fontSize: 'clamp(46px, 6.5vw, 82px)', letterSpacing: '-2px', ...fadeUp(120) }}
          >
            ВПЕВНЕНО<br />
            ВИРОЩУЙ<br />
            СВОЄ.
          </h1>

          <p
            className="text-gray-500 text-base leading-7 max-w-[380px] mb-10"
            style={fadeUp(290)}
          >
            Регіональний календар (овочі, квіти + лунний).<br />
            Ваш персональний план — коли сіяти, пересаджувати<br />
            та збирати врожай, залежно від вашої місцевості.
          </p>

          <div className="flex flex-wrap gap-3" style={fadeUp(440)}>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-forest text-white font-bold text-sm px-7 py-3.5 rounded-full hover:bg-forest-dark transition-all duration-300 hover:scale-[1.03] shadow-lg"
              style={{ boxShadow: '0 8px 24px rgba(43,97,23,0.25)' }}
            >
              Зареєструватись безкоштовно
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 bg-white text-gray-700 font-semibold text-sm px-6 py-3.5 rounded-full border border-gray-200 hover:border-forest hover:text-forest transition-all duration-300"
            >
              Дізнатись про Преміум
              <ChevronRight className="w-4 h-4 opacity-50" />
            </Link>
          </div>
        </div>

        {/* Right: hero visual */}
        <div className="relative" style={fadeSlide(180, 32, 0, 0.96)}>
          <div
            className="rounded-3xl w-full aspect-[4/3] relative overflow-hidden shadow-2xl"
            style={{ background: 'linear-gradient(140deg, #BBE3BB 0%, #C2E3F5 55%, #D8C8F0 100%)' }}
          >
            <div className="absolute inset-0 flex items-center justify-center text-[140px] select-none opacity-15 rotate-[-12deg]">
              🌿
            </div>
            <div className="absolute inset-0 flex items-center justify-center text-[80px] select-none">
              🧑‍🌾
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent" />
          </div>

          <div
            className="absolute -bottom-5 -left-5 bg-white rounded-2xl shadow-xl px-5 py-3 flex items-center gap-3 border border-gray-100"
            style={fadeSlide(660, 0, 0, 0.72)}
          >
            <span className="text-2xl">🌱</span>
            <div>
              <p className="text-[10px] text-gray-400 leading-none mb-1 uppercase tracking-wide font-semibold">Активних садівників</p>
              <p className="font-black text-gray-900 text-lg leading-none">2 400+</p>
            </div>
          </div>

          <div
            className="absolute -top-4 -right-4 bg-white rounded-2xl shadow-xl px-4 py-2.5 flex items-center gap-2 border border-gray-100"
            style={fadeSlide(760, 0, 0, 0.72)}
          >
            <span className="text-lg">📍</span>
            <p className="font-bold text-gray-800 text-sm leading-none">25 регіонів</p>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Tagline ──────────────────────────────────────────────────────────────────
function Tagline() {
  return (
    <section className="bg-cream py-20">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <Anim>
          <div className="flex items-center gap-4 mb-8">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gray-200" />
            <span className="text-gray-400 text-[11px] uppercase tracking-[0.2em] font-semibold whitespace-nowrap">
              Наші можливості
            </span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gray-200" />
          </div>
          <h2
            className="font-black text-navy leading-tight"
            style={{ fontSize: 'clamp(28px, 4.5vw, 58px)', letterSpacing: '-1px' }}
          >
            «ВИРОСТЕ»&nbsp;&nbsp;—&nbsp;&nbsp;щоб вийшло<br className="hidden sm:block" /> з першого разу
          </h2>
        </Anim>
      </div>
    </section>
  )
}

// ─── Feature Cards ────────────────────────────────────────────────────────────
const FEATURE_CARDS = [
  {
    icon: Calendar,
    gradientFrom: '#EFF6FF',
    gradientTo: '#E0F2FE',
    borderColor: '#BAE6FD',
    iconBg: '#DBEAFE',
    iconColor: '#2563EB',
    title: 'Регіональний календар',
    desc: 'Точні дати посіву, пересадки та збору для вашої області. Овочі, квіти + місячний календар.',
    to: '/calendar',
    cta: 'Відкрити календар',
  },
  {
    icon: MapPin,
    gradientFrom: '#F0FDF4',
    gradientTo: '#DCFCE7',
    borderColor: '#BBF7D0',
    iconBg: '#D1FAE5',
    iconColor: '#059669',
    title: 'Мапа розсадників',
    desc: 'Перевірені розсадники по всій Україні з контактами, асортиментом та маршрутом.',
    to: '/map',
    cta: 'Знайти розсадник',
  },
  {
    icon: BookOpen,
    gradientFrom: '#FAF5FF',
    gradientTo: '#F3E8FF',
    borderColor: '#E9D5FF',
    iconBg: '#EDE9FE',
    iconColor: '#7C3AED',
    title: 'База знань',
    desc: 'Гіди по вирощуванню, поради агрономів та відповіді на найпоширеніші питання.',
    to: '/knowledge',
    cta: 'Читати гіди',
  },
  {
    icon: Newspaper,
    gradientFrom: '#FFFBEB',
    gradientTo: '#FEF3C7',
    borderColor: '#FDE68A',
    iconBg: '#FEF3C7',
    iconColor: '#D97706',
    title: 'Блог',
    desc: 'Статті про місячні календарі, GDD-метод, мульчування та сезонні поради від практиків.',
    to: '/blog',
    cta: 'До блогу',
  },
]

function FeatureCards() {
  return (
    <section className="bg-cream pb-28">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {FEATURE_CARDS.map((card, i) => {
          const Icon = card.icon
          return (
            <Anim key={card.title} delay={i * 90} className="h-full">
              <div
                className="group rounded-3xl p-4 flex flex-col h-full hover:shadow-2xl hover:-translate-y-2 transition-all duration-300"
                style={{
                  background: `linear-gradient(135deg, ${card.gradientFrom}, ${card.gradientTo})`,
                  border: `1.5px solid ${card.borderColor}`,
                }}
              >
                <div className="px-2 pt-2 pb-4">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm"
                    style={{ background: card.iconBg }}
                  >
                    <Icon className="w-5 h-5" style={{ color: card.iconColor }} />
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-6 flex flex-col flex-1 shadow-sm">
                  <h3 className="font-black text-gray-900 text-xl mb-3 leading-tight">
                    {card.title}
                  </h3>
                  <div className="flex-1" />
                  <p className="text-gray-500 text-sm leading-relaxed mb-6">{card.desc}</p>
                  <Link
                    to={card.to}
                    className="inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl self-start transition-all duration-200 hover:scale-[1.03] hover:brightness-95"
                    style={{ background: card.gradientTo, color: card.iconColor }}
                  >
                    {card.cta}
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            </Anim>
          )
        })}
      </div>
    </section>
  )
}

// ─── Feature Detail Sections ──────────────────────────────────────────────────
interface DetailSectionProps {
  tag: string
  title: string
  desc: string
  to: string
  ctaLabel: string
  imageSide: 'left' | 'right'
  imageBg: string
  imageEmoji: string
  sectionBg: string
  btnBg: string
  btnShadow: string
  splitWhite?: boolean
}

function DetailSection({
  tag, title, desc, to, ctaLabel, imageSide, imageBg, imageEmoji,
  sectionBg, btnBg, btnShadow, splitWhite = false,
}: DetailSectionProps) {
  // Scroll animations: text from left/right, image from opposite side
  const textRef = useRef<HTMLDivElement>(null)
  const imgRef  = useRef<HTMLDivElement>(null)
  const [textIn, setTextIn] = useState(false)
  const [imgIn,  setImgIn]  = useState(false)

  useEffect(() => {
    const observe = (el: HTMLDivElement | null, set: (v: boolean) => void) => {
      if (!el) return () => {}
      const obs = new IntersectionObserver(([e]) => {
        if (e.isIntersecting) { set(true); obs.disconnect() }
      }, { threshold: 0.1 })
      obs.observe(el)
      return () => obs.disconnect()
    }
    const d1 = observe(textRef.current, setTextIn)
    const d2 = observe(imgRef.current,  setImgIn)
    return () => { d1(); d2() }
  }, [])

  const slide = (visible: boolean, dx: number): React.CSSProperties => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'none' : `translateX(${dx}px)`,
    transition: 'opacity 0.75s ease-out, transform 0.9s cubic-bezier(0.16,1,0.3,1)',
  })

  const textDx = imageSide === 'right' ? -56 : 56
  const imgDx  = imageSide === 'right' ?  56 : -56

  const textContent = (
    <>
      <span
        className="inline-block text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-5 w-fit"
        style={{ background: 'rgba(0,0,0,0.06)', color: '#555' }}
      >
        {tag}
      </span>
      <h2
        className="font-black uppercase leading-tight mb-4 text-gray-900"
        style={{ fontSize: 'clamp(26px, 3.5vw, 44px)', letterSpacing: '-1px' }}
      >
        {title}
      </h2>
      <p className="text-gray-500 text-base leading-relaxed mb-7 max-w-[400px]">{desc}</p>
      <Link
        to={to}
        className="inline-flex items-center gap-2 text-white text-sm font-bold px-6 py-3 rounded-full transition-all duration-300 hover:scale-[1.03] hover:brightness-90 self-start shadow-md"
        style={{ background: btnBg, boxShadow: btnShadow }}
      >
        {ctaLabel}
        <ArrowRight className="w-4 h-4" />
      </Link>
    </>
  )

  const imageContent = (
    <div
      className="rounded-3xl overflow-hidden w-full h-full relative shadow-xl flex items-center justify-center min-h-[380px]"
      style={{ background: imageBg }}
    >
      <span className="text-[130px] select-none drop-shadow-md">{imageEmoji}</span>
      <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent" />
    </div>
  )

  const heroAlignPl = 'max(1.5rem, calc((100vw - 80rem) / 2 + 1.5rem))'
  const heroAlignPr = 'max(1.5rem, calc((100vw - 80rem) / 2 + 1.5rem))'

  const textCol = (
    <div
      ref={textRef}
      className="flex flex-col justify-center py-14"
      style={{
        ...slide(textIn, textDx),
        paddingLeft:  imageSide === 'right' ? heroAlignPl : '2.5rem',
        paddingRight: imageSide === 'right' ? '3rem'       : heroAlignPr,
      }}
    >
      {textContent}
    </div>
  )

  const imageCol = (
    <div
      ref={imgRef}
      className="flex items-stretch pl-10 lg:pl-14 relative z-10"
      style={{
        ...slide(imgIn, imgDx),
        marginTop: '-1.75rem',
        marginBottom: '-1.75rem',
      }}
    >
      {imageContent}
    </div>
  )

  const whitePaddingRight = splitWhite && imageSide === 'right' ? '3.5rem' : '0'

  return (
    <section style={{ background: sectionBg }}>
      <div className="py-16">
        <div
          className="grid grid-cols-1 md:grid-cols-2 md:items-stretch"
          style={{
            background: splitWhite ? '#ffffff' : 'transparent',
            backgroundClip: splitWhite ? 'content-box' : undefined,
            paddingRight: whitePaddingRight,
          }}
        >
          {imageSide === 'left' ? <>{imageCol}{textCol}</> : <>{textCol}{imageCol}</>}
        </div>
      </div>
    </section>
  )
}

function FeatureDetails() {
  return (
    <>
      <DetailSection
        tag="Планування"
        title="Регіональний календар"
        desc="Персональний план на весь рік: точні дати посіву, пересадки та збору врожаю для вашої конкретної місцевості. Накладіть місячні фази — і знайте ідеальний день для кожної дії."
        to="/calendar"
        ctaLabel="Відкрити календар"
        imageSide="right"
        imageBg="linear-gradient(135deg, #9EC9E8 0%, #C2E3F5 100%)"
        imageEmoji="📅"
        sectionBg="#C2E3F5"
        btnBg="#1A237E"
        btnShadow="0 6px 20px rgba(26,35,126,0.3)"
        splitWhite={true}
      />
      <DetailSection
        tag="Де купити"
        title="Мапа розсадників"
        desc="Інтерактивна карта перевірених розсадників по всій Україні. Фільтруйте за регіоном та культурою, прокладайте маршрут прямо з браузера. Знаходьте якісну розсаду поруч."
        to="/map"
        ctaLabel="Знайти розсадник"
        imageSide="left"
        imageBg="linear-gradient(135deg, #8ED08E 0%, #BBE3BB 100%)"
        imageEmoji="🗺️"
        sectionBg="#FFFFFF"
        btnBg="#2B6117"
        btnShadow="0 6px 20px rgba(43,97,23,0.3)"
        splitWhite={false}
      />
      <DetailSection
        tag="Знання"
        title="База знань"
        desc="Практичні гіди від агрономів: як правильно мульчувати, коли підживлювати, що зробити для рекордного врожаю. Написано зрозуміло — для тих, хто росте разом зі своїм городом."
        to="/knowledge"
        ctaLabel="Відкрити базу знань"
        imageSide="right"
        imageBg="linear-gradient(135deg, #B8A8E0 0%, #D8C8F0 100%)"
        imageEmoji="🥦"
        sectionBg="#D8C8F0"
        btnBg="#6D28D9"
        btnShadow="0 6px 20px rgba(109,40,217,0.3)"
        splitWhite={true}
      />
    </>
  )
}

// ─── Pricing ──────────────────────────────────────────────────────────────────
const PREMIUM_FEATURES = [
  'Необмежена кількість культур',
  'GDD-сповіщення про збір врожаю на email',
  'Повний персональний план на весь сезон',
  'Місячний календар та рекомендації',
  'Пріоритетна підтримка',
]

function Pricing() {
  return (
    <section className="py-28 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1E4510 0%, #2B6117 50%, #1A237E 100%)' }}>
      <div
        className="absolute top-0 left-1/2 w-[600px] h-[600px] rounded-full pointer-events-none opacity-10"
        style={{ background: 'radial-gradient(circle, #BBE3BB 0%, transparent 70%)', transform: 'translate(-50%, -50%)' }}
      />
      <div className="relative max-w-7xl mx-auto px-6">
        <Anim from="bottom">
          <div className="max-w-2xl mx-auto text-center">
            <span className="inline-flex items-center gap-1.5 bg-white/10 text-white text-[11px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full mb-7 border border-white/20">
              <Sparkles className="w-3 h-3" />
              Преміум план
            </span>
            <h2
              className="font-black text-white uppercase leading-tight mb-3"
              style={{ fontSize: 'clamp(30px, 4.5vw, 54px)', letterSpacing: '-1.5px' }}
            >
              Ціна Преміум
            </h2>
            <p className="text-white/60 text-base mb-4">Розблокуйте всі можливості Виросте</p>
            <div className="flex items-end justify-center gap-2 mb-10">
              <span className="text-white font-black" style={{ fontSize: 'clamp(48px, 6vw, 72px)', lineHeight: 1 }}>149</span>
              <span className="text-white/70 font-semibold text-xl mb-2">грн / місяць</span>
            </div>
            <ul className="text-left space-y-3 mb-10 max-w-sm mx-auto">
              {PREMIUM_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-3 text-white/90 text-sm">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-card-green flex items-center justify-center">
                    <Check className="w-3 h-3 text-forest" />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 bg-white text-forest font-black text-sm px-8 py-4 rounded-full hover:bg-cream transition-all duration-300 hover:scale-[1.04] shadow-2xl"
            >
              Переглянути тарифи
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </Anim>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────
const FOOTER_NAV = [
  {
    heading: 'Сервіси',
    links: [
      { label: 'Регіональний календар', to: '/calendar' },
      { label: 'Мапа розсадників', to: '/map' },
      { label: 'База знань', to: '/knowledge' },
      { label: 'Ціни', to: '/pricing' },
    ],
  },
  {
    heading: 'Компанія',
    links: [
      { label: 'Про нас', to: '/about' },
      { label: 'Блог', to: '/blog' },
      { label: 'Контакти', to: '/contact' },
      { label: 'Для розсадників', to: '/nurseries/register' },
    ],
  },
  {
    heading: 'Акаунт',
    links: [
      { label: 'Реєстрація', to: '/register' },
      { label: 'Увійти', to: '/login' },
      { label: 'Преміум', to: '/pricing' },
    ],
  },
]

function Footer() {
  return (
    <footer className="bg-cream border-t border-gray-200 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-14">
          <div>
            <Logo size="md" showSubtitle={true} />
            <div className="mt-5 mb-4 w-28 h-px bg-gray-300" />
            <p className="text-gray-400 text-xs mb-4 uppercase tracking-wider font-semibold">Ми в соц мережах</p>
            <div className="flex gap-2.5">
              <a href="https://youtube.com/@vyroste" target="_blank" rel="noreferrer" aria-label="YouTube"
                className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center hover:bg-red-100 hover:scale-110 transition-all duration-200">
                <YTIcon />
              </a>
              <a href="https://facebook.com/vyroste" target="_blank" rel="noreferrer" aria-label="Facebook"
                className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center hover:bg-blue-100 hover:scale-110 transition-all duration-200">
                <FBIcon />
              </a>
              <a href="https://instagram.com/vyroste" target="_blank" rel="noreferrer" aria-label="Instagram"
                className="w-9 h-9 rounded-xl bg-pink-50 border border-pink-100 flex items-center justify-center hover:bg-pink-100 hover:scale-110 transition-all duration-200">
                <IGIcon />
              </a>
            </div>
          </div>
          {FOOTER_NAV.map((col) => (
            <div key={col.heading}>
              <p className="font-black text-gray-900 text-xs uppercase tracking-widest mb-4">{col.heading}</p>
              <ul className="space-y-2.5">
                {col.links.map(({ label, to }) => (
                  <li key={label}>
                    <Link to={to} className="text-gray-500 text-sm hover:text-forest transition-colors">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-200 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} Виросте. Всі права захищені.</p>
          <p className="text-xs text-gray-400">Сад та город без помилок</p>
        </div>
      </div>
    </footer>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <>
      <Hero />
      <Tagline />
      <FeatureCards />
      <FeatureDetails />
      <Pricing />
      <Footer />
    </>
  )
}
