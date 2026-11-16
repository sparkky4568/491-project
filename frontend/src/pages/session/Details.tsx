import type { ReactNode } from 'react'
import { Icon } from '../../components/Icon'
import { StaticCodeTag } from '../../components/Tags'
import { Card, SectionTitle, TONE } from '../../components/ui'
import { formatCost, formatTimestamp } from '../../lib/format'
import { CLIENT_TALK_INFO, GLOBAL_COPY, GLOBAL_MEASURE_NOTE, provenanceLabel, sourceLabel } from '../../lib/miti'
import type { RunEntry } from '../../lib/runs'
import { CODES, type ScoredSession } from '../../lib/schema'
import { TurnLinks } from './turnNav'

/** Counts and how this conversation was scored, so any number can be traced back. */
export function Details({ entry }: { entry: RunEntry }) {
  const session = entry.session
  const q = session.question_counts
  return (
    <div className="space-y-10">
      <section aria-labelledby="counts-title">
        <SectionTitle
          id="counts-title"
          hint="How many coded coach volleys carried each code. Excluded and safety-node volleys are not counted."
        >
          What the coach did
        </SectionTitle>
        <Card className="grid gap-x-8 px-5 py-2 sm:grid-cols-2">
          {CODES.map((code) => (
            <div key={code} className="flex items-center justify-between gap-3 border-b border-divider py-2.5">
              <StaticCodeTag code={code} />
              <span className="type-h3 text-ink tabular-nums">{session.counts[code] ?? 0}</span>
            </div>
          ))}
        </Card>
        <p className="mt-2 type-small text-ink-2 tabular-nums">
          Questions by kind: {q.open ?? 0} open, {q.closed ?? 0} closed, {q.unknown ?? 0} unclear.
        </p>
      </section>

      <section aria-labelledby="caller-title">
        <SectionTitle id="caller-title">What the caller said</SectionTitle>
        <Card className="grid grid-cols-3 divide-x divide-divider">
          {(['change', 'sustain', 'neutral'] as const).map((k) => (
            <div key={k} className="p-4 text-center">
              <p className="type-number text-ink">{session.client_talk_counts[k] ?? 0}</p>
              <p className="mt-1 type-small text-ink-2">{CLIENT_TALK_INFO[k].label}</p>
            </div>
          ))}
        </Card>
      </section>

      <section aria-labelledby="run-title">
        <SectionTitle
          id="run-title"
          hint="Where this conversation came from and exactly how it was scored. These are the stamps the issue log carries."
        >
          How this was scored
        </SectionTitle>
        <Card className="p-5">
          <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            <Row label="Session" mono>
              {session.session_id}
            </Row>
            <Row label="Type">
              {provenanceLabel(session)}
              {session.is_mock && ' (marked is_mock)'}
            </Row>
            <Row label="Source">{sourceLabel(session)}</Row>
            <Row label="Opened from">
              {entry.origin === 'file'
                ? `File ${entry.fileName ?? ''}`
                : entry.origin === 'stored'
                  ? 'Scorer API (stored session)'
                  : entry.origin === 'api'
                    ? 'Scorer API (scored now)'
                    : entry.origin === 'practice'
                      ? 'Practice scorer in this browser'
                      : 'Pasted ScoredSession JSON'}
            </Row>
            <Row label="Aven version">{session.aven_version ?? 'n/a'}</Row>
            <Row label="Scored">{formatTimestamp(session.scorer.scored_at)}</Row>
            <Row label="Model" mono>
              {session.scorer.model}
            </Row>
            {Object.entries(session.scorer.prompt_versions)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([name, version]) => (
                <Row key={name} label={`Prompt: ${name.replace(/_/g, ' ')}`} mono>
                  {version}
                </Row>
              ))}
            <Row label="Run" mono>
              {session.scorer.run_id}
            </Row>
            <Row label="Cost to score">{formatCost(session.scorer.cost_usd)}</Row>
            <Row label="Data format" mono>
              v{session.schema_version}
            </Row>
          </dl>
        </Card>
      </section>
    </div>
  )
}

function Row({ label, mono, children }: { label: string; mono?: boolean; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-divider pb-2">
      <dt className="shrink-0 type-small text-muted">{label}</dt>
      <dd className={`min-w-0 text-right text-ink ${mono ? 'type-mono break-all' : 'type-small'}`}>{children}</dd>
    </div>
  )
}

// ------------------------------------------------------------------ Globals

const TECHNICAL_GLOBALS = ['cultivating_change_talk', 'softening_sustain_talk']

export function OverallRatings({ session }: { session: ScoredSession }) {
  const technicalRated = TECHNICAL_GLOBALS.every((id) => session.globals.some((g) => g.id === id))
  return (
    <section aria-labelledby="ratings-title">
      <SectionTitle id="ratings-title" hint="The four MITI global ratings, 1 to 5, with the turns behind each one.">
        Overall ratings
      </SectionTitle>
      <p className={`mb-3 flex items-start gap-2 rounded-md border px-4 py-3 type-small ${TONE.info}`}>
        <Icon name="info" className="mt-0.5" />
        <span>{GLOBAL_MEASURE_NOTE}</span>
      </p>
      {session.globals.length === 0 ? (
        <p className="rounded-lg border border-line bg-surface p-5 type-small text-ink-2">
          Not rated for this call. Text conversations and calls whose goal was a decision get no overall ratings.
        </p>
      ) : (
        <>
          {!technicalRated && (
            <p className="mb-3 type-small text-ink-2">
              Technique ratings are given only for full sessions (10 minutes or longer, with a behavior goal reached).
            </p>
          )}
          <Card className="divide-y divide-divider">
            {session.globals.map((g) => (
              <div key={g.id} className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="type-small-strong text-ink">
                    {GLOBAL_COPY[g.id]?.label ?? g.id}
                    {GLOBAL_COPY[g.id] && <span className="ml-2 type-caption text-muted">{GLOBAL_COPY[g.id].miti}</span>}
                  </p>
                  <ScoreDots score={g.score} />
                </div>
                <p className="mt-1.5 type-small text-ink-2">{g.rationale}</p>
                <div className="mt-3">
                  <TurnLinks turns={g.cited_turns} />
                </div>
              </div>
            ))}
          </Card>
        </>
      )}
    </section>
  )
}

function ScoreDots({ score }: { score: number }) {
  return (
    <span className="flex items-center gap-2">
      <span aria-hidden="true" className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={`h-2.5 w-2.5 rounded-full ${i <= score ? 'bg-chart-line' : 'border border-line-strong'}`} />
        ))}
      </span>
      <span className="type-small-strong text-ink tabular-nums">
        {score}
        <span className="font-normal text-muted"> / 5</span>
      </span>
    </span>
  )
}
