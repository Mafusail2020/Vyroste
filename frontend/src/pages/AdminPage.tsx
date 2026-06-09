import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'

interface Nursery {
  id: string
  name: string
  description: string | null
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  latitude: number
  longitude: number
  created_at: string
}

interface Profile {
  is_admin: boolean
}

export default function AdminPage() {
  const [isAdmin,    setIsAdmin]    = useState<boolean | null>(null)
  const [nurseries,  setNurseries]  = useState<Nursery[]>([])
  const [loading,    setLoading]    = useState(true)
  const [acting,     setActing]     = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      api.get<Profile>('/api/users/me'),
      api.get<Nursery[]>('/api/admin/nurseries').catch(() => ({ data: [] })),
    ]).then(([pr, nr]) => {
      setIsAdmin(pr.data.is_admin === true)
      setNurseries(nr.data)
    }).catch(() => {
      setIsAdmin(false)
    }).finally(() => setLoading(false))
  }, [])

  async function setStatus(id: string, status: 'verified' | 'rejected') {
    setActing(id)
    try {
      await api.patch(`/api/admin/nurseries/${id}/status`, { status })
      setNurseries(prev => prev.filter(n => n.id !== id))
    } finally {
      setActing(null)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-8 h-8 border-4 border-forest border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!isAdmin) return (
    <div className="max-w-xl mx-auto px-6 py-20 text-center">
      <div className="text-5xl mb-4">🔒</div>
      <h2 className="text-2xl font-black text-gray-700 uppercase mb-3">Доступ заборонено</h2>
      <p className="text-gray-400 mb-8 text-sm">Ця сторінка доступна лише адміністраторам.</p>
      <Link to="/dashboard" className="text-forest hover:underline text-sm">← До дашборду</Link>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 pb-16">

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-forest uppercase">Адміністрування</h1>
          <p className="text-sm text-gray-400 mt-0.5">Розсадники на перевірці</p>
        </div>
        <span className="text-sm font-semibold bg-amber-100 text-amber-700 px-3 py-1 rounded-full">
          {nurseries.length} очікують
        </span>
      </div>

      {nurseries.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-4xl mb-3">✅</div>
          <p>Немає заявок на перевірку</p>
        </div>
      ) : (
        <div className="space-y-4">
          {nurseries.map(n => (
            <div key={n.id} className="bg-white border border-gray-200 rounded-2xl p-6">
              <div className="flex items-start justify-between gap-4">

                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-800 text-lg mb-1">{n.name}</h3>
                  {n.description && (
                    <p className="text-sm text-gray-500 mb-3">{n.description}</p>
                  )}

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                    {n.address && <span>📍 {n.address}</span>}
                    {n.phone && (
                      <span>📞 <a href={`tel:${n.phone}`} className="text-forest hover:underline">{n.phone}</a></span>
                    )}
                    {n.email && (
                      <span>✉️ <a href={`mailto:${n.email}`} className="text-forest hover:underline">{n.email}</a></span>
                    )}
                    {n.website && (
                      <span>🌐 <a href={n.website} target="_blank" rel="noopener noreferrer" className="text-forest hover:underline">
                        {n.website.replace(/^https?:\/\//, '')}
                      </a></span>
                    )}
                  </div>

                  <div className="mt-2 text-xs text-gray-300">
                    Координати: {n.latitude.toFixed(4)}, {n.longitude.toFixed(4)}
                    {' · '}
                    Подано: {new Date(n.created_at).toLocaleDateString('uk-UA')}
                  </div>
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() => setStatus(n.id, 'verified')}
                    disabled={acting === n.id}
                    className="px-4 py-2 bg-forest text-white text-sm font-bold rounded-xl hover:bg-forest-dark transition-colors disabled:opacity-40 flex items-center gap-1.5"
                  >
                    {acting === n.id ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '✓'}
                    Верифікувати
                  </button>
                  <button
                    onClick={() => setStatus(n.id, 'rejected')}
                    disabled={acting === n.id}
                    className="px-4 py-2 border-2 border-red-200 text-red-500 text-sm font-bold rounded-xl hover:bg-red-50 transition-colors disabled:opacity-40"
                  >
                    ✗ Відхилити
                  </button>
                  <a
                    href={`https://maps.google.com/?q=${n.latitude},${n.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-1.5 border border-gray-200 text-gray-500 text-xs rounded-xl hover:bg-gray-50 transition-colors text-center"
                  >
                    🗺️ Перевірити місце
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
