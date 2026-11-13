/**
 * Console checks for the v1.2 gaps: loading scorer files, the JSONL export, withheld measures,
 * the corpus-only 10-volley rule, and the safety-node list data.
 *
 * Run (no extra dependencies; esbuild ships with Vite):
 *   npx esbuild tests/console.test.ts --bundle --platform=node --format=esm --outfile=node_modules/.tmp/console.test.mjs
 *   node node_modules/.tmp/console.test.mjs        (or node --test on the same file)
 * Set AVEN_SCORED_DIR to a folder of exported ScoredSession files to check real scorer output too.
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { HealthSchema, SessionListSchema } from '../src/lib/apiSchemas'
import { demoScore } from '../src/lib/demoScorer'
import { issueLogFileName, issuesToCsv, issuesToJsonl, splitEvidence } from '../src/lib/format'
import { hrefFor, parseHash } from '../src/lib/router'
import { issuesByVolley, rowStats } from '../src/lib/sessionStats'
import { parseScoredFile } from '../src/lib/loadScored'
import {
  ISSUE_LOG_COLUMNS,
  ThresholdsFileSchema,
  type ScoredSession,
  type ThresholdConfig,
  type TranscriptIn,
} from '../src/lib/schema'
import { isShortCorpusSession, withheldMeasures, withheldReason } from '../src/lib/withheld'
import { isInventedSample, provenanceLabel, sourceLabel } from '../src/lib/miti'

const ROOT = join(process.cwd(), '..')
const SCORED_DIR = join(ROOT, 'shared/sample_data/scored')
const readText = (path: string) => readFileSync(path, 'utf-8')

function loadSample(name: string): ScoredSession {
  const r = parseScoredFile(readText(join(SCORED_DIR, name)), name)
  assert.ok(r.ok, r.ok ? '' : `${name}: ${r.error.message} ${r.error.details?.join(' | ')}`)
  return r.loaded.session
}

function thresholds(): ThresholdConfig {
  const file = ThresholdsFileSchema.parse(JSON.parse(readText(join(ROOT, 'shared/config/thresholds.json'))))
  const { _status, ...rest } = file
  return { status: _status, isPlaceholder: false, items: Object.entries(rest).map(([id, t]) => ({ id, ...t })) }
}

// ------------------------------------------------------------ Load scored file

test('every sample ScoredSession v0.2 file loads', () => {
  for (const name of readdirSync(SCORED_DIR).filter((f) => f.endsWith('.json'))) loadSample(name)
})

test('a schema_version mismatch is a clear error', () => {
  const raw = JSON.parse(readText(join(SCORED_DIR, 'MOCK-AVEN-003.json')))
  raw.schema_version = '0.1'
  const r = parseScoredFile(JSON.stringify(raw), 'old.json')
  assert.equal(r.ok, false)
  if (!r.ok) {
    assert.match(r.error.message, /schema_version is "0\.1"/)
    assert.match(r.error.message, /reads ScoredSession version 0\.2/)
    assert.equal(r.error.fileName, 'old.json')
  }
})

test('a transcript, bad JSON and a broken session are rejected with reasons', () => {
  const transcript = readText(join(ROOT, 'shared/sample_data/transcripts/MOCK-AVEN-003.json'))
  const t = parseScoredFile(transcript, 't.json')
  assert.ok(!t.ok && /not a scored session/.test(t.error.message))

  const bad = parseScoredFile('{nope', 'b.json')
  assert.ok(!bad.ok && bad.error.message === 'Not valid JSON.')

  const raw = JSON.parse(readText(join(SCORED_DIR, 'MOCK-AVEN-003.json')))
  raw.volleys[2].codes = [{ code: 'NOPE' }]
  const broken = parseScoredFile(JSON.stringify(raw), 'x.json')
  assert.ok(!broken.ok && (broken.error.details?.length ?? 0) > 0)
  if (!broken.ok) assert.ok(broken.error.details?.some((d) => d.startsWith('volleys[2]')))
})

test('exported scorer files load, or fail only on schema_version', () => {
  const dir = process.env.AVEN_SCORED_DIR
  if (!dir || !existsSync(dir)) return
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'))
  assert.ok(files.length > 0, `no .json files in ${dir}`)
  for (const name of files) {
    const raw = JSON.parse(readText(join(dir, name)))
    if (!('scorer' in raw)) continue
    const r = parseScoredFile(JSON.stringify(raw), name)
    if (raw.schema_version === '0.2') assert.ok(r.ok, r.ok ? '' : `${name}: ${r.error.message} ${r.error.details?.join(' | ')}`)
    else assert.ok(!r.ok && /schema_version/.test(r.error.message), name)
  }
})

// ------------------------------------------------------------------- JSONL

test('JSONL export has one object per row with the 16 columns in order', () => {
  const s = loadSample('MOCK-REF-002.json')
  const text = issuesToJsonl(s.issues)
  const lines = text.split('\n')
  assert.equal(lines.pop(), '')
  assert.equal(lines.length, s.issues.length)
  lines.forEach((line, i) => {
    const obj = JSON.parse(line)
    assert.deepEqual(Object.keys(obj), [...ISSUE_LOG_COLUMNS])
    for (const col of ISSUE_LOG_COLUMNS) assert.deepEqual(obj[col], s.issues[i][col])
  })
  // Same rows as the CSV (header plus one line per row).
  assert.equal(issuesToCsv(s.issues).trimEnd().split('\r\n').length, s.issues.length + 1)
  assert.equal(issuesToJsonl([]), '')
  assert.equal(issueLogFileName('run/1', 'jsonl'), 'issue_log_run_1.jsonl')
  assert.equal(issueLogFileName('run/1'), 'issue_log_run_1.csv')
})

// ------------------------------------------------------------ Withheld measures

test('withheld list names the technical global and technique ratings on counts_only', () => {
  const s = loadSample('MOCK-REF-002.json')
  const items = withheldMeasures(s)
  assert.ok(items.some((i) => i.code === 'technical' && /full/i.test(i.reason)))
  assert.ok(items.some((i) => i.label === 'Technique ratings'))
  assert.ok(items.every((i) => i.reason.length > 0))
})

test('nothing is listed as withheld for a fully reported session or a not_scoreable one', () => {
  assert.deepEqual(withheldMeasures(loadSample('MOCK-REF-001.json')), [])
  assert.deepEqual(withheldMeasures(loadSample('MOCK-TEST-004.json')), [])
})

test('the 10-volley note applies only to corpus sessions', () => {
  const aven = loadSample('MOCK-AVEN-003.json')
  const corpus = loadSample('MOCK-REF-001.json')
  const m = { ...corpus.measures[0], value: null, status: 'insufficient_data' as const, note: null, n: 0 }

  // Corpus session with 9 coded coach volleys: the sponsor rule is named.
  const keep = new Set(
    corpus.volleys
      .filter((v) => v.speaker === 'agent' && !v.excluded)
      .slice(0, 9)
      .map((v) => v.volley),
  )
  const shortCorpus: ScoredSession = {
    ...corpus,
    volleys: corpus.volleys.map((v) => (v.speaker === 'agent' && !keep.has(v.volley) ? { ...v, excluded: true } : v)),
  }
  assert.ok(isShortCorpusSession(shortCorpus))
  assert.match(withheldReason(m, shortCorpus) ?? '', /Corpus session \(AnnoMI\) with 9 coded coach volleys/)

  // The same short volley count on an Aven call never mentions the corpus rule.
  const shortAven: ScoredSession = {
    ...aven,
    volleys: aven.volleys.map((v) => (v.speaker === 'agent' ? { ...v, excluded: true } : v)),
  }
  assert.equal(isShortCorpusSession(shortAven), false)
  const reason = withheldReason(m, shortAven) ?? ''
  assert.doesNotMatch(reason, /10|corpus/i)
})

test('the practice scorer applies the 10-volley ratio rule to corpus sources only', () => {
  const turns: TranscriptIn['turns'] = []
  for (let i = 0; i < 4; i++) {
    turns.push({
      turn: turns.length + 1,
      speaker: 'agent',
      text: 'What would you like to change about that?',
      start_ms: null,
      end_ms: null,
      node: null,
    })
    turns.push({
      turn: turns.length + 1,
      speaker: 'caller',
      text: 'I want to walk more after work.',
      start_ms: null,
      end_ms: null,
      node: null,
    })
    turns.push({
      turn: turns.length + 1,
      speaker: 'agent',
      text: 'It sounds like walking matters to you.',
      start_ms: null,
      end_ms: null,
      node: null,
    })
    turns.push({
      turn: turns.length + 1,
      speaker: 'caller',
      text: 'Yes, it really does.',
      start_ms: null,
      end_ms: null,
      node: null,
    })
  }
  const base: TranscriptIn = {
    schema_version: '1.0',
    session_id: 'T-SHORT',
    is_mock: true,
    provenance: 'internal_test',
    source: 'other',
    aven_version: null,
    channel: 'text',
    duration_sec: null,
    change_goal: { text: null, state: 'no_goal_reached' },
    target_behavior: null,
    turns,
    events: [],
  }
  const cfg = thresholds()
  const other = demoScore(base, cfg)
  const annomi = demoScore({ ...base, provenance: 'reference_corpus', source: 'annomi' }, cfg)
  const coded = (s: ScoredSession) => s.volleys.filter((v) => v.speaker === 'agent' && !v.excluded).length
  assert.ok(coded(other) < 10 && coded(other) >= 5, `coded volleys ${coded(other)}`)
  const tooFew = (s: ScoredSession) => s.measures.filter((m) => /fewer than 10/.test(m.note ?? ''))
  assert.equal(tooFew(other).length, 0)
  assert.ok(tooFew(annomi).length > 0)
})

// ------------------------------------------------------------------ Safety list

test('safety volleys resolve to volleys with turns, node and text', () => {
  const s = loadSample('MOCK-AVEN-003.json')
  assert.ok(s.safety_volleys.length > 0)
  for (const n of s.safety_volleys) {
    const v = s.volleys.find((x) => x.volley === n)
    assert.ok(v, `volley ${n}`)
    assert.ok(v.nodes.includes('safety_response'))
    assert.ok(v.text.length > 0)
  }
})

// ------------------------------------------------------------------ Design v2 wiring

test('issue-log evidence: verbatim lines (current scorer) and legacy [turn N] || form both split', () => {
  assert.deepEqual(splitEvidence('First quote.\nSecond quote.'), [
    { turn: null, text: 'First quote.' },
    { turn: null, text: 'Second quote.' },
  ])
  assert.deepEqual(splitEvidence('[turn 4] a || [turns 9-11] b'), [
    { turn: 4, text: 'a' },
    { turn: 9, text: 'b' },
  ])
})

test('verbatim evidence lines map back to the coded volleys that hold them', () => {
  const s = loadSample('MOCK-AVEN-003.json')
  const coded = s.volleys.filter((v) => v.speaker === 'agent' && !v.excluded && !s.safety_volleys.includes(v.volley))
  assert.ok(coded.length >= 2)
  const [a, b] = coded
  const issue = {
    ...s.issues[0],
    entry_type: 'TABLE_C' as const,
    item: 'C1_reflection_run',
    turn_start: a.turn_start,
    turn_end: b.turn_end,
    evidence: `${a.text}\n${b.text}`,
  }
  const map = issuesByVolley({ ...s, issues: [issue] })
  assert.deepEqual(
    [...map.keys()].sort((x, y) => x - y),
    [a.volley, b.volley],
  )
})

test('runs-list counts come straight from the session', () => {
  const s = loadSample('MOCK-AVEN-003.json')
  const r = rowStats(s)
  assert.equal(r.coachVolleys, s.scoreability.agent_volleys)
  assert.equal(r.tableD, s.table_d.length)
  assert.equal(r.below, s.measures.filter((m) => m.status === 'below').length)
  assert.ok(r.below <= r.compared)
  assert.equal(rowStats(loadSample('MOCK-TEST-004.json')).notScoreable, true)
})

test('hash routes round-trip, including odd session ids', () => {
  assert.deepEqual(parseHash(''), { page: 'runs' })
  assert.deepEqual(parseHash('#/score'), { page: 'score' })
  const route = { page: 'session' as const, sessionId: 'call 01/x', tab: 'issues' as const }
  assert.deepEqual(parseHash(hrefFor(route)), route)
  assert.deepEqual(parseHash('#/session/call-01/nope'), { page: 'session', sessionId: 'call-01', tab: 'summary' })
})

test('the API reply schemas accept what aven_scorer/api.py sends', () => {
  const health = HealthSchema.parse({
    status: 'ok',
    version: '0.2.0',
    backend: 'fake',
    model: 'claude-haiku-5-5',
    key_configured: false,
    is_mock: true,
    kill_switch_set: false,
    spend_cap_usd: null,
    spent_usd: 0,
    conversations_scored: 0,
    sessions_dir_set: true,
    team_schema_found: true,
  })
  assert.equal(health.backend, 'fake')
  assert.equal(HealthSchema.safeParse({ version: '1' }).success, false)
  const list = SessionListSchema.parse({
    count: 1,
    sessions: [
      {
        session_id: 'S01',
        file: 'S01.json',
        schema_version: '0.2',
        is_mock: false,
        source: 'aven_staff_call',
        provenance: 'internal_test',
        aven_version: null,
        duration_sec: null,
        scoreability: 'counts_only',
        run_id: 'r1',
        scored_at: '2026-11-12T00:00:00Z',
        model: 'm',
        issues: 3,
      },
    ],
    unreadable: [],
  })
  assert.equal(list.sessions[0].session_id, 'S01')
})

test('invented samples are never labelled as corpus or call data', () => {
  const base = { is_mock: true, provenance: 'reference_corpus' as const, source: 'annomi' as const }
  const invented = { ...base, session_id: 'MOCK-REF-001' }
  assert.equal(isInventedSample(invented), true)
  assert.equal(provenanceLabel(invented), 'Invented sample')
  assert.match(sourceLabel(invented), /^Tagged AnnoMI \(invented, not real data\)$/)
  // A real id scored by the fake backend is mock scoring of real data, not an invented sample.
  const real = { ...base, session_id: 'annomi-101' }
  assert.equal(isInventedSample(real), false)
  assert.equal(provenanceLabel(real), 'Reference conversation')
  assert.equal(isInventedSample({ ...invented, is_mock: false }), false)
})
