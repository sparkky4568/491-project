# Data contract

> **v0 draft. AI + Backend own this. If you change a field, bump `schema_version` and update the JSON Schema and the sample data in the same PR.**

This file describes the JSON that moves between the pipeline, the scorer, validation and the review console. It exists so all five of us can work in parallel. Ethan (AI) and Ricardo (Backend) own the final version; it is their timeline task, "design coding and evidence schema".

| Shape            | What it is                                     | JSON Schema                                  | Frontend (TS types + Zod) | Sample                                      |
| ---------------- | ---------------------------------------------- | -------------------------------------------- | ------------------------- | ------------------------------------------- |
| TranscriptIn     | What the pipeline ingests                      | `shared/schema/transcript_in.schema.json`    | `frontend/src/lib/schema.ts` | `shared/sample_data/transcripts/*.json`  |
| ScoredSession    | What the pipeline writes; the console reads it | `shared/schema/scored_session.schema.json`   | same                      | `shared/sample_data/scored/*.json`          |
| Issue            | One row in the issue log                       | `shared/schema/issue.schema.json`            | same                      | inside each scored session's `issues`       |
| ValidationReport | Scorer-vs-human agreement                      | `shared/schema/validation_report.schema.json`| same                      | `shared/sample_data/validation_report.mock.json` |
| Thresholds       | Sponsor's pass/fail rules                      | `shared/schema/thresholds.schema.json`       | same                      | `shared/config/thresholds.json`             |

## Conventions

- **Turns are numbered from 1** in conversation order. `turn` is the id everything else points at (`cited_turns`, `issue.turns`, flags).
- **`null`, not missing.** Every field in a shape is always present. Use `null` when there's no value (for example `node` and `aven_version` for corpus data).
- **Timestamps** are ISO 8601 in UTC (`2026-10-20T18:00:00Z`). Dates are `YYYY-MM-DD`.
- **`is_mock: true`** on every invented file. The console shows a "MOCK DATA — not real scores" banner whenever one is on screen. Never set it to `false` on invented data.
- **`provenance`** is one of `real`, `simulated`, `reference_corpus` or `internal_test`. **`source`** is one of `aven`, `annomi`, `casaa` or `other`.
- **No real member data or PHI** in any file in this repo. All sample text is invented.
- The JSON Schemas are strict (`additionalProperties: false`) so typos fail fast. The console's Zod schemas are a little looser: they ignore unknown fields and accept unknown measure or global ids, so newer pipeline output still opens.

## TranscriptIn

What the pipeline ingests. The sponsor is sending a canonical transcript format; we'll adapt this shape when it arrives.

| Field             | Type             | Notes                                                           |
| ----------------- | ---------------- | --------------------------------------------------------------- |
| `schema_version`  | `"0.1"`          |                                                                 |
| `session_id`      | string           | e.g. `MOCK-REF-001`                                             |
| `is_mock`         | boolean          |                                                                 |
| `provenance`      | enum             | see Conventions                                                 |
| `source`          | enum             | see Conventions                                                 |
| `target_behavior` | string           | e.g. `walking more`                                             |
| `aven_version`    | string \| null   | e.g. `V17`; null for corpus data                                |
| `recorded_at`     | date \| null     |                                                                 |
| `turns[]`         | array            | `{ turn, speaker, text, node, start_sec }`                      |
| `turns[].speaker` | enum             | `practitioner` or `client`                                      |
| `turns[].node`    | string \| null   | Aven conversation-flow node (about 55 of them). null for corpus data. |
| `turns[].start_sec` | number \| null | Seconds from the start of the call                              |

```json
{
  "schema_version": "0.1",
  "session_id": "MOCK-REF-001",
  "is_mock": true,
  "provenance": "reference_corpus",
  "source": "annomi",
  "target_behavior": "walking more",
  "aven_version": null,
  "recorded_at": null,
  "turns": [{ "turn": 1, "speaker": "practitioner", "text": "…", "node": null, "start_sec": 2.0 }]
}
```

## ScoredSession

Everything in TranscriptIn (top-level fields), plus the scorer output below. Stage 1 (the LLM) fills in `codes` and `client_talk`. Stage 2 (plain code, no LLM) fills in exclusions, `counts`, `client_talk_counts`, `measures`, `flags` and `issues`. A separate LLM pass fills in `globals`.

### `scorer`

| Field                    | Notes                                     |
| ------------------------ | ----------------------------------------- |
| `run_id`                 | One batch run, e.g. `run-2026-10-20-001`  |
| `scored_at`              | ISO timestamp                             |
| `coder_prompt_version`   | e.g. `coder-v0.1`; matches a file in `docs/prompts/` |
| `globals_prompt_version` | e.g. `globals-v0.1`                       |
| `model`                  | The exact pinned model id                 |
| `cost_usd`               | LLM cost for this session                 |

### `turns[]`

Every turn has `turn, speaker, text, node, start_sec` (as in TranscriptIn) plus `excluded` (boolean) and `exclusion_reason` (string or null).

**Practitioner turns** add `codes[]`, with zero, one or several entries:

