import { useRef, useState } from 'react'
import { addLoadedSessions } from '../lib/data'
import { parseResultsFile, type LoadResult } from '../lib/loadFile'
import { Icon } from './Icon'
import { secondaryButton } from './ui'

/**
 * "Open results file": view a teammate's pipeline output (one ScoredSession, or an array).
 * The file is checked against the data contract and kept in this browser tab only.
 */
export function LoadResultsButton({ existingIds }: { existingIds: ReadonlySet<string> }) {
  const input = useRef<HTMLInputElement>(null)
  const [results, setResults] = useState<Array<LoadResult & { replaced: string[] }>>([])

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const parsed = await Promise.all([...files].map(parseResultsFile))
    setResults(
      parsed.map((r) => {
        const replaced = r.ok ? r.sessions.filter((s) => existingIds.has(s.session_id)).map((s) => s.session_id) : []
        if (r.ok) addLoadedSessions(r.sessions)
        return { ...r, replaced }
      }),
    )
    if (input.current) input.current.value = ''
  }

  return (
    <>
      <input
        ref={input}
        type="file"
        accept=".json,application/json"
        multiple
        hidden
        onChange={(e) => void onFiles(e.target.files)}
      />
      <button
        type="button"
        className={secondaryButton}
        onClick={() => input.current?.click()}
        title="View pipeline output from your computer. Nothing is uploaded."
      >
        <Icon name="upload" />
        Open results file
      </button>
      {results.length > 0 && (
        <div className="basis-full space-y-2" aria-live="polite">
          {results.map((r) =>
            r.ok ? (
              <p
                key={r.fileName}
                role="status"
                className="rounded-xl bg-green-50 px-4 py-2.5 text-sm text-green-900 ring-1 ring-green-200"
              >
                Opened <strong>{r.fileName}</strong>: {r.sessions.length} conversation{r.sessions.length === 1 ? '' : 's'}
                {r.replaced.length > 0 && <> (replaced {r.replaced.join(', ')})</>}. It stays in this tab only.
              </p>
            ) : (
              <div
                key={r.fileName}
                role="alert"
                className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-950 ring-1 ring-red-200"
              >
                <p>
                  <strong>{r.fileName}</strong> couldn't be opened. {r.message}
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
    </>
  )
}
