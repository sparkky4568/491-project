/**
 * PRACTICE SCORER: a keyword-rule stand-in until the real scorer (pipeline/ + scorer/) exists.
 *
 * It returns the same ScoredSession shape the real scorer will, so the page works end to end,
 * but its tags come from simple word patterns, not an AI reading the conversation. Results are
 * always marked is_mock, so the page labels them as practice scores.
 *
 * The counting rules below mirror the placeholder rules in docs/DATA_CONTRACT.md. When the real
 * scorer is connected (VITE_API_URL, see data.ts), this file is no longer used.
 */
import type { Code, CodeAssignment, GlobalRating, Issue, Measure, ScoredSession, ThresholdConfig, TranscriptIn } from './schema'
import { CODES } from './schema'
import { formatGoal } from './format'

// ------------------------------------------------------------ Word patterns

const PERSUADE =
  /\b(you (should|need to|have to|must|ought to|gotta)|you('d| had) better|just (take|do|stop|try|cut|quit|eat|drink)|why don't you|stop (using|eating|drinking|smoking)|try the)\b/i
const CONFRONT =
  /\b(well, it doesn't|that's (not true|wrong|an excuse|not how)|you're (wrong|making excuses|not trying)|that won't work|no, that's|come on\b)/i
const PERMISSION =
  /\b(would it be (ok|okay|alright|all right)|can i (share|offer|suggest)|mind if i|may i (share|offer|suggest))\b/i
const AFFIRM =
  /\b(takes? (real )?(courage|persistence|effort|strength|commitment)|(great|good|smart|thoughtful|nice|wise) (job|idea|work|place to start|step|choice|plan)|well done|good for you|proud of you|impressive)\b/i
const AUTONOMY =
  /\b(your (call|choice|decision|plan)|up to you|it's (completely |entirely |totally )?your|you decide|whatever you (decide|choose)|you can change it)\b/i
const SEEK =
  /\b(what would you like( us)? to (focus|talk|work)|where would you like|how would you like|when would you like|would it be (ok|okay|alright)|can i (share|offer)|mind if i)\b/i
const INFO =
  /\b(research|studies|study|doctors? recommend|guidelines|it's been shown|is linked|blue light|caffeine|supplement|medication|calories|on a scale)\b/i
const YOU = /\b(you|you're|you've|you'd|your|yourself)\b/i
const DEEP =
  /\b(feel|feels|feeling|worr\w*|afraid|scar\w*|frustrat\w*|proud|hope|matters?|important|really|part of you|meaning|value|sounds like|seems like|struggl\w*|stuck|torn|both|more than|what this is|anchor|exposed|close to home|ready)\b/i

const CHANGE =
  /\b(i (want|wanna|would like|wish|need|could|can|will|plan|might|should)|i'll|i'd like|i'd really like|maybe i (could|can)|i know (i can|it would|walking would)|would (help|be (good|nice|better|something))|i miss|i('ve| have) (done|cut back|managed|gone)|i went a whole|i'll try|i like that|works for me)\b/i
const SUSTAIN =
  /\b(i can't|i don't (want|think|see|have|really like)|too (tired|busy|hard)|no time|it helps me|only time i get|hour is mine|i('m| am) not (sure|ready)|what's the point|until work|i worry|wiped out|i stopped)\b/i

// Tech checks at the very start ("Can you hear me okay?") are skipped, per the placeholder exclusion rule.
const TECH_CHECK =
  /\b(can you hear me|hear me (okay|ok|alright)|is that better|turn (the volume|it) up|(you're|you are) (a little |a bit )?(quiet|faint|breaking up)|much better,? thanks|testing,? testing)\b/i
const SKIP_REASON = 'Small talk before the session (practice rule)'

const MEDICATION =
  /\b((\d+|one|two|three|four|five|six|ten)\s?(mg|milligrams)|take (some )?(melatonin|ibuprofen|tylenol|advil|a pill|pills|medication)|try the melatonin|sleeping pills?)\b/i
const CONFIDENCE_FOR_THEM =
  /\bon a scale[^?]*\byou('re| are) (about |at )?(an? )?(zero|one|two|three|four|five|six|seven|eight|nine|ten|\d+)\b/i

const WHY: Record<Code, string> = {
  Q: 'Practice rule: the sentence ends with a question mark.',
  SR: 'Practice rule: a short statement that says back what the person said.',
  CR: 'Practice rule: a statement that says back what the person said and adds a feeling or meaning.',
  GI: 'Practice rule: it shares facts or information.',
  PERSUADE: 'Practice rule: it tells the person what to do (for example "you should") without asking first.',
  PERSUADE_WP: 'Practice rule: it gives advice after asking permission.',
  AF: 'Practice rule: it praises a strength or effort.',
  SEEK: 'Practice rule: it invites the person to steer the conversation.',
  EMPHASIZE: "Practice rule: it says the choice is the person's.",
  CONFRONT: 'Practice rule: it argues with or corrects the person.',
}

const sentences = (text: string) =>
  text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
const words = (text: string) => text.split(/\s+/).filter(Boolean).length

/** followsPerson: the message replies to something the person just said. */
function tagCoachMessage(text: string, followsPerson: boolean): CodeAssignment[] {
  const tags: CodeAssignment[] = []
  const permission = PERMISSION.test(text)
  const add = (code: Code, quote: string) => {
    const reflection = code === 'SR' || code === 'CR'
    if (tags.some((t) => t.code === code || (reflection && (t.code === 'SR' || t.code === 'CR')))) return
    tags.push({ code, evidence_quote: quote, rationale: WHY[code], evidence_valid: true })
  }
  sentences(text).forEach((s, i) => {
    if (CONFRONT.test(s)) add('CONFRONT', s)
    if (PERSUADE.test(s)) add(permission ? 'PERSUADE_WP' : 'PERSUADE', s)
    const affirm = AFFIRM.test(s)
    const autonomy = AUTONOMY.test(s)
    const seek = SEEK.test(s)
    if (affirm) add('AF', s)
    if (autonomy) add('EMPHASIZE', s)
    if (seek) add('SEEK', s)
    if (s.endsWith('?')) {
      add('Q', s)
      return
    }
    const info = INFO.test(s)
    if (info) add('GI', s)
    // A reflection: a statement about the person, or an opening statement that answers what they just said.
    const aboutThem = YOU.test(s) || (followsPerson && i === 0 && words(s) >= 5)
    if (aboutThem && !info && !affirm && !autonomy && !seek && !PERSUADE.test(s) && !CONFRONT.test(s)) {
      add(DEEP.test(s) || words(s) >= 14 ? 'CR' : 'SR', s)
    }
  })
  return tags
}

function tagPersonMessage(text: string): { talk: 'change' | 'sustain' | 'neutral'; quote: string | null } {
  for (const s of sentences(text)) {
    const change = CHANGE.exec(s)?.index ?? Infinity
    const sustain = SUSTAIN.exec(s)?.index ?? Infinity
    if (change === Infinity && sustain === Infinity) continue
    return { talk: sustain < change ? 'sustain' : 'change', quote: s }
  }
  return { talk: 'neutral', quote: null }
}

// ------------------------------------------------------------------ Scoring

const clamp = (n: number) => Math.max(1, Math.min(5, Math.round(n)))

export function demoScore(transcript: TranscriptIn, thresholds: ThresholdConfig): ScoredSession {
  // Skip opening tech-check messages; everything from the first real message on is scored.
  const firstReal = transcript.turns.findIndex((t) => !TECH_CHECK.test(t.text))
  const skipped = firstReal === -1 ? 0 : firstReal

  const turns: ScoredSession['turns'] = transcript.turns.map((t, i) => {
    const excluded = i < skipped
    const base = {
      turn: t.turn,
      text: t.text,
      node: t.node,
      start_sec: t.start_sec,
      excluded,
      exclusion_reason: excluded ? SKIP_REASON : null,
    }
    if (t.speaker === 'practitioner') {
      const followsPerson = transcript.turns[i - 1]?.speaker === 'client'
      return { ...base, speaker: 'practitioner' as const, codes: tagCoachMessage(t.text, followsPerson) }
    }
    const { talk, quote } = tagPersonMessage(t.text)
    return { ...base, speaker: 'client' as const, client_talk: talk, client_evidence_quote: quote }
  })

  const coach = turns.flatMap((t) => (t.speaker === 'practitioner' && !t.excluded ? [t] : []))
  const counts = Object.fromEntries(CODES.map((c) => [c, 0])) as Record<Code, number>
  for (const t of coach) for (const c of t.codes) counts[c.code]++
  const talk = { change: 0, sustain: 0, neutral: 0 }
  for (const t of turns) if (t.speaker === 'client' && !t.excluded) talk[t.client_talk]++

  const R = counts.SR + counts.CR
  const Q = counts.Q
  const mina = counts.PERSUADE + counts.CONFRONT
  const supportive = counts.AF + counts.SEEK + counts.EMPHASIZE
  const turnsWith = (codes: Code[]) => coach.filter((t) => t.codes.some((c) => codes.includes(c.code))).map((t) => t.turn)

  // Overall ratings (1–5), from simple counts.
  const globals: GlobalRating[] = [
    {
      id: 'cultivating_change_talk',
      score: clamp(2 + (talk.change >= 2 ? 1 : 0) + (counts.CR >= 3 ? 1 : 0) + (Q > 0 && R >= Q ? 1 : 0)),
      cited_turns: turnsWith(['CR']).slice(0, 4),
      rationale: `Practice rating from counts: ${talk.change} "wants to change" moments and ${counts.CR} reflections that add meaning.`,
    },
    {
      id: 'softening_sustain_talk',
      score: clamp(3 + (talk.sustain > 0 && mina === 0 ? 1 : 0) + (counts.EMPHASIZE > 0 ? 1 : 0) - (mina > 0 ? 2 : 0)),
      cited_turns: turnsWith(['PERSUADE', 'CONFRONT', 'EMPHASIZE']).slice(0, 4),
      rationale: `Practice rating from counts: ${talk.sustain} "holding back" moments, ${mina} pushy moments.`,
    },
    {
      id: 'partnership',
      score: clamp(
        3 +
          (counts.SEEK + counts.EMPHASIZE > 0 ? 1 : 0) +
          (mina === 0 ? 1 : 0) -
          (counts.PERSUADE > 0 ? 1 : 0) -
          (counts.CONFRONT > 0 ? 1 : 0),
      ),
      cited_turns: turnsWith(['SEEK', 'EMPHASIZE', 'PERSUADE', 'CONFRONT']).slice(0, 4),
      rationale: `Practice rating from counts: ${counts.SEEK + counts.EMPHASIZE} times sharing control, ${mina} pushy moments.`,
    },
    {
      id: 'empathy',
      score: clamp(
        2 + (counts.CR >= 2 ? 1 : 0) + (R > 0 && counts.CR / R >= 0.5 ? 1 : 0) + (R >= Q ? 1 : 0) - (counts.CONFRONT > 0 ? 1 : 0),
      ),
      cited_turns: turnsWith(['CR', 'SR']).slice(0, 4),
      rationale: `Practice rating from counts: ${R} reflections against ${Q} questions.`,
    },
  ]
  const g = Object.fromEntries(globals.map((x) => [x.id, x.score]))

  const goal = (id: string) => {
    const t = thresholds.items.find((x) => x.id === id)
    return t ? { op: t.op, value: t.value, source: 'placeholder' } : null
  }
  const measure = (id: string, label: string, formula: string, value: number | null, n: number, notEnough = false): Measure => {
    const threshold = goal(id)
    let status: Measure['status'] = 'no_threshold'
    if (notEnough || value === null) status = 'insufficient_data'
    else if (threshold) {
      const ok = {
        '>=': value >= threshold.value,
        '<=': value <= threshold.value,
        '==': value === threshold.value,
        '>': value > threshold.value,
        '<': value < threshold.value,
      }[threshold.op]
      status = ok ? 'pass' : 'fail'
    }
    return { id, label, value: status === 'insufficient_data' ? null : value, n, formula, threshold, status }
  }
  const measures: Measure[] = [
    measure('pct_complex_reflections', '% Complex Reflections', 'CR / (SR + CR)', R ? counts.CR / R : null, R, R < 3),
    measure(
      'reflection_to_question',
      'Reflection-to-Question Ratio',
      '(SR + CR) / Q',
      Q ? R / Q : null,
      R + Q,
      Q === 0 || R + Q < 5,
    ),
    measure('total_mia', 'Total MI-Adherent', 'AF + SEEK + EMPHASIZE', supportive, coach.length),
    measure('total_mina', 'Total MI Non-Adherent', 'PERSUADE + CONFRONT', mina, coach.length),
    measure('relational', 'Relational', '(partnership + empathy) / 2', (g.partnership + g.empathy) / 2, turns.length - skipped),
    measure(
      'technical',
      'Technical',
      '(cultivating_change_talk + softening_sustain_talk) / 2',
      (g.cultivating_change_talk + g.softening_sustain_talk) / 2,
      turns.length - skipped,
    ),
  ]

  // Reflections in a row: coach messages with a reflection and no question.
  let best: number[] = []
  let run: number[] = []
  for (const t of coach) {
    const reflects = t.codes.some((c) => c.code === 'SR' || c.code === 'CR')
    const asks = t.codes.some((c) => c.code === 'Q')
    run = reflects && !asks ? [...run, t.turn] : []
    if (run.length > best.length) best = run
  }
  const cap = thresholds.items.find((x) => x.id === 'longest_reflection_run')?.value ?? 2

  const window = 10
  const points = []
  for (let end = window; end <= turns.length; end++) {
    const inWindow = coach.filter((t) => t.turn > end - window && t.turn <= end).flatMap((t) => t.codes)
    const r = inWindow.filter((c) => c.code === 'SR' || c.code === 'CR').length
    const q = inWindow.filter((c) => c.code === 'Q').length
    points.push({ end_turn: end, rq: q ? Math.round((r / q) * 100) / 100 : null })
  }

  // Problems
  const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z')
  const issues: Issue[] = []
  const issue = (
    type: Issue['type'],
    title: string,
    detail: string,
    measureId: string | null,
    issueTurns: number[],
    quote: string | null,
  ) =>
    issues.push({
      issue_id: `ISS-${String(issues.length + 1).padStart(4, '0')}`,
      session_id: transcript.session_id,
      type,
      title,
      detail,
      measure_id: measureId,
      node: null,
      turns: issueTurns,
      evidence_quote: quote,
      provenance: transcript.provenance,
      aven_version: transcript.aven_version,
      coder_prompt_version: 'practice-rules-v0',
      model: 'practice rules (not AI)',
      created_at: now,
    })
  const failed = (id: string) => measures.find((m) => m.id === id)?.status === 'fail'
  const pct = (v: number) => `${Math.round(v * 100)}%`
  // Read the threshold from thresholds.json so the text never disagrees with the score tiles.
  const threshold = (id: string) => {
    const t = measures.find((m) => m.id === id)?.threshold
    return t ? ` Threshold: ${formatGoal(id, t)}.` : ''
  }
  if (failed('pct_complex_reflections'))
    issue(
      'measure_below_threshold',
      'Too few reflections add meaning',
      `${pct(counts.CR / R)} of the coach's reflections added meaning (${counts.CR} of ${R}).${threshold('pct_complex_reflections')}`,
      'pct_complex_reflections',
      turnsWith(['SR', 'CR']),
      null,
    )
  if (failed('reflection_to_question'))
    issue(
      'measure_below_threshold',
      'Asked far more than listened',
      `${(R / Q).toFixed(2)} reflections per question (${R} reflections, ${Q} questions).${threshold('reflection_to_question')}`,
      'reflection_to_question',
      turnsWith(['SR', 'CR', 'Q']),
      null,
    )
  if (failed('total_mina')) {
    const first = coach.flatMap((t) => t.codes).find((c) => c.code === 'CONFRONT' || c.code === 'PERSUADE')
    issue(
      'measure_below_threshold',
      'Coach pushed advice or argued',
      `${mina} pushy moment${mina === 1 ? '' : 's'} (${counts.PERSUADE} pushing advice, ${counts.CONFRONT} arguing).${threshold('total_mina')}`,
      'total_mina',
      turnsWith(['PERSUADE', 'CONFRONT']),
      first?.evidence_quote ?? null,
    )
  }
  if (failed('relational'))
    issue(
      'measure_below_threshold',
      'Low relationship score',
      `${((g.partnership + g.empathy) / 2).toFixed(1)} out of 5.${threshold('relational')}`,
      'relational',
      [],
      null,
    )
  if (failed('technical'))
    issue(
      'measure_below_threshold',
      'Low technique score',
      `${((g.cultivating_change_talk + g.softening_sustain_talk) / 2).toFixed(1)} out of 5.${threshold('technical')}`,
      'technical',
      [],
      null,
    )
  if (best.length > cap)
    issue(
      'table_c_flag',
      'Too many reflections in a row',
      `The coach reflected ${best.length} times in a row without asking anything. The design cap is ${cap}, so ${cap + 1} or more fails the session.`,
      null,
      best,
      null,
    )
  const notAllowed: Array<[RegExp, string, string]> = [
    [MEDICATION, 'Clinical advice', 'Named or recommended a medication or dose.'],
    [CONFIDENCE_FOR_THEM, 'Answered the confidence question for the person', 'Stated their confidence number instead of asking.'],
  ]
  for (const [pattern, title, detail] of notAllowed) {
    const hits = coach.filter((t) => pattern.test(t.text))
    if (hits.length === 0) continue
    const quote = sentences(hits[0].text).find((s) => pattern.test(s)) ?? null
    issue(
      'table_d_behavior',
      title,
      `${detail} (Example rule: the sponsor's real list is still coming.)`,
      null,
      hits.map((t) => t.turn),
      quote,
    )
  }

  return {
    ...transcript,
    is_mock: true,
    scorer: {
      run_id: `practice-${now}`,
      scored_at: now,
      coder_prompt_version: 'practice-rules-v0',
      globals_prompt_version: 'practice-rules-v0',
      model: 'practice rules (not AI)',
      cost_usd: 0,
    },
    turns,
    counts,
    client_talk_counts: talk,
    measures,
    globals,
    flags: {
      longest_reflection_run: { length: best.length, turns: best, cap, exceeds_cap: best.length > cap },
      windowed_rq: { window_size: window, points },
    },
    issues,
  }
}
