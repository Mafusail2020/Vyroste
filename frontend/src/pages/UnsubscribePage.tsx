import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../lib/api'

type State = 'loading' | 'ok' | 'error'

/* Public page hit from the unsubscribe link in newsletter emails:
 * /unsubscribe?u=<user-id>&t=<hmac-token>. Calls the public endpoint
 * which verifies the token and sets newsletter_opt_out. */
export default function UnsubscribePage() {
  const [params] = useSearchParams()
  const [state, setState] = useState<State>('loading')

  const u = params.get('u') ?? ''
  const t = params.get('t') ?? ''

  useEffect(() => {
    if (!u || !t) { setState('error'); return }
    api.get('/api/newsletter/unsubscribe', { params: { u, t } })
      .then(() => setState('ok'))
      .catch(() => setState('error'))
  }, [u, t])

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6 py-16">
      <div className="max-w-md text-center">
        {state === 'loading' && (
          <div className="w-8 h-8 mx-auto border-4 border-forest border-t-transparent rounded-full animate-spin" />
        )}

        {state === 'ok' && (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-2xl font-black text-forest uppercase mb-2">Ви відписались</h1>
            <p className="text-gray-500 mb-6">Більше не надсилатимемо вам щотижневу розсилку. Особисті сповіщення (наприклад, про збір врожаю) це не зачіпає.</p>
            <Link to="/" className="inline-block px-6 py-2.5 rounded-xl bg-[#6E9150] text-white font-bold text-sm hover:bg-[#5e7d42] transition-colors">На головну</Link>
          </>
        )}

        {state === 'error' && (
          <>
            <div className="text-5xl mb-4">⚠️</div>
            <h1 className="text-2xl font-black text-gray-700 uppercase mb-2">Посилання недійсне</h1>
            <p className="text-gray-500 mb-6">Не вдалось обробити запит на відписку. Скористайтесь посиланням із останнього листа або напишіть нам.</p>
            <Link to="/contact" className="inline-block px-6 py-2.5 rounded-xl bg-[#6E9150] text-white font-bold text-sm hover:bg-[#5e7d42] transition-colors">Звʼязатися</Link>
          </>
        )}
      </div>
    </div>
  )
}
