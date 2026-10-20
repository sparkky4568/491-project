import { useEffect, useState, useSyncExternalStore } from 'react'
import { DataError } from './data'

export type AsyncState<T> = { status: 'loading' } | { status: 'error'; error: DataError } | { status: 'ready'; data: T }

/** Runs an async data.ts call and tracks loading / error / ready. Re-runs when deps change. */
export function useAsync<T>(load: () => Promise<T>, deps: ReadonlyArray<unknown>): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' })
  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    load().then(
      (data) => !cancelled && setState({ status: 'ready', data }),
      (err: unknown) =>
        !cancelled &&
        setState({
          status: 'error',
          error: err instanceof DataError ? err : new DataError(err instanceof Error ? err.message : String(err)),
        }),
    )
    return () => {
      cancelled = true
    }
  }, deps)
  return state
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia('(prefers-reduced-motion: reduce)')
      query.addEventListener('change', onChange)
      return () => query.removeEventListener('change', onChange)
    },
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
}
