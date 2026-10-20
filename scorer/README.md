# scorer/

**Owner: Ethan, onlyEthos (AI).**

The LLM side of the scorer: prompts, the turn coder, the global ratings pass and the prohibited-behavior (Table D) check.

**Reads**
- `TranscriptIn` files (see [`docs/DATA_CONTRACT.md`](../docs/DATA_CONTRACT.md#transcriptin))
- Prompt files in [`docs/prompts/`](../docs/prompts/)

**Writes** (handed to `pipeline/`)
- Stage 1: for every practitioner turn, zero or more MITI 4.2.1 codes, each with a verbatim `evidence_quote` and a one-sentence `rationale`; for every client turn, `change`, `sustain` or `neutral` plus a quote
- The four global ratings (1–5), each with `cited_turns` and a rationale
- Table D candidates with the verbatim words
- The pinned `model` id, prompt versions and `cost_usd` for each session

The target shapes are the `codes`, `client_talk` and `globals` fields in [`docs/DATA_CONTRACT.md`](../docs/DATA_CONTRACT.md#scoredsession). The exact hand-off format to `pipeline/` is still to be defined.

The LLM never does the math: no counts, ratios or pass/fail decisions.

Python setup coming from the owner.
