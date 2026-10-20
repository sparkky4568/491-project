# AVEN Scorer

The Center for Care Optimization runs **Aven**, a voice-based health coach that uses Motivational Interviewing (MI). Today a physician reads Aven transcripts one at a time to check MI quality. The **AVEN Scorer** is a batch pipeline that scores coaching transcripts against **MITI 4.2.1**, the standard MI fidelity coding system. In Stage 1, an LLM codes every practitioner turn with a MITI behavior code and a verbatim supporting quote, and tags each client turn as change, sustain or neutral talk. In Stage 2, plain code (not the LLM) applies the sponsor's exclusion rules and computes the summary measures. A separate LLM pass gives the four global ratings, each citing the turns behind it. Every problem the scorer finds goes into an issue log with evidence, and the scorer is validated against expert human coders. The **review console** in `frontend/` reads the pipeline's JSON output so anyone can see what code each turn got and why.

> **Status: prototype on mock data.** Every conversation in this repo is invented. There's no real member data or PHI, and there never will be.

## Team and folders

The repo is a monorepo with one folder per owner, so we don't fight over merges.

| Folder        | Owner                         | What lives there                                                                 |
| ------------- | ----------------------------- | -------------------------------------------------------------------------------- |
| `frontend/`   | Frontend/UX: _add your name_  | Review console (React + TypeScript + Vite)                                        |
| `pipeline/`   | Ricardo (Backend)             | Ingest, exclusions, metrics, flags, issue log                                     |
| `scorer/`     | Ethan, onlyEthos (AI)         | LLM prompts, turn coder, global ratings pass, prohibited-behavior check           |
| `validation/` | Joel, reek (Validation/QA)    | Dev/held-out split, agreement harness, reports, QA                                |
| `shared/`     | AI + Backend (contract)       | JSON Schemas, `config/thresholds.json`, sample data (the single source of truth)  |
| `docs/`       | Everyone                      | Data contract, team plan, prompt files                                            |
| `data/`       | Nobody commits here           | Raw datasets, local only, gitignored                                              |

Project manager: Suyash (JSX).

```
aven-scorer/
├── README.md, CONTRIBUTING.md, .gitignore, .env.example
├── vercel.json                hosting config for the review console
├── docs/
│   ├── DATA_CONTRACT.md       JSON shapes, written for humans
│   ├── TEAM_PLAN.md           team plan
│   └── prompts/               scorer prompt files, versioned
├── shared/
│   ├── schema/                JSON Schema per shape
│   ├── config/thresholds.json sponsor thresholds (placeholders for now)
│   └── sample_data/           mock transcripts, scored sessions, validation report
├── frontend/                  review console
├── pipeline/                  backend
├── scorer/                    AI
├── validation/                validation/QA
└── data/                      gitignored, never committed
```

## Run the review console

You need Node.js 20.19 or newer (22 LTS is a good choice).

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

Other commands, all run from `frontend/`:

| Command          | What it does                                    |
| ---------------- | ----------------------------------------------- |
| `npm run build`  | Type-check and build to `frontend/dist/`        |
| `npm run preview`| Serve the production build locally              |
| `npm run format` | Format the code with Prettier                   |

The site uses plain English throughout; the official MITI terms appear only where you ask for them (click a tag, or "What is this?"). It has four sections:

- **Conversations** (`/`): one card per conversation, with a one-line verdict ("2 problems found").
- **A conversation** (`/sessions/:id`) has three tabs:
  - **Overview:** the verdict, each problem with a "Show me" link, the key scores against their goals, and the overall ratings.
  - **Conversation:** the transcript as a chat. Each message carries tags like "Reflects meaning" or "Pushes advice". Click a tag to highlight the exact words and see why it was given.
  - **Details:** counts, flow checks, the R:Q chart and exactly how the conversation was scored (model, prompts, run, cost).
- **Problems** (`/issues`): every problem across conversations, with a type filter and a spreadsheet (CSV) download that has every field.
- **Accuracy** (`/validation`): "not checked yet", plus a preview of the validation report layout.
- **How it works** (`/about`): the pipeline in six steps, the ground rules, a glossary of every tag, and the current goals.