```json
{ "code": "CR", "evidence_quote": "exact words copied from text", "rationale": "one sentence", "evidence_valid": true }
```

`evidence_valid` is `false` when the quote can't be found verbatim in the turn text. The pipeline checks this, not the LLM. The console shows a warning on that chip.

**Client turns** add `client_talk` (`change`, `sustain` or `neutral`) and `client_evidence_quote` (verbatim words, or `null`, usually for neutral talk).

**Excluded turns** keep their Stage 1 codes or tags, but Stage 2 ignores them: they don't count toward anything.

### MITI 4.2.1 behavior codes

| Code          | Meaning                       | Group           |
| ------------- | ----------------------------- | --------------- |
| `Q`           | Question                      |                 |
| `SR`          | Simple Reflection             |                 |
| `CR`          | Complex Reflection            |                 |
| `GI`          | Giving Information            |                 |
| `PERSUADE`    | Persuade (without permission) | MI non-adherent |
| `PERSUADE_WP` | Persuade with Permission      |                 |
| `AF`          | Affirm                        | MI-adherent     |
| `SEEK`        | Seeking Collaboration         | MI-adherent     |
| `EMPHASIZE`   | Emphasizing Autonomy          | MI-adherent     |
| `CONFRONT`    | Confront                      | MI non-adherent |

### `counts` and `client_talk_counts`

`counts` has all 10 codes as keys. Each value is the number of times that code appears on **non-excluded** practitioner turns. `client_talk_counts` has `change`, `sustain` and `neutral`, counted over non-excluded client turns.

### `measures[]`

Computed by the pipeline from non-excluded turns. Every measure states its `n`.

```json
{
  "id": "pct_complex_reflections", "label": "% Complex Reflections",
  "value": 0.55, "n": 11, "formula": "CR / (SR + CR)",
  "threshold": { "op": ">=", "value": 0.4, "source": "placeholder" },
  "status": "pass"
}
```

| `id`                      | Formula                                                | `n` is…                                |
| ------------------------- | ------------------------------------------------------ | -------------------------------------- |
| `pct_complex_reflections` | `CR / (SR + CR)`                                       | SR + CR (number of reflections)        |
| `reflection_to_question`  | `(SR + CR) / Q`                                        | SR + CR + Q                            |
| `total_mia`               | `AF + SEEK + EMPHASIZE`                                | non-excluded practitioner turns        |
| `total_mina`              | `PERSUADE + CONFRONT`                                  | non-excluded practitioner turns        |
| `relational`              | `(partnership + empathy) / 2`                          | non-excluded turns (the globals pass rates the whole conversation) |
| `technical`               | `(cultivating_change_talk + softening_sustain_talk) / 2` | non-excluded turns                   |

- `status` is `pass`, `fail`, `no_threshold` or `insufficient_data`.
- `threshold` is copied from `shared/config/thresholds.json` at scoring time, or is `null` when there isn't one (`total_mia` today). `threshold.source` is `"placeholder"` until the sponsor confirms.
- `value` is `null` when `status` is `insufficient_data`.

### `globals[]`

The four MITI global ratings, each scored 1–5 by a separate LLM pass. They're **advisory until the scorer is validated**.

```json
{ "id": "cultivating_change_talk", "score": 4, "cited_turns": [3, 9, 15], "rationale": "…" }
```

The ids are `cultivating_change_talk`, `softening_sustain_talk`, `partnership` and `empathy`.

### `flags` (Table C)

```json
{
  "longest_reflection_run": { "length": 3, "turns": [7, 9, 11], "cap": 2, "exceeds_cap": true },
  "windowed_rq": { "window_size": 10, "points": [{ "end_turn": 10, "rq": 1.2 }] }
}
```

- `exceeds_cap` was added in v0 so the console never compares numbers itself.
- `windowed_rq.points[].rq` is `null` when the window has no questions.

### `issues[]`

A list of Issue objects (below), one per problem found in this session.

## Issue

```json
{
  "issue_id": "ISS-0007",
  "session_id": "MOCK-AVEN-003",
  "type": "table_c_flag",
  "title": "Too many reflections in a row",
  "detail": "The coach reflected 3 times in a row without asking anything. The flow allows 2.",
  "measure_id": null,
  "node": "evoke_change_talk",
  "turns": [7, 9, 11],
  "evidence_quote": "You've already proven to yourself that you can go without it.",
  "provenance": "simulated",
  "aven_version": "V17",
  "coder_prompt_version": "coder-v0.1",
  "model": "…",
  "created_at": "2026-10-20T18:02:31Z"
}
```

| `type`                    | When                                                       | `measure_id` | `turns`                                       | `evidence_quote`                    |
| ------------------------- | ---------------------------------------------------------- | ------------ | --------------------------------------------- | ----------------------------------- |
| `measure_below_threshold` | A measure has `status: "fail"`                             | the measure  | turns carrying the codes in its formula; for relational/technical, the cited turns of their globals | the first MI non-adherent quote for `total_mina`; otherwise `null` |
| `table_c_flag`            | A Table C flag fires (for example `exceeds_cap`)           | `null`       | the flagged turns                             | the turn that crossed the cap       |
| `table_d_behavior`        | A prohibited behavior from the sponsor's Table D           | `null`       | where it happened                             | the verbatim words                  |

