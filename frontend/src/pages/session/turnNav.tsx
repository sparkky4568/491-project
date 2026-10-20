import { createContext, useContext, type ReactNode } from 'react'

/** Opens the Conversation tab, scrolls to a message and highlights it. Provided by ConversationPage. */
export const TurnNavContext = createContext<(turn: number) => void>(() => {})

export function TurnLink({ turn, children, className }: { turn: number; children?: ReactNode; className?: string }) {
  const focusTurn = useContext(TurnNavContext)
  return (
    <a
      href={`#turn-${turn}`}
      aria-label={`Go to message ${turn}`}
      className={
        className ??
        'inline-flex h-7 min-w-7 items-center justify-center rounded-lg bg-navy-50 px-2 text-xs font-semibold text-navy-800 ring-1 ring-navy-200 hover:bg-brand-50 hover:ring-brand-300'
      }
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return // let "open in new tab" work
        e.preventDefault()
        focusTurn(turn)
      }}
    >
      {children ?? `#${turn}`}
    </a>
  )
}

export function TurnLinks({ turns, label = 'See messages' }: { turns: number[]; label?: string }) {
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
