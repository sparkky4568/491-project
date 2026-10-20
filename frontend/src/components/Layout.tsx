import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Icon } from './Icon'

/**
 * Call useDemoNotice(true) whenever practice or made-up (is_mock) scores are on screen.
 * The layout then shows the notice bar at the top. Never remove it while such scores are visible.
 */
const DemoNoticeContext = createContext<(on: boolean) => void>(() => {})
export function useDemoNotice(on: boolean) {
  const set = useContext(DemoNoticeContext)
  useEffect(() => {
    set(on)
    return () => set(false)
  }, [on, set])
}

export function Layout({ children }: { children: ReactNode }) {
  const [demo, setDemo] = useState(false)
  return (
    <DemoNoticeContext.Provider value={setDemo}>
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-white px-3 py-2 text-sm font-semibold focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to main content
      </a>

      {demo && (
        <div role="note" aria-label="Practice score notice" className="sticky top-0 z-40 bg-navy-900 text-white">
          <p className="mx-auto flex max-w-4xl items-center justify-center gap-2 px-4 py-2 text-center text-xs sm:text-sm">
            <Icon name="alert" className="h-4 w-4 text-brand-400" />
            <span>
              <strong className="font-semibold text-brand-300">Practice score.</strong> Not from the real AI scorer yet.
            </span>
          </p>
        </div>
      )}

      <div className="px-3 pt-3 sm:px-6 sm:pt-5">
        <header className="mx-auto flex max-w-4xl items-center rounded-2xl bg-white/75 px-4 py-3 shadow-[0_8px_30px_-12px_rgba(16,47,77,0.25)] ring-1 ring-navy-900/5 backdrop-blur sm:px-5">
          <a href="/" className="flex items-center gap-2.5">
            <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-900 text-brand-400">
              <Icon name="chat" className="h-4.5 w-4.5" />
            </span>
            <span className="text-lg font-extrabold tracking-tight text-navy-900">
              AVEN <span className="text-brand-700">Scorer</span>
            </span>
          </a>
        </header>
      </div>

      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>

      <footer className="border-t border-navy-900/5">
        <p className="mx-auto max-w-4xl px-4 py-6 text-sm text-navy-500 sm:px-6">
          AVEN Scorer · student capstone prototype. Don't paste real member data.
        </p>
      </footer>
    </DemoNoticeContext.Provider>
  )
}
