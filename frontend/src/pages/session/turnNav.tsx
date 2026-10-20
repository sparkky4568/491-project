import { createContext, useContext, type ReactNode } from 'react'
import { linkClass } from '../../components/ui'

/** Scrolls to a turn, flashes it and moves focus there. Provided by SessionReviewPage. */
export const TurnNavContext = createContext<(turn: number) => void>(() => {})

export function TurnLink({ turn, children, className }: { turn: number; children?: ReactNode; className?: string }) {
  const focusTurn = useContext(TurnNavContext)
  return (
    <a
      href={`#turn-${turn}`}
      aria-label={`Go to turn ${turn}`}
      className={className ?? `${linkClass} font-mono text-xs`}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return // let "open in new tab" work
        e.preventDefault()
        focusTurn(turn)
      }}
    >
      {children ?? `T${turn}`}
    </a>
  )
}

export function TurnLinks({ turns }: { turns: number[] }) {
  if (turns.length === 0) return <span className="text-slate-500">none</span>
  return (
    <span className="inline-flex flex-wrap gap-x-2 gap-y-1">
      {turns.map((t) => (
        <TurnLink key={t} turn={t} />
      ))}
    </span>
  )
}
