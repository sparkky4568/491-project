import { CLIENT_TALK_INFO, CODE_INFO, GROUP_INFO } from '../lib/miti'
import type { ClientTalk, Code } from '../lib/schema'
import { Icon } from './Icon'
import { Tooltip } from './ui'

const activeRing = 'ring-2 ring-slate-900 ring-offset-1 dark:ring-white dark:ring-offset-slate-900'

/** A MITI code on a practitioner turn. Click to highlight its evidence and show the rationale. */
export function CodeChip({
  code,
  evidenceValid,
  active,
  controls,
  onToggle,
}: {
  code: Code
  evidenceValid: boolean
  active: boolean
  controls: string
  onToggle: () => void
}) {
  const info = CODE_INFO[code]
  const group = GROUP_INFO[info.group]
  const nonAdherent = info.group === 'non_adherent'
  const tip = evidenceValid ? info.name : `${info.name} · quote not found verbatim`
  return (
    <Tooltip text={tip} hidden={active}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={active}
        aria-controls={controls}
        aria-label={`${code}: ${info.name}${nonAdherent ? ', MI non-adherent' : ''}${
          evidenceValid ? '' : ', evidence quote not verified'
        }. ${active ? 'Hide' : 'Show'} evidence.`}
        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-xs leading-5 ${group.chip} ${
          active ? activeRing : ''
        }`}
      >
        {nonAdherent && <Icon name="ban" className="h-3.5 w-3.5" />}
        {code}
        {!evidenceValid && <Icon name="alert" className="h-3.5 w-3.5 text-amber-700 dark:text-amber-300" />}
      </button>
    </Tooltip>
  )
}

const TALK_ICONS = { change: 'arrowUp', sustain: 'arrowDown', neutral: 'minus' } as const

/** Change / sustain / neutral tag on a client turn. Clickable when there is an evidence quote. */
export function ClientTalkTag({
  talk,
  hasQuote,
  active,
  controls,
  onToggle,
}: {
  talk: ClientTalk
  hasQuote: boolean
  active: boolean
  controls: string
  onToggle: () => void
}) {
  const info = CLIENT_TALK_INFO[talk]
  const className = `inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium leading-5 ${info.className}`
  const content = (
    <>
      <Icon name={TALK_ICONS[talk]} className="h-3.5 w-3.5" />
      {info.label}
    </>
  )
  if (!hasQuote) return <span className={className}>{content}</span>
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={active}
      aria-controls={controls}
      aria-label={`${info.label}. ${active ? 'Hide' : 'Show'} evidence.`}
      className={`${className} ${active ? activeRing : ''}`}
    >
      {content}
    </button>
  )
}
