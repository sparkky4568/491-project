import { Icon } from '../components/Icon'
import { Card, ErrorPanel, Loading, PageContainer, PageHero, SectionTitle } from '../components/ui'
import { getThresholds } from '../lib/data'
import { formatGoal } from '../lib/format'
import { useAsync } from '../lib/hooks'
import { CLIENT_TALK_INFO, CODE_INFO, GROUP_STYLE, MEASURE_COPY } from '../lib/miti'
import { CODES } from '../lib/schema'

const STEPS = [
  ['Read the conversation', 'A coaching conversation comes in, message by message.', 'Backend'],
  [
    'Tag every message',
    'AI tags each coach message (question, reflection, advice…) and quotes the exact words. It also notes when the person talks about changing.',
    'AI',
  ],
  ['Count and score', 'Plain code, not AI, counts the tags and works out the scores. The AI never does the math.', 'Backend'],
  [
    'Rate the whole conversation',
    'A separate AI pass gives four overall ratings and points to the messages behind each one.',
    'AI',
  ],
  ['Flag problems', 'Missed goals and broken rules become a list of problems, each with evidence.', 'Backend'],
  ['Review it here', 'This site shows all of it in plain language, so anyone can see what happened and why.', 'Frontend'],
] as const

const RULES = [
  'No real member data or health information, ever. Every conversation here is made up.',
  'Made-up data is always labeled, so nobody mistakes it for real results.',
  'Every score shows where it came from: the type of conversation, the AI model and the prompt version.',
  'The sponsor sets the goals. They are placeholders until confirmed, and this site never changes them.',
  "Overall ratings are a rough guide until they're checked against experts.",
  'The AI tags and quotes; plain code does every calculation.',
]

export function HowItWorksPage() {
  const thresholds = useAsync(() => getThresholds(), [])
  return (
    <PageContainer narrow>
      <PageHero eyebrow="How it works" title="From conversation to" accent="clear feedback.">
        A doctor used to read every coaching conversation by hand to check its quality. This tool does the first pass and shows
        its work, using Motivational Interviewing (MI) and the standard way experts score it (MITI 4.2.1).
      </PageHero>

      <section className="mb-12">
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map(([title, body, owner], i) => (
            <li key={title}>
              <Card className="h-full p-5">
                <span className="text-sm font-extrabold text-brand-700">0{i + 1}</span>
                <p className="mt-1 text-lg font-bold text-navy-900">{title}</p>
                <p className="mt-1 text-sm leading-relaxed text-navy-600">{body}</p>
                <p className="mt-3 text-xs font-semibold tracking-wide text-navy-500 uppercase">{owner}</p>
              </Card>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-navy-600">
          <strong className="text-navy-900">Alongside all of this:</strong> the accuracy check compares the AI with expert
          reviewers.
        </p>
      </section>

      <section className="mb-12">
        <SectionTitle>Ground rules</SectionTitle>
        <Card className="p-6">
          <ul className="space-y-3">
            {RULES.map((rule) => (
              <li key={rule} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                  <Icon name="check" className="h-3.5 w-3.5" />
                </span>
                <span className="text-navy-800">{rule}</span>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section className="mb-12">
        <SectionTitle hint="What every tag in a conversation means. Official MI terms are shown in gray.">Glossary</SectionTitle>
        <Card className="divide-y divide-navy-100">
          {CODES.map((code) => (
            <div key={code} className="flex items-start gap-3 p-4">
              <span
                aria-hidden="true"
                className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${GROUP_STYLE[CODE_INFO[code].group].dot}`}
              />
              <div>
                <p className="font-semibold text-navy-900">
                  {CODE_INFO[code].label} <span className="ml-1 text-sm font-normal text-navy-500">{CODE_INFO[code].miti}</span>
                </p>
                <p className="text-sm text-navy-600">{CODE_INFO[code].explain}</p>
              </div>
            </div>
          ))}
          {(['change', 'sustain'] as const).map((k) => (
            <div key={k} className="flex items-start gap-3 p-4">
              <Icon name={k === 'change' ? 'arrowUp' : 'arrowDown'} className="mt-1 h-4 w-4 text-navy-500" />
              <div>
                <p className="font-semibold text-navy-900">
                  {CLIENT_TALK_INFO[k].label}{' '}
                  <span className="ml-1 text-sm font-normal text-navy-500">{CLIENT_TALK_INFO[k].miti}</span>
                </p>
                <p className="text-sm text-navy-600">{CLIENT_TALK_INFO[k].explain}</p>
              </div>
            </div>
          ))}
        </Card>
      </section>

      <section>
        <SectionTitle hint="Set by the sponsor. These are placeholders until confirmed, and this site only displays them.">
          Current goals
        </SectionTitle>
        {thresholds.status === 'loading' && <Loading what="goals" />}
        {thresholds.status === 'error' && (
          <ErrorPanel title="Couldn't load goals" message={thresholds.error.message} details={thresholds.error.details} />
        )}
        {thresholds.status === 'ready' && (
          <Card className="divide-y divide-navy-100">
            {thresholds.data.items.map((t) => (
              <div key={t.id} className="flex flex-wrap items-baseline justify-between gap-2 p-4">
                <span className="font-semibold text-navy-900">
                  {t.id === 'longest_reflection_run' ? 'Reflections in a row' : (MEASURE_COPY[t.id]?.label ?? t.id)}
                </span>
                <span className="text-navy-700">
                  {t.id === 'longest_reflection_run' ? `${t.value} at most` : formatGoal(t.id, t)}
                  {thresholds.data.isPlaceholder && (
                    <span className="ml-2 text-xs font-semibold text-brand-700">placeholder</span>
                  )}
                </span>
              </div>
            ))}
          </Card>
        )}
      </section>
    </PageContainer>
  )
}
