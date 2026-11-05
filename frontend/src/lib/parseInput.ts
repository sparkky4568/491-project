/**
 * Turns whatever was pasted into the box into something the scorer can use.
 *
 * Accepted:
 *  1. Plain text, one message per line, each starting with a speaker label:
 *       Coach: What would you like to talk about today?
 *       Caller: I want to start walking more.
 *     Lines without a label continue the message above them. This becomes a canonical 1.0
 *     transcript on the text channel (no timings, so no 10-minute rule and no overall ratings).
 *  2. A canonical 1.0 transcript JSON (the sponsor's schema, deliv s8).
 *  3. A legacy v0.1 transcript JSON (speaker practitioner / client, start_sec), converted to 1.0.
 *  4. A v0.2 ScoredSession JSON (scorer output); it is shown as is, not re-scored.
 */
import { z } from 'zod'
import {
  PROVENANCES,
  ScoredSessionSchema,
  SUPPORTED_SCHEMA_VERSION,
  TRANSCRIPT_SCHEMA_VERSION,
  TranscriptInSchema,
  describeZodError,
  type ScoredSession,
  type Source,
  type TranscriptIn,
} from './schema'

export type ParsedInput =
  | { kind: 'transcript'; transcript: TranscriptIn }
  | { kind: 'scored'; session: ScoredSession }
  | { kind: 'error'; message: string; details?: string[] }

const AGENT_LABELS = new Set([
  'coach',
  'agent',
  'aven',
  'practitioner',
  'counselor',
  'counsellor',
  'therapist',
  'interviewer',
  'clinician',
  'provider',
])
const CALLER_LABELS = new Set(['caller', 'person', 'client', 'patient', 'user', 'member', 'participant'])
const MAX_MESSAGES = 300

export function parseConversationInput(text: string): ParsedInput {
  const trimmed = text.trim()
  if (!trimmed) return { kind: 'error', message: 'Paste a conversation first.' }
  if (trimmed.startsWith('{')) return parseJson(trimmed)
  return parseText(trimmed)
}

// ------------------------------------------------------------------- JSON

/** The v0.1 transcript the page used before the v1.2 scope change. */
const LegacyTranscriptSchema = z.object({
  schema_version: z.string(),
  session_id: z.string().min(1),
  is_mock: z.boolean().default(false),
  provenance: z.enum(PROVENANCES),
  source: z.string(),
  target_behavior: z.string().nullable().optional(),
  aven_version: z.string().nullable().optional(),
  turns: z
    .array(
      z.object({
        turn: z.number().int().min(1),
        speaker: z.enum(['practitioner', 'client']),
        text: z.string(),
        node: z.string().nullable().optional(),
        start_sec: z.number().min(0).nullable().optional(),
      }),
    )
    .min(1),
})

const LEGACY_SOURCES: Record<string, Source> = { aven: 'aven_staff_call', annomi: 'annomi', casaa: 'casaa' }

function parseJson(text: string): ParsedInput {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { kind: 'error', message: "This looks like JSON, but it isn't valid JSON." }
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw))
    return { kind: 'error', message: 'This JSON should be one object, a transcript or a scored session.' }
  const obj = raw as Record<string, unknown>

  // Scorer output: only the current contract version is read.
  if ('scorer' in obj) {
    if (obj.schema_version !== SUPPORTED_SCHEMA_VERSION)
      return {
        kind: 'error',
        message: `This scored session uses data contract version ${String(obj.schema_version ?? 'unknown')}. This page reads version ${SUPPORTED_SCHEMA_VERSION}. Score the transcript again with the current scorer, or paste the transcript instead.`,
      }
    const scored = ScoredSessionSchema.safeParse(raw)
    if (scored.success) return { kind: 'scored', session: scored.data }
    return {
      kind: 'error',
      message: `This scored session doesn't match the ScoredSession format in docs/DATA_CONTRACT.md.`,
      details: describeZodError(scored.error, raw, 5),
    }
  }

  // Older transcripts (speaker practitioner / client) are converted, so saved files still open.
  const turns = Array.isArray(obj.turns) ? (obj.turns as unknown[]) : []
  const legacy =
    obj.schema_version === '0.1' ||
    turns.some((t) => {
      const speaker = (t as Record<string, unknown> | null)?.speaker
      return speaker === 'practitioner' || speaker === 'client'
    })
  if (legacy) {
    const parsed = LegacyTranscriptSchema.safeParse(raw)
    if (parsed.success) return checkTurnOrder(fromLegacy(parsed.data))
    return {
      kind: 'error',
      message: "This looks like an older (v0.1) transcript, but it doesn't match that format.",
      details: describeZodError(parsed.error, raw, 5),
    }
  }

  if (obj.schema_version !== TRANSCRIPT_SCHEMA_VERSION)
    return {
      kind: 'error',
      message: `This transcript says it is version ${String(obj.schema_version ?? 'unknown')}. This page reads the sponsor's canonical transcript, version ${TRANSCRIPT_SCHEMA_VERSION}.`,
    }
  const transcript = TranscriptInSchema.safeParse(raw)
  if (transcript.success) return checkTurnOrder(transcript.data)
  return {
    kind: 'error',
    message: `This JSON doesn't match the transcript format (canonical ${TRANSCRIPT_SCHEMA_VERSION}) in docs/DATA_CONTRACT.md.`,
    details: describeZodError(transcript.error, raw, 5),
  }
}

