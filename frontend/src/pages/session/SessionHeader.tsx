import type { ReactNode } from 'react'
import { Icon } from '../../components/Icon'
import { Card, Overline, ScoreabilityChip, SourceDot, secondaryButton } from '../../components/ui'
import { downloadIssueLog } from '../../lib/download'
import { formatDuration, formatTimestamp } from '../../lib/format'
import { SCOREABILITY_COPY, SOURCE_COPY, coachWords, isInventedSample, provenanceLabel, sourceLabel } from '../../lib/miti'
import type { RunEntry } from '../../lib/runs'
import type { ScoredSession } from '../../lib/schema'
import { sessionTopic } from '../../lib/sessionStats'

export function channelLine(session: ScoredSession): string {
  const length = formatDuration(session.duration_sec)
  if (session.channel === 'text') return 'Text, no timings'
  return length ? `Voice, ${length}` : 'Voice'
}

/** Where the scores came from, in words, with the run stamp. */
export function SourceLine({ entry }: { entry: RunEntry }) {
  const { session, origin, fileName } = entry
  const s = session.scorer
  const prompt = s.prompt_versions.volley_coder ?? Object.values(s.prompt_versions)[0]
  const tone = origin === 'practice' || session.is_mock ? 'demo' : 'live'
  const lead =
    origin === 'practice'
      ? 'Practice score: keyword rules in this browser, not aven-scorer.'
      : origin === 'file'
        ? `Scorer output, loaded from ${fileName ?? 'a file'}`
        : origin === 'stored'
          ? `Scorer output, from the scorer API${fileName ? ` (${fileName})` : ''}`
          : origin === 'api'
            ? 'Scored just now by the scorer API'
            : 'Scorer output, pasted as ScoredSession JSON'
  return (
    <div className="space-y-1">
      <p className="flex items-start gap-2 type-small-strong text-ink">
        <span className="mt-1.5 flex">
          <SourceDot tone={tone} />
        </span>
        <span className="break-words">
          {lead}
          {session.is_mock && origin !== 'practice' && (
            <span className="font-normal text-ink-2"> (marked is_mock: mock data)</span>
          )}
        </span>
      </p>
      <p className="type-mono break-words text-muted">
        Run {s.run_id} | model {s.model}
        {prompt && <> | prompt {prompt}</>} | scored {formatTimestamp(s.scored_at)}
      </p>
    </div>
  )
}

/** Header card shared by every session tab. */
export function SessionHeader({ entry }: { entry: RunEntry }) {
  const session = entry.session
  const state = session.scoreability.state
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Overline>
            Session <span className="type-mono tracking-normal normal-case">{session.session_id}</span>
          </Overline>
          <h1 className="mt-1 type-h1 text-balance text-ink">{sessionTopic(session)}</h1>
          <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 type-small">
            <Meta label="Channel">{channelLine(session)}</Meta>
            <Meta label="Coach volleys">
              <span className="tabular-nums">{session.scoreability.agent_volleys}</span>
            </Meta>
            <Meta label="Type">{provenanceLabel(session)}</Meta>
            <Meta label="Source">{sourceLabel(session)}</Meta>
          </dl>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
          <button
            type="button"
            className={secondaryButton}
            onClick={() => downloadIssueLog(session.issues, session.scorer.run_id, 'csv')}
          >
            <Icon name="download" />
            CSV
            <span className="sr-only"> of the issue log</span>
          </button>
          <button
            type="button"
            className={secondaryButton}
            onClick={() => downloadIssueLog(session.issues, session.scorer.run_id, 'jsonl')}
          >
            <Icon name="download" />
            JSONL
            <span className="sr-only"> of the issue log</span>
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 rounded-md bg-subtle px-4 py-3 sm:flex-row sm:items-center">
        <ScoreabilityChip state={state} mock={session.is_mock} />
        <p className="type-small text-ink-2">
          {isInventedSample(session) ? (
            <>
              Invented sample tagged {SOURCE_COPY[session.source]}: the scorer applied the rules for that source, but this is not
              corpus or call data.
            </>
          ) : (
            <>
              {SCOREABILITY_COPY[state].explain}
              {session.scoreability.reason && <> Reason given: {coachWords(session.scoreability.reason)}</>}
            </>
          )}
        </p>
      </div>

      <div className="mt-4">
        <SourceLine entry={entry} />
      </div>
    </Card>
  )
}

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-muted">{label}</dt>
      <dd className="font-semibold text-ink">{children}</dd>
    </div>
  )
}
