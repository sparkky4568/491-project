import { createContext, useContext, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { Icon } from './Icon'

/**
 * Pages call useDemoNotice(true) whenever made-up (is_mock) data is on screen.
 * The layout then shows the demo bar at the top. Never remove it while mock data is visible.
 */
const DemoNoticeContext = createContext<(on: boolean) => void>(() => {})
export function useDemoNotice(on: boolean) {
  const set = useContext(DemoNoticeContext)
  useEffect(() => {
    set(on)
    return () => set(false)
  }, [on, set])
}

const NAV = [
  { to: '/', label: 'Conversations', alsoActive: '/sessions/' },
  { to: '/issues', label: 'Problems' },
  { to: '/validation', label: 'Accuracy' },
  { to: '/about', label: 'How it works' },
]

export function Layout() {
  const [demo, setDemo] = useState(false)
  const { pathname, hash } = useLocation()

  // Start each new page at the top, unless the link points at a message.
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0)
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <DemoNoticeContext.Provider value={setDemo}>
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-white px-3 py-2 text-sm font-semibold focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to main content
      </a>

      {demo && (
        <div role="note" aria-label="Demo data notice" className="sticky top-0 z-40 bg-navy-900 text-white">
          <p className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-4 py-2 text-center text-xs sm:text-sm">
            <Icon name="alert" className="h-4 w-4 text-brand-400" />
            <span>
              <strong className="font-semibold text-brand-300">Demo data.</strong> Every conversation and score here is made up.
            </span>
          </p>
        </div>
      )}

      <div className="px-3 pt-3 sm:px-6 sm:pt-5">
        <header className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl bg-white/75 px-4 py-3 shadow-[0_8px_30px_-12px_rgba(16,47,77,0.25)] ring-1 ring-navy-900/5 backdrop-blur sm:px-5">
          <Link to="/" className="flex items-center gap-2.5">
            <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-900 text-brand-400">
              <Icon name="chat" className="h-4.5 w-4.5" />
            </span>
            <span className="text-lg font-extrabold tracking-tight text-navy-900">
              AVEN <span className="text-brand-700">Scorer</span>
            </span>
          </Link>
          <nav aria-label="Main" className="order-3 -mx-1 w-full overflow-x-auto sm:order-none sm:mx-0 sm:w-auto">
            <ul className="flex gap-1">
              {NAV.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) => {
                      const active = isActive || (item.alsoActive !== undefined && pathname.startsWith(item.alsoActive))
                      return `block rounded-xl px-3 py-1.5 text-sm font-semibold whitespace-nowrap transition ${
                        active ? 'bg-navy-900 text-white' : 'text-navy-600 hover:bg-navy-100 hover:text-navy-900'
                      }`
                    }}
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </header>
      </div>

      <main id="main" tabIndex={-1} className="outline-none">
        <Outlet />
      </main>

      <footer className="border-t border-navy-900/5">
        <p className="mx-auto max-w-6xl px-4 py-6 text-sm text-navy-500 sm:px-6">
          AVEN Scorer · student capstone prototype. No real member data, ever.
        </p>
      </footer>
    </DemoNoticeContext.Provider>
  )
}
