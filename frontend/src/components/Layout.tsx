import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { hrefFor, type Route } from '../lib/router'
import { ConnectionIndicator } from './ConnectionIndicator'
import { Icon, type IconName } from './Icon'
import { focusRing } from './ui'

/** Alex's how-to guide (a claude.ai doc). People need access to it there, via the doc's Share button. */
const GUIDE_URL = 'https://claude.ai/artifact/ApSMt4WjaMBGZEoxzYjg6H'

/**
 * 'practice': keyword-rule practice scores (or the Score page in demo mode).
 * 'mock': a loaded or scored file marked is_mock (invented data). null: nothing made-up on screen.
 */
export type DemoNotice = 'practice' | 'mock' | null

/**
 * Call useDemoNotice('practice' | 'mock') whenever practice or made-up (is_mock) scores are on screen.
 * The layout then shows the dark notice bar at the top of Main. Never remove it while such scores are visible.
 */
const DemoNoticeContext = createContext<(notice: DemoNotice) => void>(() => {})
export function useDemoNotice(notice: DemoNotice) {
  const set = useContext(DemoNoticeContext)
  useEffect(() => {
    set(notice)
    return () => set(null)
  }, [notice, set])
}

const NAV: Array<{ page: 'runs' | 'score'; label: string; icon: IconName }> = [
  { page: 'runs', label: 'Runs', icon: 'list' },
  { page: 'score', label: 'Score a call', icon: 'plus' },
]

function navItemClass(active: boolean) {
  return `flex h-10 items-center gap-2.5 rounded-md px-3 type-small-strong transition ${focusRing} ${
    active ? 'bg-action-hover text-white' : 'text-on-dark-muted hover:text-white'
  }`
}

function Logo() {
  return (
    <a href={hrefFor({ page: 'runs' })} className={`flex items-center gap-3 rounded-md ${focusRing}`}>
      <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-md bg-action-hover text-brand">
        <Icon name="chat" className="h-[18px] w-[18px]" />
      </span>
      <span className="leading-tight">
        <span className="block type-h3 text-white">AVEN Scorer</span>
        <span className="block type-caption text-on-dark-muted max-lg:hidden">Review console</span>
      </span>
    </a>
  )
}

function NavItems({ route, onNavigate }: { route: Route; onNavigate?: () => void }) {
  const current = route.page === 'session' ? 'runs' : route.page
  return (
    <ul className="space-y-1">
      {NAV.map((item) => {
        const active = current === item.page
        return (
          <li key={item.page}>
            <a
              href={hrefFor({ page: item.page })}
              aria-current={active ? 'page' : undefined}
              className={navItemClass(active)}
              onClick={onNavigate}
            >
              <Icon name={item.icon} className="h-[18px] w-[18px]" />
              {item.label}
            </a>
          </li>
        )
      })}
      <li>
        <a href={GUIDE_URL} target="_blank" rel="noopener noreferrer" className={navItemClass(false)}>
          <Icon name="book" className="h-[18px] w-[18px]" />
          Guide
          <span className="sr-only">(opens the team guide in a new tab)</span>
        </a>
      </li>
    </ul>
  )
}

function Breadcrumb({ route }: { route: Route }) {
  if (route.page === 'session')
    return (
      <nav aria-label="Breadcrumb">
        <ol className="flex min-w-0 items-center gap-2 type-small">
          <li>
            <a href={hrefFor({ page: 'runs' })} className={`text-link hover:underline ${focusRing} rounded-sm`}>
              Runs
            </a>
          </li>
          <li aria-hidden="true" className="text-muted">
            /
          </li>
          <li aria-current="page" className="min-w-0 truncate font-semibold text-ink">
            {route.sessionId}
          </li>
        </ol>
      </nav>
    )
  return <p className="type-small font-semibold text-ink">{route.page === 'score' ? 'Score a call' : 'Runs'}</p>
}

function DemoBanner({ notice }: { notice: Exclude<DemoNotice, null> }) {
  return (
    <div
      role="note"
      aria-label={notice === 'practice' ? 'Practice score notice' : 'Mock data notice'}
      className="z-30 border-t border-white/10 bg-sidebar px-4 py-2.5 text-white lg:sticky lg:top-0 lg:border-t-0 lg:px-10"
    >
      <p className="flex items-start gap-2 type-small">
        <Icon name="alert" className="mt-0.5 h-4 w-4 text-brand-soft" />
        {notice === 'practice' ? (
          <span>
            <strong className="font-semibold text-brand-soft">Practice score.</strong> Keyword rules in the browser, not the real
            AI scorer.
          </span>
        ) : (
          <span>
            <strong className="font-semibold text-brand-soft">Mock data.</strong> This file is marked is_mock, so its scores are
            made up.
          </span>
        )}
      </p>
    </div>
  )
}

export function Layout({ route, children }: { route: Route; children: ReactNode }) {
  const [demo, setDemo] = useState<DemoNotice>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        menuButton.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  return (
    <DemoNoticeContext.Provider value={setDemo}>
      <a
        href="#main"
        onClick={(e) => {
          e.preventDefault()
          mainRef.current?.focus()
        }}
        className="sr-only z-50 rounded-md bg-surface px-3 py-2 type-small-strong text-ink focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to main content
      </a>

      <div className="min-h-screen lg:flex">
        {/* Desktop sidebar */}
        <aside className="hidden w-60 shrink-0 bg-sidebar lg:block">
          <div className="sticky top-0 flex h-screen flex-col gap-1 px-4 py-6">
            <div className="mb-6 px-2">
              <Logo />
            </div>
            <nav aria-label="Main">
              <NavItems route={route} />
            </nav>
            <p className="mt-auto px-2 type-caption text-on-dark-muted">
              Student capstone prototype. Do not paste real member data.
            </p>
          </div>
        </aside>

        {/* Mobile app bar */}
        <header className="sticky top-0 z-40 bg-sidebar lg:hidden">
          <div className="flex items-center gap-3 px-4 py-3">
            <Logo />
            <span className="ml-auto">
              <ConnectionIndicator compact />
            </span>
            <button
              ref={menuButton}
              type="button"
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              onClick={() => setMenuOpen((o) => !o)}
              className={`flex h-11 w-11 items-center justify-center rounded-md text-white hover:bg-action-hover ${focusRing}`}
            >
              <Icon name={menuOpen ? 'x' : 'menu'} className="h-6 w-6" />
              <span className="sr-only">{menuOpen ? 'Close menu' : 'Open menu'}</span>
            </button>
          </div>
          {menuOpen && (
            <nav id="mobile-nav" aria-label="Main" className="border-t border-white/10 px-4 pt-2 pb-4">
              <NavItems route={route} onNavigate={() => setMenuOpen(false)} />
              <p className="mt-4 px-3 type-caption text-on-dark-muted">
                Student capstone prototype. Do not paste real member data.
              </p>
            </nav>
          )}
        </header>

        <div className="min-w-0 flex-1">
          {demo && <DemoBanner notice={demo} />}
          <div className="hidden items-center justify-between gap-4 border-b border-divider bg-surface px-10 py-3.5 lg:flex">
            <Breadcrumb route={route} />
            <ConnectionIndicator />
          </div>
          <main id="main" ref={mainRef} tabIndex={-1} className="outline-none">
            <div className="mx-auto w-full max-w-[1120px] px-4 pt-4 pb-12 sm:px-6 lg:px-10 lg:pt-8">{children}</div>
          </main>
        </div>
      </div>
    </DemoNoticeContext.Provider>
  )
}
