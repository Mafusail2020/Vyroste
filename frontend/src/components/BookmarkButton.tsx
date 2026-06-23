import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import api from '../lib/api'

interface SavedRow { article_id: string }

/** Toggle a Knowledge-Base bookmark. Hidden for logged-out users. */
export default function BookmarkButton({ articleId }: { articleId: string }) {
  const { user } = useAuth()
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!user) return
    api.get<SavedRow[]>('/api/users/me/saved-articles')
      .then(r => setSaved(r.data.some(s => s.article_id === articleId)))
      .catch(() => {})
  }, [user, articleId])

  if (!user) return null

  async function toggle() {
    setBusy(true)
    try {
      if (saved) {
        await api.delete(`/api/users/me/saved-articles/${articleId}`)
        setSaved(false)
      } else {
        await api.post(`/api/users/me/saved-articles/${articleId}`)
        setSaved(true)
        toast.success('Збережено в кабінет')
      }
    } catch {
      toast.error('Помилка')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold border-2 transition-colors disabled:opacity-50 ${
        saved ? 'border-forest bg-forest/5 text-forest' : 'border-gray-200 text-gray-600 hover:border-forest/40'
      }`}
    >
      {saved ? '🔖 Збережено' : '🔖 Зберегти'}
    </button>
  )
}
