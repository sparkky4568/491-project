# Scorer prompts

This folder holds the scorer's prompt files, owned by AI (Ethan). Teammates' prompt files get added here.

- **One file per version**, named after the version string the scorer writes into its output, for example `coder-v0.1.md` and `globals-v0.1.md`. The string must match `scorer.coder_prompt_version` or `scorer.globals_prompt_version` in each scored session, so every score can be traced to the exact prompt.
- **Don't edit a prompt that has already scored data.** Copy it to a new version instead.
- **Few-shot examples must be invented.** No real member data or PHI, and no text copied from AnnoMI, CASAA or any real transcript.
- Output shapes are in [`../DATA_CONTRACT.md`](../DATA_CONTRACT.md). The LLM produces codes, quotes, rationales and ratings; it never computes counts or measures.
