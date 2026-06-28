import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import Logo from '../components/Logo'

export default function RegisterPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    if (password !== confirm) {
      toast.error('Паролі не співпадають')
      return
    }
    if (password.length < 6) {
      toast.error('Пароль має містити щонайменше 6 символів')
      return
    }

    setLoading(true)
    try {
      await signUp(email, password)
      setSuccess(true)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Помилка реєстрації')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="flex justify-center mb-8">
            <Logo size="lg" showSubtitle />
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="text-4xl mb-4">🌱</div>
            <h2 className="text-xl font-black text-forest uppercase mb-2">Перевірте пошту</h2>
            <p className="text-gray-500 text-sm mb-6">
              Ми надіслали підтвердження на <strong>{email}</strong>. Перейдіть за посиланням, щоб активувати акаунт.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 rounded-xl bg-[#6E9150] text-white font-bold text-sm uppercase tracking-wide hover:bg-[#5e7d42] transition-colors"
            >
              До входу
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Link to="/"><Logo size="lg" showSubtitle /></Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h1 className="text-2xl font-black text-forest uppercase mb-6">Реєстрація</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:border-forest text-sm"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:border-forest text-sm"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Підтвердження пароля</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:border-forest text-sm"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#6E9150] text-white font-bold text-sm uppercase tracking-wide hover:bg-[#5e7d42] transition-colors disabled:opacity-60"
            >
              {loading ? 'Завантаження...' : 'Зареєструватись'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Вже є акаунт?{' '}
            <Link to="/login" className="text-forest font-semibold hover:underline">
              Увійти
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