`node` is the node of the first turn in `turns` (`null` for corpus data). Issue ids are unique across a run.

The console shows `title` and `detail` word for word to people who don't know MITI, so write them in plain English with the numbers included. For example, "Asked far more than listened" / "0.43 reflections per question (3 reflections, 7 questions). Goal: 2 or more." rather than "R:Q below threshold".

Table D is the sponsor's list of prohibited behaviors. We don't have it yet, so the mock entries are stand-ins ("gave medication advice", "answered the confidence ruler for the caller").

## ValidationReport

Owned by Joel (Validation/QA). It's v0 and will change; the JSON Schema allows extra fields for now.

```json
{
  "schema_version": "0.1",
  "is_mock": true,
  "run_id": "…", "generated_at": "2026-10-20T19:00:00Z", "split": "dev", "n_sessions": 20,
  "code_agreement": [{ "code": "Q", "metric": "cohen_kappa", "scorer_vs_human": 0.81, "human_vs_human": 0.86, "n": 412 }],
  "measure_agreement": [{ "measure": "pct_complex_reflections", "metric": "icc", "scorer_vs_human": 0.7, "human_vs_human": 0.78, "n": 20 }],
  "discriminant": { "description": "Scorer separates high- vs low-quality MI", "high_mi_mean": 4.1, "low_mi_mean": 2.3, "p_value": 0.001 },
  "repeat_run": { "n_runs": 3, "agreement": 0.93 },
  "contamination_check": { "status": "not_run", "notes": "…" }
}
```

`human_vs_human` is the ceiling: how well two expert coders agree with each other. `split` is `dev` or `heldout`. `contamination_check.status` is `not_run`, `pass` or `concern`.

## thresholds.json

`shared/config/thresholds.json` holds `_status` plus one `{ op, value, source }` entry per measure or flag. The sponsor sets these (expected Week 3); until then everything is a placeholder. **Never change a threshold to improve agreement.** The console displays thresholds and never edits them.

## Placeholder rules used in the mock data

The mock fixtures were built with these rules. They're our best guess, not the sponsor's. Backend should confirm or replace each one, then update this list.

| Rule                     | Placeholder used                                                                                       | Confirm with |
| ------------------------ | ------------------------------------------------------------------------------------------------------ | ------------ |
| Exclusions               | Pre-session greeting and tech-check turns are excluded with reason "pre-session small talk (placeholder exclusion rule)" | Sponsor |
| Reflection run           | Consecutive non-excluded practitioner turns that contain a reflection (SR/CR) and no question (Q). A turn with a reflection and a question ends the run. | Sponsor |
| Windowed R:Q             | Window = 10 consecutive turn numbers ending at `end_turn`, one point per turn from turn 10 on, counting codes on non-excluded practitioner turns only | Sponsor |
| Insufficient data        | `pct_complex_reflections` needs SR + CR ≥ 3. `reflection_to_question` needs Q ≥ 1 and SR + CR + Q ≥ 5. | Backend + sponsor |
| Equal to threshold       | `>=` and `<=` include the threshold value (MOCK-AVEN-003's Technical = 4.0 passes)                     | Sponsor |
| R:Q vs. the cap          | The 2:1 R:Q target and the two-reflection cap pull against each other; a turn with both a reflection and a question satisfies both | Sponsor |

## Not defined yet

- **Scorer → pipeline hand-off.** The format of Stage 1 output (codes, client tags, globals) before Stage 2 runs. For now, aim for the `codes`, `client_talk` and `globals` fields above.
- **Human coder annotations** for validation (Joel).
- **API endpoints.** When we add a Python API, the console expects these (see `frontend/src/lib/data.ts`):
  `GET /sessions` → `ScoredSession[]`, `GET /sessions/{id}` → `ScoredSession`, `GET /issues` → `Issue[]`, `GET /validation-report` → `ValidationReport`, `GET /thresholds` → thresholds.json.

## Checking a file against the schemas

Any JSON Schema 2020-12 validator works. For example, with Python:

```bash
pip install jsonschema
python - <<'EOF'
import json, pathlib
from jsonschema import Draft202012Validator
from referencing import Registry, Resource
schemas = {p.name: json.loads(p.read_text()) for p in pathlib.Path("shared/schema").glob("*.json")}
registry = Registry().with_resources([(n, Resource.from_contents(s)) for n, s in schemas.items()])
v = Draft202012Validator(schemas["scored_session.schema.json"], registry=registry)
for p in pathlib.Path("shared/sample_data/scored").glob("*.json"):
    errors = list(v.iter_errors(json.loads(p.read_text())))
    print("OK " if not errors else "ERR", p, *[f"\n    {list(e.path)}: {e.message}" for e in errors[:5]])
EOF
```

Or open the file with the console's **Open results file** button: it names the first bad fields.
