import { CLIENT_TALK_INFO, CODE_INFO, GROUP_STYLE, type CodeGroup } from '../lib/miti'
import type { ClientTalk, Code } from '../lib/schema'
import { Icon } from './Icon'
import { focusRing } from './ui'

const tagBase = 'inline-flex min-h-7 items-center gap-1 rounded-full border border-line px-2.5 py-1 type-label transition'
const activeRing = 'outline-2 outline-offset-2 outline-action'

export function behaviorLabel(code: Code, subtype: string | null): string {
  if (code === 'Q' && (subtype === 'open' || subtype === 'closed')) return `${subtype === 'open' ? 'Open' : 'Closed'} question`
  return CODE_INFO[code].label
}

/** The visual part of a CodeTag: words, then the code in mono. */
export function CodeTagFace({ code, subtype }: { code: Code; subtype: string | null }) {
  const pushy = CODE_INFO[code].group === 'pushy'
  return (
    <>
      {pushy && <Icon name="alert" className="h-3.5 w-3.5" />}
      {behaviorLabel(code, subtype)}
      <span className="type-mono text-[12px] leading-4 opacity-80">{code}</span>
    </>
  )
}

/** A static tag (legend, evidence panel header). */
export function StaticCodeTag({ code, subtype = null }: { code: Code; subtype?: string | null }) {
  return (
    <span className={`${tagBase} ${GROUP_STYLE[CODE_INFO[code].group].tag}`}>
      <CodeTagFace code={code} subtype={subtype} />
    </span>
  )
}

export function GroupSample({ group }: { group: CodeGroup }) {
  const sample: Record<CodeGroup, Code> = {
    question: 'Q',
    listening: 'CR',
    information: 'GI',
    supportive: 'AF',
    pushy: 'PERSUADE',
  }
  return <StaticCodeTag code={sample[group]} />
}

/** A coach behavior in plain words ("Reflects meaning CR"). A button that opens its evidence. */
export function BehaviorTag({
  code,
  subtype,
  evidenceValid,
  active,
  controls,
  onToggle,
}: {
  code: Code
  subtype: string | null
  evidenceValid: boolean
  active: boolean
  controls: string
  onToggle: () => void
}) {
  const info = CODE_INFO[code]
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={active}
      aria-controls={controls}
      title={`${info.miti}. Click to see the evidence.`}
      data-tag-key={`${code}`}
      className={`${tagBase} ${GROUP_STYLE[info.group].tag} ${active ? activeRing : focusRing}`}
    >
      <CodeTagFace code={code} subtype={subtype} />
      {!evidenceValid && (
        <span className="ml-0.5 inline-flex items-center text-insuff-fg">
          <Icon name="alert" className="h-3.5 w-3.5" />
          <span className="sr-only">(quote not verified)</span>
        </span>
      )}
    </button>
  )
}

export function talkTone(talk: 'change' | 'sustain') {
  return talk === 'change' ? 'bg-meets-bg text-meets-fg' : 'bg-talk-sustain-bg text-talk-sustain-fg'
}

/** What the caller signaled: change talk or sustain talk. Neutral volleys get no tag. */
export function TalkTag({
  talk,
  hasQuote,
  active,
  controls,
  onToggle,
}: {
  talk: ClientTalk | null
  hasQuote: boolean
  active: boolean
  controls: string
  onToggle: () => void
}) {
  if (talk === null || talk === 'neutral') return null
  const info = CLIENT_TALK_INFO[talk]
  const className = `${tagBase} ${talkTone(talk)}`
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
      className={`${className} ${active ? activeRing : focusRing}`}
    >
      {content}
    </button>
  )
}
