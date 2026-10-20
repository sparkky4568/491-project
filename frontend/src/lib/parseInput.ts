/**
 * Turns whatever was pasted into the box into something the scorer can use.
 *
 * Accepted:
 *  1. Plain text, one message per line, each starting with a speaker label:
 *       Coach: What would you like to talk about today?
 *       Person: I want to start walking more.
 *     Lines without a label continue the message above them.
 *  2. A TranscriptIn JSON object (the pipeline's input format).
 *  3. A ScoredSession JSON object (pipeline output); it is shown as-is, not re-scored.
 */
import { ScoredSessionSchema, TranscriptInSchema, describeZodError, type ScoredSession, type TranscriptIn } from './schema'

export type ParsedInput =
  | { kind: 'transcript'; transcript: TranscriptIn }
  | { kind: 'scored'; session: ScoredSession }
  | { kind: 'error'; message: string; details?: string[] }

const COACH = new Set([
  'coach',
  'practitioner',
  'counselor',
  'counsellor',
  'therapist',
  'aven',
  'interviewer',
  'clinician',
  'provider',
])
const PERSON = new Set(['person', 'client', 'patient', 'caller', 'user', 'member', 'participant'])
const MAX_MESSAGES = 300

export function parseConversationInput(text: string): ParsedInput {
  const trimmed = text.trim()
  if (!trimmed) return { kind: 'error', message: 'Paste a conversation first.' }
  if (trimmed.startsWith('{')) return parseJson(trimmed)
  return parseText(trimmed)
}

function parseJson(text: string): ParsedInput {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { kind: 'error', message: "This looks like JSON, but it isn't valid JSON." }
  }
  const scored = ScoredSessionSchema.safeParse(raw)
  if (scored.success) return { kind: 'scored', session: scored.data }
  const transcript = TranscriptInSchema.safeParse(raw)
  if (transcript.success) return { kind: 'transcript', transcript: transcript.data }
  const hasScores = typeof raw === 'object' && raw !== null && 'scorer' in raw
  const error = hasScores ? scored.error : transcript.error
  return {
    kind: 'error',
    message: `This JSON doesn't match the ${hasScores ? 'ScoredSession' : 'TranscriptIn'} format in docs/DATA_CONTRACT.md.`,
    details: describeZodError(error, raw, 5),
  }
}

function parseText(text: string): ParsedInput {
  const turns: TranscriptIn['turns'] = []
  const lines = text.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const match = /^([A-Za-z][A-Za-z ]{0,24}?)\s*:\s*(.*)$/.exec(line)
    const label = match?.[1].trim().toLowerCase()
    const speaker = label && COACH.has(label) ? 'practitioner' : label && PERSON.has(label) ? 'client' : null

    if (match && speaker) {
      turns.push({ turn: turns.length + 1, speaker, text: match[2].trim(), node: null, start_sec: null })
    } else if (match && turns.length === 0) {
      return {
        kind: 'error',
        message: `Line ${i + 1} starts with "${match[1]}:". Start each message with "Coach:" or "Person:".`,
      }
    } else if (turns.length > 0) {
      // No speaker label: this line continues the previous message.
      const last = turns[turns.length - 1]
      last.text = `${last.text} ${line}`.trim()
    } else {
      return {
        kind: 'error',
        message: 'Start each message with "Coach:" or "Person:", for example "Coach: How are you feeling today?"',
      }
    }
  }

  const kept = turns.filter((t) => t.text.length > 0)
  if (kept.length > MAX_MESSAGES)
    return { kind: 'error', message: `That's ${kept.length} messages. The limit is ${MAX_MESSAGES}.` }
  if (!kept.some((t) => t.speaker === 'practitioner'))
    return { kind: 'error', message: 'There are no "Coach:" messages to score.' }
  if (!kept.some((t) => t.speaker === 'client'))
    return { kind: 'error', message: 'There are no "Person:" messages. Add what the person said too.' }

  const now = new Date()
  return {
    kind: 'transcript',
    transcript: {
      schema_version: '0.1',
      session_id: `PASTED-${now.toISOString().slice(11, 19).replace(/:/g, '')}`,
      // We can't tell whether pasted text is invented. The scorer marks practice scores as mock.
      is_mock: false,
      provenance: 'internal_test',
      source: 'other',
      target_behavior: '',
      aven_version: null,
      recorded_at: null,
      turns: kept.map((t, i) => ({ ...t, turn: i + 1 })),
    },
  }
}

/** The reverse: an example transcript as the plain text people would paste. */
export function transcriptToText(transcript: TranscriptIn): string {
  return transcript.turns.map((t) => `${t.speaker === 'practitioner' ? 'Coach' : 'Person'}: ${t.text}`).join('\n')
}
