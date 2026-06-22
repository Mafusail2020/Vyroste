import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import api from '../lib/api'

interface Profile {
  id: string
  region_id: string | null
  plot_type: string | null
  is_premium: boolean
}

interface Region {
  id: string
  region: string
  city: string
}

interface SavedArticle {
  article_id: string
  created_at: string
}

const PLOT_TYPES = [
  { value: 'balcony', label: 'Балкон', icon: '🪴' },
  { value: 'dacha',   label: 'Дача',   icon: '🏡' },
  { value: 'garden',  label: 'Город',  icon: '🌿' },
] as const

type Tab = 'settings' | 'saved'

export default function CabinetPage() {
  const { user, signOut } = useAuth()
  const [tab,      setTab]      = useState<Tab>('settings')
  const [profile,  setProfile]  = useState<Profile | null>(null)
  const [regions,  setRegions]  = useState<Region[]>([])
  const [saved,    setSaved]    = useState<SavedArticle[]>([])
  const [saving,   setSaving]   = useState(false)

  useEffect(() => {
    api.get<Profile>('/api/users/me').then(r => setProfile(r.data)).catch(() => {})
    api.get<Region[]>('/api/regions').then(r => setRegions(r.data)).catch(() => {})
    api.get<SavedArticle[]>('/api/users/me/saved-articles').then(r => setSaved(r.data)).catch(() => {})
  }, [])

  async function patchProfile(patch: Partial<Pick<Profile, 'region_id' | 'plot_type'>>) {
    setSaving(true)
    try {
      const r = await api.patch<Profile>('/api/users/me', patch)
      setProfile(r.data)
      toast.success('Збережено')
    } catch {
      toast.error('Не вдалось зберегти')
    } finally {
      setSaving(false)
    }
  }

  async function unsave(articleId: string) {
    await api.delete(`/api/users/me/saved-articles/${articleId}`).catch(() => {})
    setSaved(prev => prev.filter(s => s.article_id !== articleId))
  }

  const regionName = regions.find(r => r.id === profile?.region_id)?.region

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-black text-forest uppercase mb-1">Персональний кабінет</h1>
      <p className="text-gray-500 mb-8">{user?.email}</p>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-8">
        {([['settings', 'Налаштування'], ['saved', 'Збережені статті']] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative px-4 py-2.5 text-sm font-semibold transition-colors ${
              tab === t ? 'text-forest' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {label}
            {t === 'saved' && saved.length > 0 && (
              <span className="ml-1.5 text-xs bg-forest/10 text-forest rounded-full px-1.5">{saved.length}</span>
            )}
            {tab === t && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-forest rounded-full" />}
          </button>
        ))}
      </div>

      {/* ── Settings ──────────────────────────────────────────────────── */}
      {tab === 'settings' && (
        <div className="space-y-8">

          {/* Account */}
          <section className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-black text-xs uppercase tracking-wide text-gray-400 mb-4">Акаунт</h2>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-500">Email</span>
              <span className="text-sm font-medium text-gray-800">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-gray-50">
              <span className="text-sm text-gray-500">Тариф</span>
              {profile?.is_premium ? (
                <span className="text-sm font-bold text-forest">⭐ Преміум</span>
              ) : (
                <Link to="/pricing" className="text-sm font-semibold text-forest hover:underline">Безкоштовний · Отримати Преміум →</Link>
              )}
            </div>
            <button
              onClick={() => signOut()}
              className="mt-4 text-sm text-red-500 hover:text-red-600 font-semibold"
            >
              Вийти з акаунту
            </button>
          </section>

          {/* Region */}
          <section className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-black text-xs uppercase tracking-wide text-gray-400 mb-1">Регіон</h2>
            <p className="text-xs text-gray-400 mb-4">Визначає терміни посіву у вашому календарі{regionName ? ` · зараз: ${regionName}` : ''}</p>
            <select
              value={profile?.region_id ?? ''}
              onChange={e => patchProfile({ region_id: e.target.value })}
              disabled={saving}
              className="w-full text-sm px-3 py-2.5 border-2 border-gray-200 rounded-xl bg-white focus:outline-none focus:border-forest"
            >
              <option value="" disabled>Оберіть регіон...</option>
              {regions.map(r => <option key={r.id} value={r.id}>{r.region}</option>)}
            </select>
          </section>

          {/* Plot type */}
          <section className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-black text-xs uppercase tracking-wide text-gray-400 mb-4">Тип ділянки</h2>
            <div className="grid grid-cols-3 gap-3">
              {PLOT_TYPES.map(({ value, label, icon }) => (
                <button
                  key={value}
                  onClick={() => patchProfile({ plot_type: value })}
                  disabled={saving}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${
                    profile?.plot_type === value ? 'border-forest bg-forest/5' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-2xl">{icon}</span>
                  <span className={`text-sm font-semibold ${profile?.plot_type === value ? 'text-forest' : 'text-gray-600'}`}>{label}</span>
                </button>
              ))}
            </div>
          </section>

          <p className="text-xs text-gray-400">
            Культури редагуються у <Link to="/calendar" className="text-forest hover:underline">календарі</Link>.
          </p>
        </div>
      )}

      {/* ── Saved articles ────────────────────────────────────────────── */}
      {tab === 'saved' && (
        saved.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">🔖</div>
            <p className="font-semibold text-gray-500">Ще немає збережених статей</p>
            <p className="text-sm mt-1">База знань скоро з'явиться — зможете зберігати корисні гіди сюди.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {saved.map(s => (
              <div key={s.article_id} className="flex items-center justify-between bg-white rounded-xl border border-gray-100 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">Стаття {s.article_id.slice(0, 8)}</p>
                  <p className="text-xs text-gray-400">Збережено {new Date(s.created_at).toLocaleDateString('uk-UA')}</p>
                </div>
                <button onClick={() => unsave(s.article_id)} className="text-xs text-red-500 hover:text-red-600 shrink-0 ml-3">
                  Видалити
                </button>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