/** deliv s8: turns are numbered 1, 2, 3 ... in order. Repeated or out-of-order numbers would confuse turn links. */
function checkTurnOrder(transcript: TranscriptIn): ParsedInput {
  for (let i = 1; i < transcript.turns.length; i++) {
    const prev = transcript.turns[i - 1].turn
    const turn = transcript.turns[i].turn
    if (turn <= prev)
      return {
        kind: 'error',
        message: `Turn numbers must go up in order (1, 2, 3 and so on). Turn ${turn} comes right after turn ${prev}.`,
      }
  }
  return { kind: 'transcript', transcript }
}

/** v0.1 to canonical 1.0. Nothing is invented: unknown fields become null, the goal state no_goal_reached. */
function fromLegacy(old: z.infer<typeof LegacyTranscriptSchema>): TranscriptIn {
  const timed = old.turns.some((t) => t.start_sec != null)
  const target = old.target_behavior?.trim() || null
  return {
    schema_version: TRANSCRIPT_SCHEMA_VERSION,
    session_id: old.session_id,
    is_mock: old.is_mock,
    provenance: old.provenance,
    source: LEGACY_SOURCES[old.source] ?? 'other',
    aven_version: old.aven_version ?? null,
    channel: timed ? 'voice' : 'text',
    // v0.1 kept only start times, so the call length is unknown.
    duration_sec: null,
    change_goal: { text: target, state: 'no_goal_reached' },
    target_behavior: target,
    turns: old.turns.map((t) => ({
      turn: t.turn,
      speaker: t.speaker === 'practitioner' ? 'agent' : 'caller',
      text: t.text,
      start_ms: t.start_sec != null ? Math.round(t.start_sec * 1000) : null,
      end_ms: null,
      node: t.node ?? null,
    })),
    events: [],
  }
}

// ------------------------------------------------------------------- Text

function parseText(text: string): ParsedInput {
  const turns: TranscriptIn['turns'] = []
  const lines = text.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const match = /^([A-Za-z][A-Za-z ]{0,24}?)\s*:\s*(.*)$/.exec(line)
    const label = match?.[1].trim().toLowerCase()
    const speaker = label && AGENT_LABELS.has(label) ? 'agent' : label && CALLER_LABELS.has(label) ? 'caller' : null

    if (match && speaker) {
      turns.push({ turn: turns.length + 1, speaker, text: match[2].trim(), start_ms: null, end_ms: null, node: null })
    } else if (match && turns.length === 0) {
      return {
        kind: 'error',
        message: `Line ${i + 1} starts with "${match[1]}:". Start each message with "Coach:" or "Caller:".`,
      }
    } else if (turns.length > 0) {
      // No speaker label: this line continues the previous message.
      const last = turns[turns.length - 1]
      last.text = `${last.text} ${line}`.trim()
    } else {
      return {
        kind: 'error',
        message: 'Start each message with "Coach:" or "Caller:", for example "Coach: How are you feeling today?"',
      }
    }
  }

  const kept = turns.filter((t) => t.text.length > 0)
  if (kept.length > MAX_MESSAGES)
    return { kind: 'error', message: `That's ${kept.length} messages. The limit is ${MAX_MESSAGES}.` }
  if (!kept.some((t) => t.speaker === 'agent')) return { kind: 'error', message: 'There are no "Coach:" messages to score.' }
  if (!kept.some((t) => t.speaker === 'caller'))
    return { kind: 'error', message: 'There are no "Caller:" messages. Add what the caller said too.' }

  const now = new Date()
  return {
    kind: 'transcript',
    transcript: {
      schema_version: TRANSCRIPT_SCHEMA_VERSION,
      session_id: `PASTED-${now.toISOString().slice(11, 19).replace(/:/g, '')}`,
      // We can't tell whether pasted text is invented. The practice scorer marks its scores as mock.
      is_mock: false,
      provenance: 'internal_test',
      source: 'other',
      aven_version: null,
      channel: 'text',
      duration_sec: null,
      change_goal: { text: null, state: 'no_goal_reached' },
      target_behavior: null,
      turns: kept.map((t, i) => ({ ...t, turn: i + 1 })),
      events: [],
    },
  }
}

/** The reverse: an example transcript as the plain text people would paste. */
export function transcriptToText(transcript: TranscriptIn): string {
  return transcript.turns.map((t) => `${t.speaker === 'agent' ? 'Coach' : 'Caller'}: ${t.text}`).join('\n')
}
