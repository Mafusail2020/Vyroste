import { Link } from 'react-router-dom'
import Logo from '../components/Logo'

// ─── Reusable CTA Button ──────────────────────────────────────────────────────
function CtaButton({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 bg-navy text-white text-sm font-bold px-5 py-2.5 rounded-lg hover:bg-[#1a237e]/90 transition-colors"
    >
      {children}
    </Link>
  )
}

// ─── Hero ────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="bg-cream pt-10 pb-16">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
        {/* Left: headline + description */}
        <div>
          <h1
            className="font-black text-forest uppercase leading-none mb-5"
            style={{ fontSize: 'clamp(40px, 6vw, 72px)', letterSpacing: '-1px' }}
          >
            ВПЕВНЕНО<br />
            ВИРОЩУЙ<br />
            СВОЄ.
          </h1>
          <p className="text-gray-600 text-base leading-relaxed max-w-sm mb-8">
            Регіональний календар (овочі, квіти + лунний)<br />
            Зробіть свій план коли сіяти, пересаджувати або
            збирати врожай протягом року залежно від вашої місцевості
          </p>
          <CtaButton to="/register">Зареєструватись безкоштовно »</CtaButton>
        </div>

        {/* Right: hero image placeholder + arrow decoration */}
        <div className="relative">
          {/* Arrow decoration */}
          <svg
            className="absolute -left-10 top-1/2 -translate-y-1/2 hidden lg:block"
            width="60" height="40" viewBox="0 0 60 40" fill="none"
            aria-hidden="true"
          >
            <path
              d="M4 20 Q20 5 50 20"
              stroke="#2B6117" strokeWidth="2" fill="none"
              strokeLinecap="round"
              markerEnd="url(#arrowhead)"
            />
            <defs>
              <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#2B6117" />
              </marker>
            </defs>
          </svg>

          <div
            className="rounded-2xl overflow-hidden bg-[#C8D8B0] w-full aspect-[4/3] flex items-center justify-center"
            style={{ minHeight: 320 }}
          >
            {/* Replace with actual photo: <img src="/images/hero.jpg" className="w-full h-full object-cover" alt="Садівник у городі" /> */}
            <span className="text-white/60 text-sm">Фото садівника</span>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Tagline ─────────────────────────────────────────────────────────────────
function Tagline() {
  return (
    <section className="bg-cream py-10">
      <div className="max-w-7xl mx-auto px-6">
        <h2
          className="font-black text-navy leading-tight"
          style={{ fontSize: 'clamp(28px, 4vw, 52px)' }}
        >
          «ВИРОСТЕ»&nbsp;&nbsp; щоб&nbsp;&nbsp; вийшло з першого разу
        </h2>
      </div>
    </section>
  )
}

// ─── Feature Cards ───────────────────────────────────────────────────────────
const FEATURE_CARDS = [
  {
    bg: 'bg-card-blue',
    title: 'Регіональний календар',
    desc: 'Регіональний календар (овочі, квіти + лунний). Зробіть свій план коли сіяти, пересаджувати або збирати врожай протягом року залежно від вашої місцевості.',
    to: '/calendar',
  },
  {
    bg: 'bg-card-green',
    title: 'Мапа розсадників',
    desc: 'Регіональний календар (овочі, квіти + лунний). Зробіть свій план коли сіяти, пересаджувати або збирати врожай протягом року залежно від вашої місцевості.',
    to: '/map',
  },
  {
    bg: 'bg-card-purple',
    title: 'База знань',
    desc: 'Регіональний календар (овочі, квіти + лунний). Зробіть свій план коли сіяти, пересаджувати або збирати врожай протягом року залежно від вашої місцевості.',
    to: '/knowledge',
  },
  {
    bg: 'bg-cream border border-gray-200',
    title: 'Блог',
    desc: 'Регіональний календар (овочі, квіти + лунний). Зробіть свій план коли сіяти, пересаджувати або збирати врожай протягом року залежно від вашої місцевості.',
    to: '/blog',
  },
]

function FeatureCards() {
  return (
    <section className="bg-cream pb-16">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {FEATURE_CARDS.map((card) => (
          <div
            key={card.title}
            className={`${card.bg} rounded-2xl p-6 flex flex-col justify-between min-h-[260px]`}
          >
            <div>
              <h3 className="font-bold text-gray-900 text-lg mb-3 leading-tight">
                {card.title}
              </h3>
              <p className="text-gray-700 text-sm leading-relaxed">{card.desc}</p>
            </div>
            <Link
              to={card.to}
              className="mt-5 inline-block bg-navy text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-navy/90 transition-colors self-start"
            >
              почати зараз»
            </Link>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Feature Detail Sections ─────────────────────────────────────────────────
interface FeatureDetailProps {
  title: string
  desc: string
  to: string
  imageSide: 'left' | 'right'
  imageBg: string
  imageLabel: string
}

function FeatureDetail({ title, desc, to, imageSide, imageBg, imageLabel }: FeatureDetailProps) {
  const textBlock = (
    <div className="flex flex-col justify-center py-10">
      <h2
        className="font-black text-forest uppercase leading-tight mb-4"
        style={{ fontSize: 'clamp(24px, 3.5vw, 40px)' }}
      >
        {title}
      </h2>
      <p className="text-gray-600 text-sm leading-relaxed mb-6 max-w-sm">{desc}</p>
      <div>
        <Link
          to={to}
          className="inline-block bg-navy text-white text-sm font-bold px-5 py-2.5 rounded-lg hover:bg-navy/90 transition-colors"
        >
          почати зараз»
        </Link>
      </div>
    </div>
  )

  const imageBlock = (
    <div
      className={`${imageBg} rounded-2xl flex items-center justify-center min-h-[280px] aspect-video`}
    >
      {/* Replace with actual screenshot or illustration */}
      <span className="text-white/50 text-sm">{imageLabel}</span>
    </div>
  )

  return (
    <div className="border-t border-dashed border-gray-300">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-10 items-center py-6">
        {imageSide === 'left' ? (
          <>
            {imageBlock}
            {textBlock}
          </>
        ) : (
          <>
            {textBlock}
            {imageBlock}
          </>
        )}
      </div>
    </div>
  )
}

function FeatureDetails() {
  return (
    <section className="bg-cream">
      <FeatureDetail
        title="Регіональний календар"
        desc="Регіональний календар (овочі, квіти + лунний). Зробіть свій план коли сіяти, пересаджувати або збирати врожай протягом року залежно від вашої місцевості."
        to="/calendar"
        imageSide="right"
        imageBg="bg-[#B8D4A0]"
        imageLabel="Скриншот календаря"
      />
      <FeatureDetail
        title="Мапа розсадників"
        desc="Регіональний календар (овочі, квіти + лунний). Зробіть свій план коли сіяти, пересаджувати або збирати врожай протягом року залежно від вашої місцевості."
        to="/map"
        imageSide="left"
        imageBg="bg-[#D0E8D0]"
        imageLabel="Карта України з маркерами"
      />
      <FeatureDetail
        title="База знань"
        desc="Регіональний календар (овочі, квіти + лунний). Зробіть свій план коли сіяти, пересаджувати або збирати врожай протягом року залежно від вашої місцевості."
        to="/knowledge"
        imageSide="right"
        imageBg="bg-[#C0D8B0]"
        imageLabel="Фото овочів"
      />
    </section>
  )
}

// ─── Pricing ─────────────────────────────────────────────────────────────────
function Pricing() {
  return (
    <section className="bg-card-green border-t border-dashed border-gray-300 py-16">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <h2
          className="font-black text-forest uppercase mb-4"
          style={{ fontSize: 'clamp(28px, 4vw, 48px)' }}
        >
          Ціна преміум
        </h2>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          Розблокуйте всі культури, GDD-сповіщення та персональний план на весь рік.
        </p>
        <CtaButton to="/pricing">Переглянути тарифи »</CtaButton>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────
const FOOTER_COLS = [
  ['Регіональний календар', 'Маршрут', 'Тиц'],
  ['Мапа розсадників', 'Тиц', 'Тиц'],
  ['База знань', 'Тиц', 'Тиц'],
]

function Footer() {
  return (
    <footer className="bg-cream border-t border-gray-200 pt-12 pb-6">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
          {/* Brand column */}
          <div>
            <Logo size="md" showSubtitle={true} />
            <div className="mt-4 w-32 border-b border-gray-400" />
            <p className="text-gray-500 text-xs mt-3 mb-4">Ми в соц мережах</p>
            <div className="flex gap-3">
              {/* YouTube */}
              <a href="#" aria-label="YouTube" className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center hover:bg-red-200 transition-colors">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-red-600"><path d="M23 7s-.3-2-1.2-2.8c-1.1-1.2-2.4-1.2-3-1.3C16.1 2.8 12 2.8 12 2.8s-4.1 0-6.8.1c-.6.1-1.9.1-3 1.3C1.3 5 1 7 1 7S.7 9.2.7 11.4v2c0 2.2.3 4.4.3 4.4s.3 2 1.2 2.8c1.1 1.2 2.6 1.1 3.3 1.2C7.5 22 12 22 12 22s4.1 0 6.8-.2c.6-.1 1.9-.1 3-1.3.9-.8 1.2-2.8 1.2-2.8s.3-2.2.3-4.4v-2C23.3 9.2 23 7 23 7zm-13.5 9V8l8 4-8 4z"/></svg>
              </a>
              {/* Facebook */}
              <a href="#" aria-label="Facebook" className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center hover:bg-blue-200 transition-colors">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-blue-700"><path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.88v2.27h3.32l-.53 3.49h-2.79V24C19.61 23.1 24 18.1 24 12.07z"/></svg>
              </a>
              {/* Instagram */}
              <a href="#" aria-label="Instagram" className="w-9 h-9 rounded-full bg-pink-100 flex items-center justify-center hover:bg-pink-200 transition-colors">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-pink-600"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </a>
            </div>
          </div>

          {/* Nav columns */}
          <div className="md:col-span-3 grid grid-cols-3 gap-6">
            <div>
              <p className="font-bold text-gray-900 text-sm mb-1">ВИРОСТЕ</p>
              {FOOTER_COLS[0].map((item) => (
                <a key={item} href="#" className="block text-gray-500 text-sm hover:text-forest py-0.5">{item}</a>
              ))}
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm mb-1">ВИРОСТЕ</p>
              {FOOTER_COLS[1].map((item) => (
                <a key={item} href="#" className="block text-gray-500 text-sm hover:text-forest py-0.5">{item}</a>
              ))}
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm mb-1">ВИРОСТЕ</p>
              {FOOTER_COLS[2].map((item) => (
                <a key={item} href="#" className="block text-gray-500 text-sm hover:text-forest py-0.5">{item}</a>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} Виросте. Всі права захищені.
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
