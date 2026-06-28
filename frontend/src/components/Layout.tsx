import { Outlet, NavLink, Link } from 'react-router-dom'
import Logo from './Logo'
import ErrorBoundary from './ErrorBoundary'
import { useAuth } from '../contexts/AuthContext'

const NAV_LINKS = [
  { to: '/calendar', label: 'Регіональний календар' },
  { to: '/agronom',  label: 'AI Агроном 🔬' },
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
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          <NavLink to="/">
            <Logo height={72} />
          </NavLink>

          <nav className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `group relative text-sm pb-0.5 transition-colors duration-200 ${
                    isActive
                      ? 'text-forest font-semibold'
                      : 'text-gray-600 hover:text-forest'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {label}
                    <span
                      className={`absolute bottom-0 left-0 h-[2px] w-full rounded-full bg-forest transition-transform duration-300 ease-out ${isActive ? 'scale-x-100' : 'scale-x-0 origin-right group-hover:scale-x-100 group-hover:origin-left'}`}
                      aria-hidden="true"
                    />
                  </>
                )}
              </NavLink>
            ))}

            {user ? (
              <>
                <NavLink
                  to="/cabinet"
                  className={({ isActive }) =>
                    `group relative text-sm pb-0.5 transition-colors duration-200 ${
                      isActive ? 'text-forest font-semibold' : 'text-gray-600 hover:text-forest'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      Кабінет
                      <span
                        className={`absolute bottom-0 left-0 h-[2px] w-full rounded-full bg-forest transition-transform duration-300 ease-out ${isActive ? 'scale-x-100' : 'scale-x-0 origin-right group-hover:scale-x-100 group-hover:origin-left'}`}
                        aria-hidden="true"
                      />
                    </>
                  )}
                </NavLink>
                <button
                  onClick={() => signOut()}
                  className="group relative text-sm pb-0.5 text-gray-600 hover:text-forest transition-colors duration-200"
                >
                  Вийти
                  <span className="absolute bottom-0 left-0 h-[2px] w-full rounded-full bg-forest scale-x-0 origin-right transition-transform duration-300 ease-out group-hover:scale-x-100 group-hover:origin-left" aria-hidden="true" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3 ml-2">
                <Link
                  to="/login"
                  className="group relative text-sm pb-0.5 text-gray-600 hover:text-forest transition-colors duration-200"
                >
                  Увійти
                  <span className="absolute bottom-0 left-0 h-[2px] w-full rounded-full bg-forest scale-x-0 origin-right transition-transform duration-300 ease-out group-hover:scale-x-100 group-hover:origin-left" aria-hidden="true" />
                </Link>
                <Link
                  to="/register"
                  className="text-sm px-4 py-2 rounded-xl bg-[#6E9150] text-white font-semibold hover:bg-[#5e7d42] transition-colors"
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
