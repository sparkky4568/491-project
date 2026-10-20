# Contributing

## Branches and pull requests

1. **Nobody commits straight to `main`.**
2. Work on a branch named `name/short-description`, for example `ricardo/parser`, `ethan/coder-prompt-v0.2` or `joel/kappa-harness`.
3. Open a pull request into `main` when it's ready (or as a draft, to get early eyes on it).
4. **One teammate looks at it before it merges.** If it touches someone else's folder, ask that owner.
5. Keep pull requests small and about one thing. They're easier to review and less likely to conflict.

```bash
git checkout main && git pull
git checkout -b yourname/short-description
# ...work, commit...
git push -u origin yourname/short-description
# then open a pull request on GitHub
```

A repo admin should turn on branch protection for `main` (Settings → Branches → require a pull request with one approval) so this is enforced, not just agreed.

## Never commit

- `.env`, API keys, tokens or passwords. Copy `.env.example` to `.env` locally; `.env` is gitignored.
- Datasets, or anything from `data/`. Raw data lives on your machine only.
- Real member data or PHI, anywhere: not in code, prompts, tests, screenshots, issues or pull request descriptions.
- Text copied from AnnoMI, CASAA or any real transcript into sample data or prompt examples. Write your own.
- Pipeline output from real runs (`output/` is gitignored).

If you commit a secret by accident, tell the team right away and rotate the key. Deleting the file in a later commit doesn't remove it from history.

## Changing the data contract

The contract is `docs/DATA_CONTRACT.md` plus `shared/schema/`. AI and Backend own it. If you change a field, in the **same pull request**:

1. Bump `schema_version`.
2. Update the JSON Schema in `shared/schema/`.
3. Update the sample data in `shared/sample_data/` so it still validates and stays internally consistent.
4. Update `docs/DATA_CONTRACT.md`.
5. Tell Frontend, so `frontend/src/lib/schema.ts` can follow.

## Before you open a pull request

- **Frontend:** `cd frontend && npm run build` passes, and you've run `npm run format`.
- **Sample data:** files still validate against `shared/schema/` (see the snippet at the end of `docs/DATA_CONTRACT.md`).
- **Thresholds:** only change `shared/config/thresholds.json` when the sponsor gives new values, and say so in the pull request.
- **No PHI or secrets** in the diff.
