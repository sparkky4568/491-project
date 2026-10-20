import { useState, type ReactNode } from 'react'
import { Card, SectionTitle, StatusPill } from '../../components/ui'
import { formatCost, formatTimestamp } from '../../lib/format'
import { CLIENT_TALK_INFO, CODE_INFO, GROUP_STYLE, PROVENANCE_COPY, SOURCE_COPY } from '../../lib/miti'
import { CODES, type ScoredSession } from '../../lib/schema'
import { TurnLinks } from './turnNav'
import { WindowedRqChart } from './WindowedRqChart'

/** The technical tab: counts, flow checks and how this conversation was scored. */
export function Details({ session }: { session: ScoredSession }) {
  const run = session.flags.longest_reflection_run
  const windowed = session.flags.windowed_rq
  const rqGoal = session.measures.find((m) => m.id === 'reflection_to_question')?.threshold?.value ?? null
  const [showNumbers, setShowNumbers] = useState(false)

  return (
    <div className="space-y-10">
      <section>
        <SectionTitle hint="How many times each coach behavior was tagged. Messages that weren't scored don't count.">
          What the coach did
        </SectionTitle>
        <Card className="grid gap-x-8 p-5 sm:grid-cols-2">
          {CODES.map((code) => (
            <div
              key={code}
              className="flex items-center justify-between gap-3 border-b border-navy-100 py-2.5 last:border-0 sm:[&:nth-last-child(2)]:border-0"
            >
              <span className="flex items-center gap-2 text-navy-800">
                <span aria-hidden="true" className={`h-2 w-2 rounded-full ${GROUP_STYLE[CODE_INFO[code].group].dot}`} />
                {CODE_INFO[code].label}
                <span className="font-mono text-xs text-navy-500">{code}</span>
              </span>
              <span className="text-lg font-bold text-navy-900 tabular-nums">{session.counts[code]}</span>
            </div>
          ))}
        </Card>
      </section>

      <section>
        <SectionTitle>What the person said</SectionTitle>
        <Card className="grid grid-cols-3 divide-x divide-navy-100 p-2">
          {(['change', 'sustain', 'neutral'] as const).map((k) => (
            <div key={k} className="p-4 text-center">
              <p className="text-3xl font-extrabold text-navy-900">{session.client_talk_counts[k]}</p>
              <p className="mt-1 text-sm text-navy-500">{CLIENT_TALK_INFO[k].label}</p>
            </div>
          ))}
        </Card>
      </section>

      <section>
        <SectionTitle hint="Rules from the sponsor about how the conversation should flow (Table C).">Flow checks</SectionTitle>
        <div className="grid items-start gap-4 lg:grid-cols-[1fr_1.6fr]">
          <Card className="p-5">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-navy-900">Reflections in a row</h3>
              <StatusPill status={run.exceeds_cap ? 'fail' : 'pass'} label={run.exceeds_cap ? 'Too many' : 'OK'} />
            </div>
            <p className="mt-3 text-4xl font-extrabold text-navy-900">{run.length}</p>
            <p className="mt-1 text-sm text-navy-500">Most in a row without a question. Allowed: {run.cap}*</p>
            <div className="mt-4">
              <TurnLinks turns={run.turns} />
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="font-semibold text-navy-900">Listening vs. asking over time</h3>
            <p className="mt-1 text-sm text-navy-500">
              Reflections per question across each stretch of {windowed.window_size} messages. Click a point to jump there.
            </p>
            {windowed.points.length === 0 ? (
              <p className="mt-4 text-navy-500">This conversation is shorter than one stretch.</p>
            ) : (
              <>
                <div className="mt-3">
                  <WindowedRqChart points={windowed.points} windowSize={windowed.window_size} goal={rqGoal} />
                </div>
                <button
                  type="button"
                  aria-expanded={showNumbers}
                  onClick={() => setShowNumbers((s) => !s)}
                  className="mt-2 text-sm font-semibold text-brand-700 underline underline-offset-4"
                >
                  {showNumbers ? 'Hide the numbers' : 'Show the numbers'}
                </button>
                {showNumbers && (
                  <table className="mt-2 w-full text-sm">
                    <thead>
                      <tr className="text-left text-navy-500">
                        <th className="py-1 font-medium">Messages</th>
                        <th className="py-1 text-right font-medium">Reflections per question</th>
                      </tr>
                    </thead>
                    <tbody className="tabular-nums">
                      {windowed.points.map((p) => (
                        <tr key={p.end_turn} className="border-t border-navy-100">
                          <td className="py-1">
                            {p.end_turn - windowed.window_size + 1}–{p.end_turn}
                          </td>
                          <td className="py-1 text-right">{p.rq === null ? 'no questions' : p.rq.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}
          </Card>
        </div>
        <p className="mt-3 text-sm text-navy-500">* Limits are placeholders until the sponsor confirms them.</p>
      </section>

      <section>
        <SectionTitle hint="Where this conversation came from and exactly how it was scored, so any number can be traced back.">
          How this was scored
        </SectionTitle>
        <Card className="p-5">
          <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            <Row label="Conversation ID" mono>
              {session.session_id}
            </Row>
            <Row label="Type">
              {PROVENANCE_COPY[session.provenance]}
              {session.is_mock && ' (practice score)'}
            </Row>
            <Row label="Source">{SOURCE_COPY[session.source]}</Row>
            <Row label="Aven version">{session.aven_version ?? '—'}</Row>
            <Row label="Recorded">{session.recorded_at ?? '—'}</Row>
            <Row label="Scored">{formatTimestamp(session.scorer.scored_at)}</Row>
            <Row label="AI model" mono>
              {session.scorer.model}
            </Row>
            <Row label="Tagging prompt" mono>
              {session.scorer.coder_prompt_version}
            </Row>
            <Row label="Ratings prompt" mono>
              {session.scorer.globals_prompt_version}
            </Row>
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
    <div className="flex justify-between gap-4 border-b border-navy-100 pb-2">
      <dt className="text-navy-500">{label}</dt>
      <dd className={`text-right text-navy-900 ${mono ? 'font-mono text-sm break-all' : ''}`}>{children}</dd>
    </div>
  )
}
