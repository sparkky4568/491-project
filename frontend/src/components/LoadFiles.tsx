import { useRef, useState, type ReactNode } from 'react'
import type { LoadError } from '../lib/loadScored'
import { navigate } from '../lib/router'
import { useRuns, type RunEntry } from '../lib/runs'
import { Icon } from './Icon'
import { ErrorPanel, focusRing, primaryButton, secondaryButton } from './ui'

/** After files open: one session goes straight to it, several go to the Runs list. */
export function goToOpened(opened: RunEntry[]) {
  if (opened.length === 1) navigate({ page: 'session', sessionId: opened[0].session.session_id, tab: 'summary' })
  else if (opened.length > 1) navigate({ page: 'runs' })
}

function useFilePicker(onOpened?: (opened: RunEntry[]) => void) {
  const runs = useRuns()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  async function open(files: FileList | File[] | null) {
    if (!files || files.length === 0) return
    setBusy(true)
    try {
      const { opened } = await runs.openFiles([...files])
      onOpened?.(opened)
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }
  const element = (
    <input
      ref={input}
      type="file"
      accept=".json,application/json"
      multiple
      aria-label="Load scored files"
      className="sr-only"
      tabIndex={-1}
      onChange={(e) => void open(e.target.files)}
    />
  )
  return { open, pick: () => input.current?.click(), busy, element }
}

/** A button that opens ScoredSession v0.2 JSON files. */
export function LoadFilesButton({
  primary = false,
  onOpened,
  children = 'Load scored files',
}: {
  primary?: boolean
  onOpened?: (opened: RunEntry[]) => void
  children?: ReactNode
}) {
  const picker = useFilePicker(onOpened)
  return (
    <>
      <button type="button" className={primary ? primaryButton : secondaryButton} onClick={picker.pick} disabled={picker.busy}>
        <Icon name="upload" />
        {picker.busy ? 'Opening...' : children}
      </button>
      {picker.element}
    </>
  )
}

/** Dashed drop zone (Score a call side card). */
export function DropZone({ onOpened }: { onOpened?: (opened: RunEntry[]) => void }) {
  const picker = useFilePicker(onOpened)
  const [over, setOver] = useState(false)
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        void picker.open([...e.dataTransfer.files])
      }}
      className={`flex flex-col items-center gap-2 rounded-md border border-dashed px-4 py-6 text-center ${
        over ? 'border-action bg-info-bg' : 'border-line-strong bg-surface'
      }`}
    >
      <Icon name="upload" className="h-5 w-5 text-ink" />
      <p className="type-small-strong text-ink">Drop ScoredSession v0.2 JSON files</p>
      <p className="type-caption text-muted">or</p>
      <button type="button" className={`${secondaryButton} ${focusRing}`} onClick={picker.pick} disabled={picker.busy}>
        <Icon name="file" />
        {picker.busy ? 'Opening...' : 'Choose files'}
      </button>
      {picker.element}
    </div>
  )
}

/** One error panel per file that failed to open, with the count of files that did open. */
export function LoadErrors({
  errors,
  openedCount,
  onDismiss,
}: {
  errors: LoadError[]
  openedCount: number
  onDismiss?: () => void
}) {
  if (errors.length === 0) return null
  return (
    <div className="space-y-3">
      {errors.map((e, i) => (
        <ErrorPanel
          key={`${e.fileName}-${i}`}
          title={`Couldn't open ${e.fileName}`}
          message={
            <>
              {e.message}
              {i === errors.length - 1 && openedCount > 0 && (
                <>
                  {' '}
                  The other {openedCount} file{openedCount === 1 ? '' : 's'} opened.
                </>
              )}
            </>
          }
          details={e.details}
        />
      ))}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className={`type-small-strong text-link hover:underline ${focusRing} rounded-sm`}
        >
          Dismiss {errors.length === 1 ? 'this error' : 'these errors'}
        </button>
      )}
    </div>
  )
}
