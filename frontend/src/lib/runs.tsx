/**
 * The sessions the console has open, shared by the Runs list and the session views.
 * Kept in memory only: nothing is uploaded and nothing is written to browser storage.
 *
 * Sessions come from four places:
 *   file      ScoredSession v0.2 files opened with "Load scored files"
 *   stored    GET /sessions + GET /sessions/{id} from the live scorer API
 *   api       POST /score on the live scorer API
 *   practice  the keyword-rule practice scorer in this browser
 *   pasted    ScoredSession JSON pasted into the Score a call box
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useConnection } from './connection'
import { DataError, getApiSession, listApiSessions } from './data'
import { loadScoredFiles, type LoadError } from './loadScored'
import type { ScoredSession } from './schema'

export type SessionOrigin = 'file' | 'stored' | 'api' | 'practice' | 'pasted'

export interface RunEntry {
  session: ScoredSession
  origin: SessionOrigin
  /** The file it was read from (file and stored origins). */
  fileName?: string
}

export type ApiSync =
  | { status: 'idle' }
  | { status: 'loading'; total: number | null; done: number }
  | { status: 'ready'; count: number }
  /** The API runs without --sessions-dir, so it has no stored sessions to list. */
  | { status: 'none' }
  | { status: 'error'; message: string; details: string[] }

interface RunsValue {
  entries: RunEntry[]
  get: (sessionId: string) => RunEntry | undefined
  add: (entries: RunEntry[]) => void
  /** Opens files; good files load even when others fail. Returns the opened entries. */
  openFiles: (files: Iterable<File>) => Promise<{ opened: RunEntry[]; errors: LoadError[] }>
  loadErrors: LoadError[]
  clearLoadErrors: () => void
  apiSync: ApiSync
  syncApi: () => Promise<void>
  /** Fetches one stored session from the API (for deep links). */
  fetchStored: (sessionId: string) => Promise<RunEntry>
}

const RunsContext = createContext<RunsValue | null>(null)

export function RunsProvider({ children }: { children: ReactNode }) {
  const [byId, setById] = useState<Map<string, RunEntry>>(new Map())
  const [loadErrors, setLoadErrors] = useState<LoadError[]>([])
  const [apiSync, setApiSync] = useState<ApiSync>({ status: 'idle' })
  const { connection } = useConnection()
  const syncing = useRef(false)

  const add = useCallback((list: RunEntry[]) => {
    if (list.length === 0) return
    setById((cur) => {
      const next = new Map(cur)
      for (const e of list) next.set(e.session.session_id, e)
      return next
    })
  }, [])

  const openFiles = useCallback(
    async (files: Iterable<File>) => {
      const { loaded, errors } = await loadScoredFiles(files)
      const opened = loaded.map((l): RunEntry => ({ session: l.session, origin: 'file', fileName: l.fileName }))
      add(opened)
      setLoadErrors(errors)
      return { opened, errors }
    },
    [add],
  )

  const syncApi = useCallback(async () => {
    if (syncing.current) return
    syncing.current = true
    setApiSync({ status: 'loading', total: null, done: 0 })
    try {
      const list = await listApiSessions()
      if (list === null) {
        setApiSync({ status: 'none' })
        return
      }
      setApiSync({ status: 'loading', total: list.sessions.length, done: 0 })
      const errors: LoadError[] = list.unreadable.map((f) => ({
        fileName: f,
        message: 'The scorer API could not read this file in its sessions folder.',
      }))
      const opened: RunEntry[] = []
      let done = 0
      // A few at a time: the API serializes nothing here, but there is no need to flood it.
      const queue = [...list.sessions]
      const worker = async () => {
        for (let next = queue.shift(); next; next = queue.shift()) {
          const summary = next
          const fileName = summary.file ?? `${summary.session_id}.json`
          try {
            opened.push({ session: await getApiSession(summary.session_id), origin: 'stored', fileName })
          } catch (err) {
            errors.push({
              fileName,
              message: err instanceof Error ? err.message : String(err),
              details: err instanceof DataError ? err.details : undefined,
            })
          }
          done++
          setApiSync({ status: 'loading', total: list.sessions.length, done })
        }
      }
      await Promise.all([worker(), worker(), worker(), worker()])
      add(opened)
      if (errors.length > 0) setLoadErrors((cur) => [...cur, ...errors])
      setApiSync({ status: 'ready', count: opened.length })
    } catch (err) {
      setApiSync({
        status: 'error',
        message: err instanceof Error ? err.message : String(err),
        details: err instanceof DataError ? err.details : [],
      })
    } finally {
      syncing.current = false
    }
  }, [add])

  // When the API comes up, list its stored sessions once.
  const liveKey = connection.kind === 'live' ? connection.health.version : null
  useEffect(() => {
    if (liveKey !== null && apiSync.status === 'idle') void syncApi()
  }, [liveKey, apiSync.status, syncApi])

  const fetchStored = useCallback(
    async (sessionId: string) => {
      const entry: RunEntry = { session: await getApiSession(sessionId), origin: 'stored' }
      add([entry])
      return entry
    },
    [add],
  )

  const value = useMemo<RunsValue>(() => {
    const entries = [...byId.values()].sort((a, b) =>
      a.session.session_id.localeCompare(b.session.session_id, undefined, { numeric: true }),
    )
    return {
      entries,
      get: (id) => byId.get(id),
      add,
      openFiles,
      loadErrors,
      clearLoadErrors: () => setLoadErrors([]),
      apiSync,
      syncApi,
      fetchStored,
    }
  }, [byId, add, openFiles, loadErrors, apiSync, syncApi, fetchStored])

  return <RunsContext.Provider value={value}>{children}</RunsContext.Provider>
}

export function useRuns(): RunsValue {
  const value = useContext(RunsContext)
  if (!value) throw new Error('useRuns must be used inside RunsProvider')
  return value
}
