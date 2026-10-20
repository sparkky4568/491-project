# pipeline/

**Owner: Ricardo (Backend).**

Ingest, exclusions, metrics, flags and the issue log. This is Stage 2 of the scorer: plain code, no LLM.

**Reads**
- `TranscriptIn` files (see [`docs/DATA_CONTRACT.md`](../docs/DATA_CONTRACT.md#transcriptin))
- Stage 1 output from `scorer/`: per-turn codes with evidence quotes, client talk tags and global ratings (the hand-off format is still to be defined; see "Not defined yet" in the data contract)
- `shared/config/thresholds.json` (read-only; the sponsor sets these)

**Writes**
- `ScoredSession` JSON, one per session (see [`docs/DATA_CONTRACT.md`](../docs/DATA_CONTRACT.md#scoredsession)), into `output/` (gitignored). The review console reads these.

**Responsibilities**
- Check each evidence quote verbatim against the turn text and set `evidence_valid`.
- Apply the sponsor's exclusion rules, then compute `counts`, `client_talk_counts`, `measures` (each with its `n`), Table C `flags` and `issues`.
- Never ask the LLM to count or compute.

**Test fixtures:** `shared/sample_data/transcripts/` are inputs, and `shared/sample_data/scored/` are the matching expected outputs. The placeholder rules they were built with are listed in the data contract, under "Placeholder rules used in the mock data".

Python setup coming from the owner.
