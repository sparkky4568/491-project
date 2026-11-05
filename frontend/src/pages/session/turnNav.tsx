import { createContext, useContext, type ReactNode } from 'react'
import { formatTurnSpan } from '../../lib/format'

/** Scrolls to the volley holding a turn and highlights it. Provided by the results view in ScorePage. */
export const TurnNavContext = createContext<(turn: number) => void>(() => {})

/** The DOM id of a volley in the transcript. Links target turns; ScorePage maps a turn to its volley. */
export const volleyDomId = (volley: number) => `volley-${volley}`

const chip =
  'inline-flex h-7 min-w-7 items-center justify-center rounded-lg bg-navy-50 px-2 text-xs font-semibold text-navy-800 tabular-nums ring-1 ring-navy-200 hover:bg-brand-50 hover:ring-brand-300'

export function TurnLink({ turn, children, className }: { turn: number; children?: ReactNode; className?: string }) {
  const focusTurn = useContext(TurnNavContext)
  return (
    <a
      href={`#turn-${turn}`}
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
  const label = formatTurnSpan(start, end)
  return (
    <TurnLink turn={start} className={className ?? `${chip} whitespace-nowrap`}>
      {label}
      <span className="sr-only">, go to the conversation</span>
    </TurnLink>
  )
}

export function TurnLinks({ turns, label = 'See turns' }: { turns: number[]; label?: string }) {
  if (turns.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-sm text-navy-500">
      <span>{label}</span>
      {turns.map((t) => (
        <TurnLink key={t} turn={t} />
      ))}
    </div>
  )
}
