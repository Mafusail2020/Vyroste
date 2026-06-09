import { Outlet, NavLink } from 'react-router-dom'
import Logo from './Logo'

const NAV_LINKS = [
  { to: '/calendar', label: 'Регіональний календар' },
  { to: '/map',      label: 'Мапа розсадників' },
  { to: '/knowledge',label: 'База знань' },
  { to: '/blog',     label: 'Блог' },
  { to: '/about',    label: 'Про нас' },
  { to: '/contact',  label: 'Контакти' },
]

export default function Layout() {
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
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
