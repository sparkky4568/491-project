import { useRef, useState } from 'react'
import { addLoadedSessions } from '../lib/data'
import { parseResultsFile, type LoadResult } from '../lib/loadFile'
import { Icon } from './Icon'
import { buttonClass } from './ui'

/**
 * "Load results file": pick one or more ScoredSession JSON files from disk.
 * Each file is validated with Zod; valid sessions join the list for this tab.
 */
export function LoadResultsButton({ existingIds }: { existingIds: ReadonlySet<string> }) {
  const input = useRef<HTMLInputElement>(null)
  const [results, setResults] = useState<Array<LoadResult & { replaced: string[] }>>([])

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const parsed = await Promise.all([...files].map(parseResultsFile))
    const withReplaced = parsed.map((r) => {
      const replaced = r.ok ? r.sessions.filter((s) => existingIds.has(s.session_id)).map((s) => s.session_id) : []
      if (r.ok) addLoadedSessions(r.sessions)
      return { ...r, replaced }
    })
    setResults(withReplaced)
    if (input.current) input.current.value = ''
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <input
        ref={input}
        type="file"
        accept=".json,application/json"
        multiple
        hidden
        onChange={(e) => void onFiles(e.target.files)}
      />
      <button type="button" className={buttonClass} onClick={() => input.current?.click()}>
        <Icon name="upload" />
        Load results file
      </button>
      {results.length > 0 && (
        <div className="w-full space-y-2" aria-live="polite">
          {results.map((r) =>
            r.ok ? (
              <p
                key={r.fileName}
                role="status"
                className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-950 dark:border-green-800 dark:bg-green-950 dark:text-green-100"
              >
                <strong>{r.fileName}</strong>: loaded {r.sessions.length} session{r.sessions.length === 1 ? '' : 's'} (
                {r.sessions.map((s) => s.session_id).join(', ')})
                {r.replaced.length > 0 && <> and replaced the earlier copy of {r.replaced.join(', ')}</>}.
              </p>
            ) : (
              <div
                key={r.fileName}
                role="alert"
                className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-950 dark:border-red-800 dark:bg-red-950 dark:text-red-100"
              >
                <p>
                  <strong>{r.fileName}</strong>: {r.message}
                </p>
                {r.details.length > 0 && (
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 font-mono text-xs">
                    {r.details.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                )}
              </div>
            ),
          )}
        </div>
      )}
    </div>
  )
}
