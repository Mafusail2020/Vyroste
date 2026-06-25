import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import api from '../lib/api'

interface Profile {
  id: string
  region_id: string | null
  plot_type: string | null
  is_premium: boolean
  display_name: string | null
  avatar_url: string | null
}

interface Region {
  id: string
  region: string
  city: string
}

interface SavedArticle {
  article_id: string
  created_at: string
  article: { title: string; slug: string; cover_image: string | null } | null
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

  // Profile (avatar + name) editing
  const [name,        setName]        = useState('')
  const [avatarFile,  setAvatarFile]  = useState<File | null>(null)
  const [avatarPrev,  setAvatarPrev]  = useState<string | null>(null)
  const [confirming,  setConfirming]  = useState(false)
  const [savingMe,    setSavingMe]    = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.get<Profile>('/api/users/me')
      .then(r => { setProfile(r.data); setName(r.data.display_name ?? '') })
      .catch(() => {})
    api.get<Region[]>('/api/regions').then(r => setRegions(r.data)).catch(() => {})
    api.get<SavedArticle[]>('/api/users/me/saved-articles').then(r => setSaved(r.data)).catch(() => {})
  }, [])

  function pickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setAvatarFile(f)
    setAvatarPrev(URL.createObjectURL(f))
    setConfirming(false)   // a fresh change re-arms the Save button
    e.target.value = ''     // allow re-picking the same file later
  }

  const dirty = name !== (profile?.display_name ?? '') || avatarFile !== null
  const avatarSrc = avatarPrev ?? profile?.avatar_url ?? null

  async function saveProfile() {
    setSavingMe(true)
    try {
      let avatar_url = profile?.avatar_url ?? undefined
      if (avatarFile) {
        const fd = new FormData()
        fd.append('file', avatarFile)
        const up = await api.post<{ url: string }>('/api/users/me/avatar', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        avatar_url = up.data.url
      }
      const patch: Record<string, string> = { display_name: name.trim() }
      if (avatar_url) patch.avatar_url = avatar_url
      const r = await api.patch<Profile>('/api/users/me', patch)
      setProfile(r.data)
      setName(r.data.display_name ?? '')
      setAvatarFile(null)
      setAvatarPrev(null)
      toast.success('Збережено')
    } catch {
      toast.error('Не вдалось зберегти')
    } finally {
      setSavingMe(false)
      setConfirming(false)
    }
  }

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

          {/* Profile — avatar + display name */}
          <section className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-black text-xs uppercase tracking-wide text-gray-400 mb-5">Профіль</h2>

            <div className="flex items-center gap-5">
              {/* Avatar — click opens the file picker */}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="relative shrink-0 w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200 hover:border-forest transition-colors group"
                title="Змінити аватар"
              >
                {avatarSrc
                  ? <img src={avatarSrc} alt="Аватар" className="w-full h-full object-cover" />
                  : <span className="w-full h-full flex items-center justify-center bg-gray-100 text-3xl text-gray-400">👤</span>}
                <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                  Змінити
                </span>
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={pickAvatar} className="hidden" />

              {/* Name */}
              <div className="flex-1 min-w-0">
                <label className="block text-sm text-gray-500 mb-1.5">Імʼя</label>
                <input
                  type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Ваше імʼя"
                  className="w-full text-sm px-3 py-2.5 border-2 border-gray-200 rounded-xl bg-white focus:outline-none focus:border-forest"
                />
              </div>
            </div>

            {/* Save → confirm */}
            <div className="mt-5 flex justify-end items-center gap-3 min-h-[40px]">
              {!confirming ? (
                <button
                  onClick={() => setConfirming(true)}
                  disabled={!dirty || savingMe}
                  className="px-5 py-2.5 rounded-xl bg-forest text-white font-bold text-sm hover:bg-forest-dark transition-colors disabled:opacity-40"
                >
                  Зберегти зміни
                </button>
              ) : (
                <>
                  <span className="text-sm font-medium text-gray-600">Ви впевнені?</span>
                  <button
                    onClick={saveProfile}
                    disabled={savingMe}
                    className="px-5 py-2.5 rounded-xl bg-forest text-white font-bold text-sm hover:bg-forest-dark transition-colors disabled:opacity-60"
                  >
                    {savingMe ? 'Збереження…' : 'Так'}
                  </button>
                  <button
                    onClick={() => setConfirming(false)}
                    disabled={savingMe}
                    className="px-5 py-2.5 rounded-xl bg-white border-2 border-gray-200 text-gray-500 font-semibold text-sm hover:border-gray-300 transition-colors"
                  >
                    Ні
                  </button>
                </>
              )}
            </div>
          </section>

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
              <div key={s.article_id} className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3">
                {s.article?.cover_image
                  ? <img src={s.article.cover_image} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0" />
                  : <div className="w-11 h-11 rounded-lg bg-card-green flex items-center justify-center shrink-0">🔖</div>}
                <div className="min-w-0 flex-1">
                  {s.article ? (
                    <Link to={`/knowledge/${s.article.slug}`} className="text-sm font-semibold text-gray-800 hover:text-forest truncate block">
                      {s.article.title}
                    </Link>
                  ) : (
                    <p className="text-sm font-medium text-gray-400 truncate">Статтю видалено</p>
                  )}
                  <p className="text-xs text-gray-400">Збережено {new Date(s.created_at).toLocaleDateString('uk-UA')}</p>
                </div>
                <button onClick={() => unsave(s.article_id)} className="text-xs text-red-500 hover:text-red-600 shrink-0">
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
