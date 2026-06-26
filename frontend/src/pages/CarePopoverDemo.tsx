import { useState } from 'react'
import CarePopover from '../components/CarePopover'

/* Standalone demo for the Care Popover — visit /care-popover-demo.
 * The real wiring lives on the cultivating bars in CalendarPage.tsx. */

interface Point { x: number; y: number }

export default function CarePopoverDemo() {
  const [pt, setPt] = useState<Point | null>(null)

  function openAt(e: React.MouseEvent) {
    setPt({ x: e.clientX, y: e.clientY })
  }

  const careBlocks = [
    { label: 'Догляд · Травень', cls: 'top-24 left-8 w-48' },
    { label: 'Догляд · Червень', cls: 'top-40 right-8 w-48' },
    { label: 'Догляд · Липень',  cls: 'bottom-10 left-10 w-48' },
    { label: 'Догляд · Серпень', cls: 'bottom-10 right-10 w-48' },
    { label: 'Догляд (центр)',   cls: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56' },
  ]

  return (
    <div className="relative min-h-[calc(100vh-5rem)] bg-cream overflow-hidden">
      <div className="px-6 py-8">
        <h1 className="text-2xl font-black text-forest uppercase">Деталі догляду — демо</h1>
        <p className="text-sm text-gray-500 mt-1">Клікни будь-який блок «Догляд» — поповер відкриється над курсором.</p>
      </div>

      {careBlocks.map((b, i) => (
        <button
          key={i}
          onMouseDown={e => e.stopPropagation()}
          onClick={openAt}
          className={`absolute ${b.cls} flex items-center gap-1.5 px-3 py-1.5 rounded-md
                      bg-[#86EFAC] text-[#14532D] text-sm font-medium shadow-sm
                      hover:brightness-95 cursor-pointer`}
        >
          🔧 {b.label}
        </button>
      ))}

      {pt && <CarePopover x={pt.x} y={pt.y} onClose={() => setPt(null)} />}
    </div>
  )
}
