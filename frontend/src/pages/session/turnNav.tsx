import { createContext, useContext, type ReactNode } from 'react'
import { focusRing } from '../../components/ui'
import { formatTurnSpan } from '../../lib/format'

interface TurnNav {
  /** Switches to the Transcript tab, clears a hiding filter, scrolls to the volley holding the turn and flashes it. */
  focusTurn: (turn: number) => void
  /** The link target for a turn (the session's transcript tab), so open-in-new-tab still lands somewhere useful. */
  href: string
}

/** Provided by SessionPage. */
export const TurnNavContext = createContext<TurnNav>({ focusTurn: () => {}, href: '#' })

/** The DOM id of a volley in the transcript. */
export const volleyDomId = (volley: number) => `volley-${volley}`

const chip = `inline-flex h-7 min-w-7 items-center justify-center rounded-sm bg-subtle px-2 type-label text-link tabular-nums hover:underline ${focusRing}`

export const linkClass = `type-small-strong text-link underline-offset-4 hover:underline rounded-sm ${focusRing}`

export function TurnLink({ turn, children, className }: { turn: number; children?: ReactNode; className?: string }) {
  const { focusTurn, href } = useContext(TurnNavContext)
  return (
    <a
      href={href}
      aria-label={children ? undefined : `Go to turn ${turn}`}
      className={className ?? chip}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
        e.preventDefault()
        focusTurn(turn)
      }}
    >
      {children ?? `#${turn}`}
    </a>
  )
}

/** "Turns 4 to 9" as one link that jumps to the first turn. */
export function TurnSpanLink({ start, end, className }: { start: number; end: number; className?: string }) {
  return (
    <TurnLink turn={start} className={className ?? `${chip} whitespace-nowrap`}>
      {formatTurnSpan(start, end)}
      <span className="sr-only">, go to the conversation</span>
    </TurnLink>
  )
}

/** "Show in transcript" text link. */
export function ShowInTranscript({ turn, children = 'Show in transcript' }: { turn: number; children?: ReactNode }) {
  return (
    <TurnLink turn={turn} className={linkClass}>
      {children}
    </TurnLink>
  )
}

export function TurnLinks({ turns, label = 'See turns' }: { turns: number[]; label?: string }) {
  if (turns.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5 type-small text-ink-2">
      <span>{label}</span>
      {turns.map((t) => (
        <TurnLink key={t} turn={t} />
      ))}
    </div>
  )
}
