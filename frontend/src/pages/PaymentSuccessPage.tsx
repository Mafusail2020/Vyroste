import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'

type State = 'polling' | 'success' | 'timeout'

export default function PaymentSuccessPage() {
  const navigate = useNavigate()
  const [state, setState] = useState<State>('polling')
  const attempts = useRef(0)

  useEffect(() => {
    const MAX = 15  // 15 × 2s = 30s

    const id = setInterval(async () => {
      try {
        const { data } = await api.get<{ is_premium: boolean }>('/api/users/me')
        if (data.is_premium) {
          clearInterval(id)
          setState('success')
          return
        }
      } catch { /* network error — keep polling */ }

      attempts.current += 1
      if (attempts.current >= MAX) {
        clearInterval(id)
        setState('timeout')
      }
    }, 2000)

    return () => clearInterval(id)
  }, [])

  if (state === 'polling') return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div className="w-12 h-12 border-4 border-forest border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-500 font-medium">Перевіряємо оплату...</p>
    </div>
  )

  if (state === 'success') return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-6">
      <div className="text-6xl">✅</div>
      <h1 className="text-3xl font-black text-forest uppercase">Преміум активовано!</h1>
      <p className="text-gray-500 max-w-sm">
        Ваш акаунт оновлено до Преміум на 1 рік. Всі культури тепер доступні в календарі.
      </p>
      <button
        onClick={() => navigate('/dashboard')}
        className="mt-4 px-8 py-3 rounded-xl bg-[#6E9150] text-white font-black uppercase tracking-wide hover:bg-[#5e7d42] transition-colors"
      >
        До дашборду →
      </button>
    </div>
  )

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-6">
      <div className="text-5xl">⏳</div>
      <h1 className="text-2xl font-black text-gray-700">Оплата обробляється</h1>
      <p className="text-gray-500 max-w-sm">
        Статус платежу ще не підтверджено. Перевірте дашборд через кілька хвилин — Преміум активується автоматично після підтвердження.
      </p>
      <button
        onClick={() => navigate('/dashboard')}
        className="mt-4 px-6 py-2.5 rounded-xl border-2 border-gray-300 text-gray-600 font-semibold text-sm hover:border-gray-400 transition-colors"
      >
        До дашборду
      </button>
    </div>
  )
}
