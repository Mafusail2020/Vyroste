import { useEffect, useState } from 'react'
import { Outlet, NavLink, Link, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import Logo from './Logo'
import ErrorBoundary from './ErrorBoundary'
import { useAuth } from '../contexts/AuthContext'

const NAV_LINKS = [
  { to: '/calendar', label: 'Регіональний календар' },
  { to: '/map',      label: 'Мапа розсадників' },
  { to: '/knowledge',label: 'База знань' },
  { to: '/blog',     label: 'Блог' },
  { to: '/agronom',  label: 'AI Агроном' },
  { to: '/about',    label: 'Про нас' },
  { to: '/contact',  label: 'Контакти' },
]

const underline =
  'absolute bottom-0 left-0 h-[2px] w-full rounded-full bg-forest scale-x-0 origin-right transition-transform duration-300 ease-out group-hover:scale-x-100 group-hover:origin-left'

export default function Layout() {
  const { user, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  // Close the mobile drawer whenever the route changes.
  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          <NavLink to="/">
            <Logo height={72} />
          </NavLink>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `group relative text-sm pb-0.5 transition-colors duration-200 ${
                    isActive ? 'text-forest font-semibold' : 'text-gray-600 hover:text-forest'
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
                  <span className={underline} aria-hidden="true" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3 ml-2">
                <Link
                  to="/login"
                  className="group relative text-sm pb-0.5 text-gray-600 hover:text-forest transition-colors duration-200"
                >
                  Увійти
                  <span className={underline} aria-hidden="true" />
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

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="md:hidden p-2 -mr-2 text-gray-700 hover:text-forest transition-colors"
            aria-label={menuOpen ? 'Закрити меню' : 'Відкрити меню'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile drawer */}
        {menuOpen && (
          <nav className="md:hidden border-t border-gray-100 bg-white px-6 py-4 flex flex-col gap-1 shadow-lg">
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `py-2.5 text-sm font-medium transition-colors ${
                    isActive ? 'text-forest font-semibold' : 'text-gray-700 hover:text-forest'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}

            <div className="border-t border-gray-100 mt-2 pt-3 flex flex-col gap-2">
              {user ? (
                <>
                  <NavLink to="/cabinet" className="py-2 text-sm font-medium text-gray-700 hover:text-forest">
                    Кабінет
                  </NavLink>
                  <button
                    onClick={() => signOut()}
                    className="self-start py-2 text-sm font-medium text-gray-700 hover:text-forest"
                  >
                    Вийти
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="py-2 text-sm font-medium text-gray-700 hover:text-forest">
                    Увійти
                  </Link>
                  <Link
                    to="/register"
                    className="text-center text-sm px-4 py-2.5 rounded-xl bg-[#6E9150] text-white font-semibold hover:bg-[#5e7d42] transition-colors"
                  >
                    Реєстрація
                  </Link>
                </>
              )}
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  )
}
