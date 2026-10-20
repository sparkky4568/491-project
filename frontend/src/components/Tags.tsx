import { CLIENT_TALK_INFO, CODE_INFO, GROUP_STYLE } from '../lib/miti'
import type { ClientTalk, Code } from '../lib/schema'
import { Icon } from './Icon'

const activeRing = 'outline-2 outline-offset-2 outline-navy-900'

/** A coach behavior in plain words ("Reflects meaning"). Click to see the quote and why. */
export function BehaviorTag({
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
  const pushy = info.group === 'pushy'
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={active}
      aria-controls={controls}
      title={`${info.miti}. Click to see why.`}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 transition ${GROUP_STYLE[info.group].tag} ${
        active ? activeRing : ''
      }`}
    >
      {pushy && <Icon name="alert" className="h-3.5 w-3.5" />}
      {info.label}
      {!evidenceValid && (
        <span className="ml-0.5 inline-flex items-center gap-0.5 text-amber-700">
          <Icon name="alert" className="h-3.5 w-3.5" />
          <span className="sr-only">(quote not verified)</span>
        </span>
      )}
    </button>
  )
}

/** What the person signaled: wanting to change, or holding back. Neutral turns get no tag. */
export function TalkTag({
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
  if (talk === 'neutral') return null
  const info = CLIENT_TALK_INFO[talk]
  const tone =
    talk === 'change' ? 'bg-emerald-50 text-emerald-900 ring-emerald-200' : 'bg-orange-50 text-orange-900 ring-orange-200'
  const className = `inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${tone}`
  const content = (
    <>
      <Icon name={talk === 'change' ? 'arrowUp' : 'arrowDown'} className="h-3.5 w-3.5" />
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
      title={`${info.miti}. Click to see the words.`}
      className={`${className} transition ${active ? activeRing : ''}`}
    >
      {content}
    </button>
  )
}
