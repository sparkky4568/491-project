# validation/

**Owner: Joel, reek (Validation/QA).**

Checks the scorer against expert human coders: the dev/held-out split, the agreement harness, reports and QA.

**Reads**
- `ScoredSession` output from `pipeline/` (see [`docs/DATA_CONTRACT.md`](../docs/DATA_CONTRACT.md#scoredsession))
- Human coder annotations. These are kept in `data/` locally and never committed; their format is still to be defined.

**Writes**
- A `ValidationReport` JSON (see [`docs/DATA_CONTRACT.md`](../docs/DATA_CONTRACT.md#validationreport)). The shape is v0 and yours to change; `shared/sample_data/validation_report.mock.json` is an example.

**Planned checks:** per-code agreement (for example Cohen's kappa) and per-measure agreement (for example ICC), each next to the human-vs-human ceiling; a discriminant test (high- vs. low-quality MI); repeat-run reliability; and a contamination check on reference-corpus data.

The held-out split stays untouched until the final run, and thresholds are never tuned to improve agreement.

Python setup coming from the owner.
