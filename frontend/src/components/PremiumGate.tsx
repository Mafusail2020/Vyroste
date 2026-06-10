import { Link } from 'react-router-dom'

interface Props {
  cropCount: number
  isPremium: boolean
}

export default function PremiumGate({ cropCount, isPremium }: Props) {
  if (isPremium || cropCount <= 5) return null

  return (
    <div className="mb-8 p-5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-4">
      <span className="text-2xl shrink-0">⭐</span>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-amber-800 mb-1">Ви обрали {cropCount} культур</p>
        <p className="text-sm text-amber-700">
          Безкоштовний план відображає тільки перші 5. Оновіться до Преміум, щоб бачити всі культури в календарі, отримувати GDD-сповіщення та необмежений доступ.
        </p>
      </div>
      <Link
        to="/pricing"
        className="shrink-0 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm uppercase tracking-wide transition-colors"
      >
        Преміум →
      </Link>
    </div>
  )
}
