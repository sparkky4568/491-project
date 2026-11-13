/**
 * Whether the scorer API answers. No VITE_API_URL: Demo (practice scorer). Otherwise GET /health
 * with a 5 s timeout: an answer is Live, no answer is Offline. Offline never falls back to
 * practice scores on its own.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { DataError, apiUrl, checkHealth, usingRealScorer, type Health } from './data'

export type Connection =
  | { kind: 'demo' }
  | { kind: 'checking' }
  | { kind: 'live'; health: Health }
  | { kind: 'offline'; message: string; details: string[] }

interface ConnectionValue {
  connection: Connection
  /** Pings /health again and returns the new state. */
  recheck: () => Promise<Connection>
  apiUrl: string
}

const ConnectionContext = createContext<ConnectionValue>({
  connection: { kind: 'demo' },
  recheck: async () => ({ kind: 'demo' }),
  apiUrl: '',
})

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [connection, setConnection] = useState<Connection>(usingRealScorer ? { kind: 'checking' } : { kind: 'demo' })
  const latest = useRef(0)

  const recheck = useCallback(async (): Promise<Connection> => {
    if (!usingRealScorer) return { kind: 'demo' }
    const ticket = ++latest.current
    setConnection((c) => (c.kind === 'live' ? c : { kind: 'checking' }))
    let next: Connection
    try {
      next = { kind: 'live', health: await checkHealth() }
    } catch (err) {
      next = {
        kind: 'offline',
        message: err instanceof Error ? err.message : String(err),
        details: err instanceof DataError ? err.details : [],
      }
    }
    if (ticket === latest.current) setConnection(next)
    return next
  }, [])

  useEffect(() => {
    void recheck()
  }, [recheck])

  const value = useMemo(() => ({ connection, recheck, apiUrl }), [connection, recheck])
  return <ConnectionContext.Provider value={value}>{children}</ConnectionContext.Provider>
}

export function useConnection(): ConnectionValue {
  return useContext(ConnectionContext)
}