Plain-English names and explanations for every code, measure and rating live in one file, `frontend/src/lib/miti.ts`.

## Look at real pipeline output

There are two ways, and neither needs code changes:

1. **Load a file (works today).** On the Conversations page, click **Open results file** and pick a `ScoredSession` JSON file, or an array of them. The console validates the file against the data contract. If something is wrong, it names the bad field (for example `turns[2].codes[0].code (turn 3): Invalid option…`). Valid sessions join the list for this browser tab only. Nothing is uploaded, and reloading the page clears them. Only load de-identified output.
2. **Point it at an API (later).** Copy `.env.example` to `.env` at the repo root, set `VITE_API_URL=http://localhost:8000` (or wherever the Python API runs), and restart `npm run dev`. All data goes through one module, `frontend/src/lib/data.ts`. Its header lists the endpoints the console expects.

## Deploy on Vercel

The hosting setup is already in the repo. It builds the console, sends every page URL to the app so deep links and refreshes work, and adds security headers that keep the site out of search engines.

1. On [vercel.com](https://vercel.com), choose **Add New → Project** and import this GitHub repo.
2. Set **Root Directory** to `frontend`. The framework preset (Vite), commands and output folder come from `frontend/vercel.json`, so leave the build settings alone.
3. Click **Deploy**. You get a production URL, and every other branch you push gets its own preview URL, which is handy for reviewing pull requests.
4. Under **Settings → Git**, make sure the production branch is `main`.

The console reads `shared/`, which sits outside `frontend/`. Vercel allows this by default ("Include files outside the root directory in the Build Step", under **Settings → Build and Deployment → Root Directory**). If that option is off, the build stops with a message saying so.

A Root Directory of `./` (the repo root) also works, using the root `vercel.json`. The two `vercel.json` files carry the same `rewrites` and `headers`, so if you change one, change the other.

Things to know:

- **Anyone with the link can open it**, unless you turn on protection under **Settings → Deployment Protection**. The site only ever shows invented mock data; never deploy real output. "Open results file" still runs entirely in the viewer's browser, and nothing is uploaded to Vercel.
- **API later.** When the Python API exists, add `VITE_API_URL` under **Settings → Environment Variables** and redeploy. The security policy only allows `https://` API URLs.
- **From the command line instead:** run `npx vercel` from the repo root for a preview, or `npx vercel --prod` for production. The CLI uses the project's Root Directory setting.

## The rules (from our signed scope)

1. **No real member data or PHI, ever.** We invent all mock conversations. Don't copy text from AnnoMI, CASAA or any real transcript.
2. **Mock data looks like mock data.** Every mock file has `"is_mock": true`, and the console shows a "MOCK DATA — not real scores" banner whenever mock data is on screen.
3. **Provenance on everything.** Every session, score and issue shows its provenance (`real`, `simulated`, `reference_corpus` or `internal_test`), the scorer prompt version and the model id.
4. **Thresholds belong to the sponsor.** They live in `shared/config/thresholds.json`, they're display-only in the console, and they stay labeled as placeholders until the sponsor confirms them. Never change one to improve agreement.
5. **Global ratings are advisory** until the scorer is validated.
6. **The LLM never does the math.** Counts and measures come from pipeline code. The console displays them (and shows each formula) but never recomputes them.

## Sample data

`shared/sample_data/` holds four invented sessions, each as an unscored transcript (`transcripts/`) and a scored result (`scored/`), plus a mock validation report. The numbers are internally consistent (counts match codes, measures match counts, issues match measures and flags), so the pipeline and validation folders can use them as test fixtures. See [`shared/sample_data/README.md`](shared/sample_data/README.md) for what each one covers.

## Docs

- [`docs/DATA_CONTRACT.md`](docs/DATA_CONTRACT.md): the JSON shapes, field by field, and the placeholder rules used in the mock data
- [`docs/TEAM_PLAN.md`](docs/TEAM_PLAN.md): team plan and timeline
- [`docs/prompts/`](docs/prompts/): scorer prompt files
- [`CONTRIBUTING.md`](CONTRIBUTING.md): branches, pull requests and what never gets committed
