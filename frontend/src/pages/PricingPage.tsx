import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import api from '../lib/api'

const FREE_FEATURES = [
  '5 культур у календарі',
  'Місячний календар',
  'Карта розсадників',
  'Базовий алгоритм посіву',
]

const PREMIUM_FEATURES = [
  'Необмежена кількість культур',
  'Місячний календар',
  'Карта розсадників',
  'GDD-прогрес у реальному часі',
  'Email-сповіщення про збір урожаю',
  'Пріоритетна підтримка',
]

export default function PricingPage() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const [loading, setLoading] = useState(false)

  async function handleCheckout() {
    if (!user) { navigate('/login'); return }
    setLoading(true)
    try {
      const { data } = await api.post<{ form_url: string; fields: Record<string, string> }>('/api/payments/checkout')
      const form = document.createElement('form')
      form.method = 'POST'
      form.action = data.form_url
      form.style.display = 'none'
      for (const [key, val] of Object.entries(data.fields)) {
        const input = document.createElement('input')
        input.type  = 'hidden'
        input.name  = key
        input.value = String(val)
        form.appendChild(input)
      }
      document.body.appendChild(form)
      form.submit()
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(detail ?? 'Помилка. Спробуйте ще раз.')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-black text-forest uppercase mb-3">Оберіть план</h1>
        <p className="text-gray-500">Почніть безкоштовно — оновіться коли будете готові</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">

        {/* Free */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-8">
          <div className="mb-6">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Безкоштовний</p>
            <div className="flex items-end gap-1">
              <span className="text-4xl font-black text-gray-800">0</span>
              <span className="text-gray-400 mb-1">грн/місяць</span>
            </div>
          </div>
          <ul className="space-y-3 mb-8">
            {FREE_FEATURES.map(f => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-gray-300">✓</span>
                {f}
              </li>
            ))}
          </ul>
          <button disabled className="w-full py-3 rounded-xl border-2 border-gray-200 text-gray-400 font-semibold text-sm cursor-default">
            Поточний план
          </button>
        </div>

        {/* Premium */}
        <div className="bg-forest rounded-2xl border-2 border-forest p-8 relative overflow-hidden">
          <div className="absolute top-4 right-4 bg-amber-400 text-amber-900 text-xs font-black px-2.5 py-1 rounded-full uppercase">
            Популярний
          </div>
          <div className="mb-6">
            <p className="text-xs font-bold text-white/60 uppercase tracking-wide mb-1">Преміум ⭐</p>
            <div className="flex items-end gap-1">
              <span className="text-4xl font-black text-white">299</span>
              <span className="text-white/60 mb-1">грн/рік</span>
            </div>
            <p className="text-white/50 text-xs mt-1">≈ 25 грн/місяць</p>
          </div>
          <ul className="space-y-3 mb-8">
            {PREMIUM_FEATURES.map(f => (
              <li key={f} className="flex items-center gap-2 text-sm text-white">
                <span className="text-amber-400">✓</span>
                {f}
              </li>
            ))}
          </ul>

          <button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-white text-forest font-black text-sm uppercase tracking-wide hover:bg-amber-50 transition-colors disabled:opacity-50"
          >
            {loading ? 'Завантаження...' : 'Отримати Преміум →'}
          </button>
          <p className="text-white/40 text-xs text-center mt-3">Оплата через WayForPay · Безпечно</p>
        </div>
      </div>

      <div className="text-center mt-12 text-sm text-gray-400">
        Є питання? Напишіть нам на{' '}
        <a href="mailto:hello@vyroste.ua" className="text-forest hover:underline">hello@vyroste.ua</a>
      </div>
    </div>
  )
}
