import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../components/Logo'
import Seo from '../components/Seo'
import {
  Calendar, MapPin, BookOpen, Newspaper,
  ArrowRight, Sparkles, Check, ChevronRight,
} from 'lucide-react'

// ─── Image assets ──────────────────────────────────────────────────────────────
import heroPhoto from '../assets/KnowledgeBase/main_kb_photo.jpg'
import calendarPhoto from '../assets/HomePage/calendar_photo.png'
import mapPhoto from '../assets/HomePage/map_photo.jpeg'
import kbPhoto from '../assets/HomePage/kb_photo.jpg'
import arrowArc from '../assets/arrow_with_arc.png'
import arrowWithCircle from '../assets/arrow_with_circle.png'
import markerL from '../assets/place_marker_l.png'
import markerR from '../assets/place_marker_r.png'
import questionMark from '../assets/questionmark_with_border.png'
import ytGreen from '../assets/yt_green.png'
import fbGreen from '../assets/facebook_green.png'
import igGreen from '../assets/inst_green.png'

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
          <h1
            className="font-black text-forest uppercase leading-none mb-7"
            style={{ fontSize: 'clamp(46px, 6.5vw, 82px)', letterSpacing: '-2px', ...fadeUp(120) }}
          >
            ВПЕВНЕНО<br />
            ВИРОЩУЙ<br />
            СВОЄ
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
              className="inline-flex items-center gap-2 bg-[#6E9150] text-white font-bold text-base px-7 py-3.5 rounded-lg hover:bg-[#5e7d42] transition-all duration-300 hover:scale-[1.03] shadow-lg"
              style={{ boxShadow: '0 8px 24px rgba(43,97,23,0.25)' }}
            >
              Зареєструватись безкоштовно
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 bg-white text-gray-700 font-semibold text-base px-6 py-3.5 rounded-lg border border-gray-200 hover:border-forest hover:text-forest transition-all duration-300"
            >
              Дізнатись про Преміум
              <ChevronRight className="w-4 h-4 opacity-50" />
            </Link>
          </div>
        </div>

        {/* Right: hero visual */}
        <div className="relative" style={fadeSlide(180, 32, 0, 0.96)}>
          {/* hand-drawn arrow from the text toward the photo */}
          <span className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 -ml-10 z-30 pointer-events-none select-none">
            <img src={arrowArc} alt="" aria-hidden="true" className="doodle-draw doodle-outline w-32 opacity-90"
              style={{ '--rot': '0deg' } as React.CSSProperties} />
          </span>
          <div className="rounded-3xl w-full aspect-[4/3] relative overflow-hidden shadow-2xl bg-card-green">
            <img src={heroPhoto} alt="Садівниця у саду" className="w-full h-full object-cover" />
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
    cardBg: 'bg-card-blue',
    iconChip: 'bg-blue-100',
    iconColor: 'text-blue-600',
    btn: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
    title: 'Регіональний календар',
    desc: 'Точні дати посіву, пересадки та збору для вашої області. Овочі, квіти + місячний календар.',
    to: '/calendar',
    cta: 'Відкрити календар',
  },
  {
    icon: MapPin,
    cardBg: 'bg-card-green',
    iconChip: 'bg-green-100',
    iconColor: 'text-green-600',
    btn: 'bg-green-100 text-green-700 hover:bg-green-200',
    title: 'Мапа розсадників',
    desc: 'Перевірені розсадники по всій Україні з контактами, асортиментом та маршрутом.',
    to: '/map',
    cta: 'Знайти розсадник',
  },
  {
    icon: BookOpen,
    cardBg: 'bg-card-purple',
    iconChip: 'bg-purple-100',
    iconColor: 'text-purple-600',
    btn: 'bg-purple-100 text-purple-700 hover:bg-purple-200',
    title: 'База знань',
    desc: 'Гіди по вирощуванню, поради агрономів та відповіді на найпоширеніші питання.',
    to: '/knowledge',
    cta: 'Читати гіди',
  },
  {
    icon: Newspaper,
    cardBg: 'bg-[#FBE6BC]',
    iconChip: 'bg-amber-100',
    iconColor: 'text-amber-600',
    btn: 'bg-amber-100 text-amber-700 hover:bg-amber-200',
    title: 'Блог',
    desc: 'Статті про місячні календарі, GDD-метод, мульчування та сезонні поради від практиків.',
    to: '/blog',
    cta: 'До блогу',
  },
]

