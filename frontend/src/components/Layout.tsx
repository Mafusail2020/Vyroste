import { Outlet, NavLink, Link } from 'react-router-dom'
import Logo from './Logo'
import ErrorBoundary from './ErrorBoundary'
import { useAuth } from '../contexts/AuthContext'

const NAV_LINKS = [
  { to: '/calendar', label: 'Регіональний календар' },
  { to: '/map',      label: 'Мапа розсадників' },
  { to: '/knowledge',label: 'База знань' },
  { to: '/blog',     label: 'Блог' },
  { to: '/about',    label: 'Про нас' },
  { to: '/contact',  label: 'Контакти' },
]

export default function Layout() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <NavLink to="/">
            <Logo size="sm" showSubtitle={true} />
          </NavLink>

          <nav className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `text-sm transition-colors ${
                    isActive
                      ? 'text-forest font-semibold'
                      : 'text-gray-600 hover:text-forest'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}

            {user ? (
              <button
                onClick={() => signOut()}
                className="text-sm text-gray-600 hover:text-forest transition-colors"
              >
                Вийти
              </button>
            ) : (
              <div className="flex items-center gap-3 ml-2">
                <Link
                  to="/login"
                  className="text-sm text-gray-600 hover:text-forest transition-colors"
                >
                  Увійти
                </Link>
                <Link
                  to="/register"
                  className="text-sm px-4 py-2 rounded-xl bg-forest text-white font-semibold hover:bg-forest-dark transition-colors"
                >
                  Реєстрація
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  )
}
