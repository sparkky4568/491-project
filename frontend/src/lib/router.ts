/**
 * Hash routes, no router dependency:
 *   #/runs                         the scored runs list
 *   #/score                        score a call
 *   #/session/{session_id}/{tab}   one session (tab: summary, transcript, flow, clinician, issues, details)
 * Browser back works and deep links open a tab.
 */
import { useSyncExternalStore } from 'react'

export const SESSION_TABS = ['summary', 'transcript', 'flow', 'clinician', 'issues', 'details'] as const
export type SessionTab = (typeof SESSION_TABS)[number]

export type Route = { page: 'runs' } | { page: 'score' } | { page: 'session'; sessionId: string; tab: SessionTab }

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  if (parts[0] === 'score') return { page: 'score' }
  if (parts[0] === 'session' && parts[1]) {
    let sessionId = parts[1]
    try {
      sessionId = decodeURIComponent(parts[1])
    } catch {
      // keep the raw text
    }
    const tab = (SESSION_TABS as readonly string[]).includes(parts[2] ?? '') ? (parts[2] as SessionTab) : 'summary'
    return { page: 'session', sessionId, tab }
  }
  return { page: 'runs' }
}

export function hrefFor(route: Route): string {
  switch (route.page) {
    case 'runs':
      return '#/runs'
    case 'score':
      return '#/score'
    case 'session':
      return `#/session/${encodeURIComponent(route.sessionId)}/${route.tab}`
  }
}

export function navigate(route: Route, { replace = false } = {}) {
  const href = hrefFor(route)
  if (replace) window.history.replaceState(null, '', href)
  else window.history.pushState(null, '', href)
  // pushState / replaceState do not fire hashchange; tell subscribers ourselves.
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange)
  window.addEventListener('popstate', onChange)
  return () => {
    window.removeEventListener('hashchange', onChange)
    window.removeEventListener('popstate', onChange)
  }
}

/** The current hash; components re-render when it changes. */
export function useHash(): string {
  return useSyncExternalStore(subscribe, () => window.location.hash)
}

export function useRoute(): Route {
  return parseHash(useHash())
}