function FeatureCards() {
  return (
    <section className="bg-cream pb-28">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {FEATURE_CARDS.map((card, i) => {
          return (
            <Anim key={card.title} delay={i * 90} className="h-full">
              <div className={`group ${card.cardBg} rounded-3xl p-4 flex flex-col h-full hover:shadow-2xl hover:-translate-y-2 transition-all duration-300`}>
                <div className="bg-white rounded-2xl p-6 flex flex-col flex-1 shadow-sm">
                  <h3 className="font-black text-navy text-xl mb-3 leading-tight">
                    {card.title}
                  </h3>
                  <p className="text-gray-500 text-sm leading-relaxed mb-6 flex-1">{card.desc}</p>
                  <Link
                    to={card.to}
                    className={`inline-flex items-center justify-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl ${card.btn} transition-all duration-200`}
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
  imageSrc?: string
  decor?: React.ReactNode
  sectionBg: string
  btnBg: string
  btnShadow: string
  splitWhite?: boolean
}

function DetailSection({
  tag, title, desc, to, ctaLabel, imageSide, imageBg, imageEmoji, imageSrc, decor,
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
        className="inline-flex items-center gap-2 text-white text-sm font-bold px-6 py-3 rounded-lg transition-all duration-300 hover:scale-[1.03] hover:brightness-90 self-start shadow-md"
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
      {imageSrc
        ? <img src={imageSrc} alt={title} className="w-full h-full object-cover" />
        : <span className="text-[130px] select-none drop-shadow-md">{imageEmoji}</span>}
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
      className={`doodle-host ${imgIn ? 'in' : ''} flex items-stretch pl-10 lg:pl-14 relative z-10`}
      style={{
        ...slide(imgIn, imgDx),
        marginTop: '-1.75rem',
        marginBottom: '-1.75rem',
      }}
    >
      {imageContent}
      {decor}
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
        imageSrc={calendarPhoto}
        decor={
          <span className="hidden lg:block absolute top-[42%] left-0 -ml-40 z-20 pointer-events-none select-none">
            <img src={arrowWithCircle} alt="" aria-hidden="true" className="doodle-draw doodle-outline w-44"
              style={{ '--rot': '0deg' } as React.CSSProperties} />
          </span>
        }
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
        imageSrc={mapPhoto}
        decor={<>
          <img src={markerL} alt="" aria-hidden="true"
            className="absolute -top-5 left-6 w-12 sm:w-16 pointer-events-none select-none z-20 drop-shadow" />
          <img src={markerR} alt="" aria-hidden="true"
            className="absolute -bottom-6 right-2 w-12 sm:w-16 pointer-events-none select-none z-20 drop-shadow" />
        </>}
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
        imageSrc={kbPhoto}
        decor={<>
          <img src={questionMark} alt="" aria-hidden="true"
            className="absolute -top-9 left-8 w-14 sm:w-20 rotate-[-12deg] drop-shadow-md z-30 pointer-events-none select-none" />
          <img src={questionMark} alt="" aria-hidden="true"
            className="absolute -bottom-10 right-2 w-16 sm:w-24 rotate-12 drop-shadow-md z-30 pointer-events-none select-none" />
        </>}
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
              <span className="text-white font-black" style={{ fontSize: 'clamp(48px, 6vw, 72px)', lineHeight: 1 }}>100</span>
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
              className="inline-flex items-center gap-2 bg-white text-forest font-black text-sm px-8 py-4 rounded-lg hover:bg-cream transition-all duration-300 hover:scale-[1.04] shadow-2xl"
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
        <div className="flex flex-col md:flex-row gap-12 md:gap-28 mb-14">
          <div className="md:shrink-0">
            <Logo size="md" showSubtitle={true} />
            <div className="mt-5 mb-4 w-28 h-px bg-gray-300" />
            <p className="text-gray-400 text-xs mb-4 uppercase tracking-wider font-semibold">Ми в соц мережах</p>
            <div className="flex gap-3">
              <a href="https://youtube.com/@vyroste" target="_blank" rel="noreferrer" aria-label="YouTube"
                className="hover:scale-110 transition-transform duration-200">
                <img src={ytGreen} alt="YouTube" className="w-9 h-9" />
              </a>
              <a href="https://facebook.com/vyroste" target="_blank" rel="noreferrer" aria-label="Facebook"
                className="hover:scale-110 transition-transform duration-200">
                <img src={fbGreen} alt="Facebook" className="w-9 h-9" />
              </a>
              <a href="https://instagram.com/vyroste" target="_blank" rel="noreferrer" aria-label="Instagram"
                className="hover:scale-110 transition-transform duration-200">
                <img src={igGreen} alt="Instagram" className="w-9 h-9" />
              </a>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-12 flex-1">
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
      <Seo title="" description="Виросте — персональний садовий помічник: регіональний календар посіву, мапа перевірених розсадників та база знань для українських садівників." path="/" />
      <Hero />
      <Tagline />
      <FeatureCards />
      <FeatureDetails />
      <Pricing />
      <Footer />
    </>
  )
}
