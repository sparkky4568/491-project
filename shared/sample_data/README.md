# Sample data (mock, invented)

All four conversations are **invented** for demo and testing. No text comes from AnnoMI, CASAA or any real transcript. Every file has `"is_mock": true`, and every model id is `mock-model-v0`.

Each session exists twice, with the same file name:

- `transcripts/` holds the unscored **TranscriptIn**, the pipeline's input.
- `scored/` holds the **ScoredSession**, the pipeline's expected output, hand-scored.

The numbers are internally consistent: `counts` match the codes on non-excluded turns, `measures` match `counts` and `globals`, and `issues` match the measures and flags. That makes these files usable as test fixtures. The rules they follow are under "Placeholder rules used in the mock data" in `docs/DATA_CONTRACT.md`.

| Session         | Provenance / source             | Turns | What it tests                                                                                                     | Issues |
| --------------- | ------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------- | ------ |
| `MOCK-REF-001`  | reference_corpus / AnnoMI-style | 22    | Strong MI: complex reflections, open questions, an affirmation, autonomy support. Passes everything. No nodes and no Aven version. | 0 |
| `MOCK-REF-002`  | reference_corpus / CASAA-style  | 20    | Weak MI: stacked closed questions, unsolicited advice (3× PERSUADE), one CONFRONT, few reflections. Fails every thresholded measure, plus one Table D entry ("gave medication advice"). | 6 (ISS-0001–0006) |
| `MOCK-AVEN-003` | simulated / aven, V17           | 24    | Mostly good Aven call with a node on every turn. A run of three reflections at turns 7, 9 and 11 (Table C), and Aven states the caller's confidence number instead of asking for it (Table D). Technical = 4.0 sits exactly on its threshold. | 2 (ISS-0007, ISS-0008) |
| `MOCK-TEST-004` | internal_test / other           | 14    | Turns 1–4 are excluded (greeting and tech check) but keep their codes. Two measures are `insufficient_data`. Turn 11's CR has a deliberately non-verbatim quote (`evidence_valid: false`). | 0 |

`validation_report.mock.json` holds made-up agreement numbers so the Validation page has something to show. **Validation has not been run.**
