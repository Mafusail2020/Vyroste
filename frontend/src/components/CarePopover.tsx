import { useEffect, useRef } from 'react'

/* ─────────────────────────────────────────────────────────────────────────
 * Care Popover (Деталі догляду) — MVP
 *
 * Opens above the mouse cursor. Static dummy content for now (image +
 * pesticide/care info). Closes on click-outside or Escape. Edge-aware so it
 * doesn't bleed off the top/right of the screen.
 * ───────────────────────────────────────────────────────────────────────── */

const CARE_IMG =
  'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=640&q=70'

export default function CarePopover({ x, y, onClose }: { x: number; y: number; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)

  // Click-outside to close.
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [onClose])

  // Escape to close.
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // ── Edge-aware positioning ───────────────────────────────────────────────
  const W = 320          // card width (matches w-80)
  const MAXH = 300       // matches max-h-[300px]
  const GAP = 12         // breathing room from the cursor
  const vw = window.innerWidth
  const vh = window.innerHeight

  const left = Math.min(Math.max(x - 24, 8), vw - W - 8)
  const roomAbove = y - GAP - MAXH > 8
  const above = roomAbove || y > vh / 2
  const top = above ? Math.max(y - GAP, 8) : Math.min(y + GAP, vh - 8)

  return (
    <div
      ref={ref}
      role="dialog"
      style={{ left, top, width: W, maxHeight: MAXH, transform: above ? 'translateY(-100%)' : 'none' }}
      className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-y-auto
                 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <img src={CARE_IMG} alt="Обробка рослин" className="w-full h-36 object-cover" />

      <div className="p-4">
        <h3 className="text-base font-black text-gray-900 leading-tight">Обробка від шкідників</h3>
        <p className="text-xs text-gray-400 mt-0.5 mb-3">Біопрепарат · повторювати кожні 10–14 днів</p>

        <p className="text-sm text-gray-600 leading-relaxed">
          Оглядайте листя з обох боків раз на тиждень. За перших ознак попелиці чи кліща
          обробіть рослини біоінсектицидом <strong>«Фітоверм»</strong> або
          <strong> «Бітоксибацилін»</strong> у вечірні години, коли немає прямого сонця та вітру.
        </p>
        <p className="text-sm text-gray-600 leading-relaxed mt-3">
          Робочий розчин готуйте з розрахунку 2 мл на 1 л води. Рівномірно змочуйте листя
          до легкого стікання. Не обробляйте за 3–5 днів до збору врожаю.
        </p>
        <p className="text-sm text-gray-600 leading-relaxed mt-3">
          Повторюйте кожні 10–14 днів до зникнення шкідників. Чергуйте препарати, щоб
          уникнути звикання. Після дощу обробку повторіть — біозасоби змиваються водою.
        </p>

        <div className="mt-4 flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
          <span>🌿</span> Безпечно для бджіл за вечірнього застосування
        </div>
      </div>
    </div>
  )
}
