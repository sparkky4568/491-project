import { memo } from 'react'
import { ClientTalkTag, CodeChip } from '../../components/CodeChip'
import { Icon } from '../../components/Icon'
import { IssueTypeBadge } from '../../components/ui'
import { formatSeconds } from '../../lib/format'
import { CLIENT_TALK_INFO, CODE_INFO, GROUP_INFO, isNonAdherent } from '../../lib/miti'
import type { Issue, ScoredTurn } from '../../lib/schema'
import { TurnLink } from './turnNav'

/** Which piece of evidence is open on a turn: a code chip by index, or the client-talk tag. */
export type EvidenceKey = number | 'client'

interface Props {
  turn: ScoredTurn
  openKey: EvidenceKey | null
  onToggle: (turn: number, key: EvidenceKey) => void
  flashing: boolean
  issues: Issue[]
  onIssueClick: (issueId: string) => void
}

export const TranscriptTurn = memo(function TranscriptTurn({ turn, openKey, onToggle, flashing, issues, onIssueClick }: Props) {
  const isPractitioner = turn.speaker === 'practitioner'
  const nonAdherent = isPractitioner && turn.codes.some((c) => isNonAdherent(c.code))
  const calloutId = `evidence-${turn.turn}`

  const activeQuote =
    openKey === null
      ? null
      : turn.speaker === 'practitioner'
        ? typeof openKey === 'number'
          ? (turn.codes[openKey]?.evidence_quote ?? null)
          : null
        : turn.client_evidence_quote

  return (
    <li
      id={`turn-${turn.turn}`}
      tabIndex={-1}
      aria-label={`Turn ${turn.turn}, ${turn.speaker}${turn.excluded ? ', excluded' : ''}`}
      className={[
        'scroll-mt-20 border-l-4 px-3 py-3 outline-none sm:grid sm:grid-cols-[6.5rem_minmax(0,1fr)] sm:gap-4 sm:px-4',
        isPractitioner ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/80 dark:bg-slate-900/40',
        nonAdherent ? 'border-l-red-700 dark:border-l-red-500' : 'border-l-transparent',
        turn.excluded ? 'excluded-hatch' : '',
        flashing ? 'turn-flash' : '',
      ].join(' ')}
    >
      {/* Gutter: turn number, timestamp, Aven node */}
      <div className="mb-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-xs text-slate-600 sm:mb-0 sm:flex-col sm:gap-1 dark:text-slate-400">
        <TurnLink
          turn={turn.turn}
          className="font-mono text-sm font-semibold text-slate-900 hover:underline dark:text-slate-100"
        />
        <span className="tabular-nums" title="Start time (m:ss)">
          {formatSeconds(turn.start_sec)}
        </span>
        {turn.node && (
          <span className="font-mono text-[11px] leading-tight text-slate-600 dark:text-slate-400" title="Aven flow node">
            {turn.node.split('_').map((part, i) => (
              <span key={i}>
                {i > 0 && '_'}
                {i > 0 && <wbr />}
                {part}
              </span>
            ))}
          </span>
        )}
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`text-xs font-semibold tracking-wide uppercase ${
              isPractitioner ? 'text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {isPractitioner ? 'Practitioner' : 'Client'}
          </span>
          {turn.excluded && (
            <span className="rounded border border-slate-400 bg-white px-1.5 text-[11px] font-medium text-slate-700 dark:border-slate-500 dark:bg-slate-900 dark:text-slate-300">
              Excluded · not counted
            </span>
          )}
        </div>

        <p
          className={`mt-1 max-w-[68ch] text-[15px] leading-7 ${
            turn.excluded ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-slate-100'
          }`}
        >
          <HighlightedText text={turn.text} quote={activeQuote} />
        </p>

        {turn.excluded && turn.exclusion_reason && (
          <p className="mt-1 text-xs text-slate-600 italic dark:text-slate-400">Reason: {turn.exclusion_reason}</p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {turn.speaker === 'practitioner' ? (
            turn.codes.length === 0 ? (
              <span className="text-xs text-slate-500 italic">No codes</span>
            ) : (
              turn.codes.map((c, i) => (
                <CodeChip
                  key={i}
                  code={c.code}
                  evidenceValid={c.evidence_valid}
                  active={openKey === i}
                  controls={calloutId}
                  onToggle={() => onToggle(turn.turn, i)}
                />
              ))
            )
          ) : (
            <ClientTalkTag
              talk={turn.client_talk}
              hasQuote={turn.client_evidence_quote !== null}
              active={openKey === 'client'}
              controls={calloutId}
              onToggle={() => onToggle(turn.turn, 'client')}
            />
          )}
          {nonAdherent && (
            <span className="ml-1 inline-flex items-center gap-1 text-xs font-semibold text-red-800 dark:text-red-300">
              <Icon name="alert" className="h-3.5 w-3.5" /> MI non-adherent
            </span>
          )}
        </div>

        <div id={calloutId}>{openKey !== null && <EvidenceCallout turn={turn} openKey={openKey} />}</div>

        {issues.length > 0 && (
          <ul className="mt-2 space-y-1">
            {issues.map((issue) => (
              <li key={issue.issue_id}>
                <button
                  type="button"
                  onClick={() => onIssueClick(issue.issue_id)}
                  className="flex flex-wrap items-center gap-2 rounded-md text-left text-xs text-slate-800 hover:underline dark:text-slate-200"
                >
                  <IssueTypeBadge type={issue.type} />
                  <span className="font-mono">{issue.issue_id}</span>
                  <span>{issue.title}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  )
})

function HighlightedText({ text, quote }: { text: string; quote: string | null }) {
  const start = quote ? text.indexOf(quote) : -1
  if (!quote || start < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, start)}
      <mark className="rounded-sm bg-yellow-200 px-0.5 text-inherit dark:bg-yellow-400/30">{quote}</mark>
      {text.slice(start + quote.length)}
    </>
  )
}

function EvidenceCallout({ turn, openKey }: { turn: ScoredTurn; openKey: EvidenceKey }) {
  if (turn.speaker === 'client') {
    const info = CLIENT_TALK_INFO[turn.client_talk]
    return (
      <div className="mt-3 rounded-md border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-950">
        <p className="font-medium">{info.label}</p>
        {turn.client_evidence_quote && (
          <p className="mt-1 text-slate-700 dark:text-slate-300">
            <span className="font-medium">Evidence:</span> “{turn.client_evidence_quote}” (highlighted above)
          </p>
        )}
      </div>
    )
  }

  const assignment = typeof openKey === 'number' ? turn.codes[openKey] : undefined
  if (!assignment) return null
  const info = CODE_INFO[assignment.code]
  const found = turn.text.includes(assignment.evidence_quote)
  return (
    <div className="mt-3 rounded-md border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-950">
      <p className="flex flex-wrap items-center gap-x-2 font-medium">
        <span className="font-mono">{assignment.code}</span>
        <span>· {info.name}</span>
        <span className="text-xs font-normal text-slate-600 dark:text-slate-400">({GROUP_INFO[info.group].label})</span>
      </p>
      <p className="mt-1 text-slate-800 dark:text-slate-200">
        <span className="font-medium">Rationale:</span> {assignment.rationale}
      </p>
      {assignment.evidence_valid ? (
        <p className="mt-1 text-slate-700 dark:text-slate-300">
          <span className="font-medium">Evidence:</span> “{assignment.evidence_quote}”
          {found ? ' (highlighted above)' : ' (could not be located for highlighting)'}
        </p>
      ) : (
        <p className="mt-2 flex items-start gap-2 rounded border border-amber-300 bg-amber-50 p-2 text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
          <Icon name="alert" className="mt-0.5" />
          <span>
            <strong>Quote not found word-for-word in this turn</strong> (evidence_valid is false). Treat this code with caution.
            The scorer quoted: “{assignment.evidence_quote}”
          </span>
        </p>
      )}
    </div>
  )
}
