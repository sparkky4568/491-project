import { createContext, useContext, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { dataSource } from '../lib/data'
import { Icon } from './Icon'

const ThemeContext = createContext(false)
/** true when the dark theme is on. Charts use it to pick stroke colors. */
export const useIsDark = () => useContext(ThemeContext)

const NAV = [
  { to: '/', label: 'Sessions', end: true, alsoActive: '/sessions/' },
  { to: '/issues', label: 'Issue log' },
  { to: '/validation', label: 'Validation' },
  { to: '/about', label: 'About' },
]

export function Layout() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  const { pathname, hash } = useLocation()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    try {
      localStorage.setItem('aven-theme', dark ? 'dark' : 'light')
    } catch {
      // Storage can be blocked (private mode); the theme still works for this visit.
    }
  }, [dark])

  // Start each new page at the top, unless the link points at a turn.
  // (Runs on page changes only, not on hash changes within a page.)
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0)
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ThemeContext.Provider value={dark}>
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to main content
      </a>
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <Link to="/" className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            AVEN Scorer <span className="font-normal text-slate-500 dark:text-slate-400">·</span>{' '}
            <span className="font-normal text-slate-700 dark:text-slate-300">Review Console</span>
          </Link>
          <nav aria-label="Main" className="order-3 w-full sm:order-none sm:w-auto">
            <ul className="flex flex-wrap gap-1">
              {NAV.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) => {
                      const active = isActive || (item.alsoActive !== undefined && pathname.startsWith(item.alsoActive))
                      return `block rounded-md px-2.5 py-1.5 text-sm font-medium ${
                        active
                          ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                          : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`
                    }}
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <span
              className="hidden items-center gap-1.5 rounded-full border border-slate-300 px-2.5 py-1 text-xs text-slate-700 md:inline-flex dark:border-slate-600 dark:text-slate-300"
              title="Where data comes from. Set VITE_API_URL to switch to the Python API."
            >
              <Icon name="file" className="h-3.5 w-3.5" />
              Data: {dataSource.label}
            </span>
            <button
              type="button"
              onClick={() => setDark((d) => !d)}
              aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
              className="rounded-md border border-slate-300 p-1.5 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Icon name={dark ? 'sun' : 'moon'} />
            </button>
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="min-h-[70vh] outline-none">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 dark:border-slate-800">
        <p className="mx-auto max-w-7xl px-4 py-4 text-xs leading-relaxed text-slate-600 sm:px-6 dark:text-slate-400">
          Capstone prototype. No real member data or PHI. Thresholds are placeholders until the sponsor confirms them. Global
          ratings are advisory until the scorer is validated.
        </p>
      </footer>
    </ThemeContext.Provider>
  )
}
