# AVEN Scorer

The Center for Care Optimization runs **Aven**, a voice-based health coach that uses Motivational Interviewing (MI). Today a physician reads Aven transcripts one at a time to check MI quality. The **AVEN Scorer** is a batch pipeline that scores coaching transcripts against **MITI 4.2.1**, the standard MI fidelity coding system. In Stage 1, an LLM codes every practitioner turn with a MITI behavior code and a verbatim supporting quote, and tags each client turn as change, sustain or neutral talk. In Stage 2, plain code (not the LLM) applies the sponsor's exclusion rules and computes the summary measures. A separate LLM pass gives the four global ratings, each citing the turns behind it. Every problem the scorer finds goes into an issue log with evidence, and the scorer is validated against expert human coders. The **scorer page** in `frontend/` is the front door: paste a conversation, click **Score it**, and see the verdict, the scores, any problems, and what the coach did in each message.

> **Status: prototype on mock data.** Every conversation in this repo is invented. There's no real member data or PHI, and there never will be.

## Team and folders

The repo is a monorepo with one folder per owner, so we don't fight over merges.

| Folder        | Owner                         | What lives there                                                                 |
| ------------- | ----------------------------- | -------------------------------------------------------------------------------- |
| `frontend/`   | Frontend/UX: _add your name_  | Scorer page (React + TypeScript + Vite)                                           |
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
├── vercel.json                hosting config for the scorer page
├── docs/
│   ├── DATA_CONTRACT.md       JSON shapes, written for humans
│   ├── TEAM_PLAN.md           team plan
│   └── prompts/               scorer prompt files, versioned
├── shared/
│   ├── schema/                JSON Schema per shape
│   ├── config/thresholds.json sponsor thresholds (placeholders for now)
│   └── sample_data/           mock transcripts, scored sessions, validation report
├── frontend/                  scorer page
├── pipeline/                  backend
├── scorer/                    AI
├── validation/                validation/QA
└── data/                      gitignored, never committed
```

## Run the scorer page

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

It's one page:

1. Paste a conversation into the box, one message per line, each starting with `Coach:` or `Person:`. Or click one of the **Try an example** buttons.
2. Click **Score it**.
3. The results appear below:
   - the verdict ("2 problems found");
   - each problem, with a **Show me** link to the exact message;
   - six scores, each against its goal;
   - the conversation as a chat, with every coach message tagged in plain English ("Reflects meaning", "Pushes advice"). Click a tag to highlight the exact words and see why.

   **More detail** (collapsed) holds the overall ratings, the counts, and exactly how it was scored.

**Right now the scores are practice scores.** Until the real scorer exists, `frontend/src/lib/demoScorer.ts` tags messages with simple keyword rules and computes the scores with the placeholder rules in the data contract. The page labels these as practice scores, and nothing pasted leaves the browser.

Plain-English names and explanations for every code, measure and rating live in one file, `frontend/src/lib/miti.ts`.

## Connect the real scorer

When the Python scorer (pipeline + scorer folders) can run as a web service, point the page at it. No code changes are needed:

- Set `VITE_API_URL` in a root `.env` file (copy `.env.example`), or under **Settings → Environment Variables** on Vercel, then restart `npm run dev` or redeploy.
- The **Score it** button then sends `POST {VITE_API_URL}/score` with the conversation as a `TranscriptIn` and expects a `ScoredSession` back. The shapes are in `docs/DATA_CONTRACT.md`, and `frontend/src/lib/data.ts` is the only file that talks to the scorer.
- Before the service exists, you can paste scorer output directly: paste a `ScoredSession` JSON into the box and it's shown as-is. Paste a `TranscriptIn` JSON and it gets scored.

## Deploy on Vercel

The hosting setup is already in the repo. It builds the page, sends every URL to the app, and adds security headers that keep the site out of search engines.

1. On [vercel.com](https://vercel.com), choose **Add New → Project** and import this GitHub repo.
2. Set **Root Directory** to `frontend`. The framework preset (Vite), commands and output folder come from `frontend/vercel.json`, so leave the build settings alone.
3. Click **Deploy**. You get a production URL, and every other branch you push gets its own preview URL, which is handy for reviewing pull requests.
4. Under **Settings → Git**, make sure the production branch is `main`.

The page reads `shared/` (thresholds and the example conversations), which sits outside `frontend/`. Vercel allows this by default ("Include files outside the root directory in the Build Step", under **Settings → Build and Deployment → Root Directory**). If that option is off, the build stops with a message saying so.

A Root Directory of `./` (the repo root) also works, using the root `vercel.json`. The two `vercel.json` files carry the same `rewrites` and `headers`, so if you change one, change the other.

Things to know:

- **Anyone with the link can open it**, unless you turn on protection under **Settings → Deployment Protection**. In practice mode, whatever is pasted stays in the viewer's browser; nothing is sent to Vercel. Still, don't paste real member data.
- **Real scorer later.** Add `VITE_API_URL` under **Settings → Environment Variables** and redeploy. The security policy only allows `https://` scorer URLs.
- **From the command line instead:** run `npx vercel` from the repo root for a preview, or `npx vercel --prod` for production. The CLI uses the project's Root Directory setting.

## The rules (from our signed scope)

1. **No real member data or PHI, ever.** We invent all mock conversations. Don't copy text from AnnoMI, CASAA or any real transcript.
2. **Mock data looks like mock data.** Every mock file has `"is_mock": true`, and the page shows a "Practice score" bar whenever practice or mock scores are on screen.
3. **Provenance on everything.** Every scored result records its provenance (`real`, `simulated`, `reference_corpus` or `internal_test`), the scorer prompt version and the model id, shown under **More detail**.
4. **Thresholds belong to the sponsor.** They live in `shared/config/thresholds.json`, they're display-only on the page, and they stay labeled as placeholders until the sponsor confirms them. Never change one to improve agreement.
5. **Global ratings are advisory** until the scorer is validated.
6. **The LLM never does the math.** Counts and measures come from plain code (the pipeline, or for now the practice scorer), never from the LLM. The page shows each formula under **What is this?**

## Sample data

`shared/sample_data/` holds four invented sessions, each as an unscored transcript (`transcripts/`, also used for the page's **Try an example** buttons) and a hand-scored result (`scored/`), plus a mock validation report. The numbers are internally consistent (counts match codes, measures match counts, issues match measures and flags), so the pipeline and validation folders can use them as test fixtures. See [`shared/sample_data/README.md`](shared/sample_data/README.md) for what each one covers.

## Docs

- [`docs/DATA_CONTRACT.md`](docs/DATA_CONTRACT.md): the JSON shapes, field by field, and the placeholder rules used in the mock data
- [`docs/TEAM_PLAN.md`](docs/TEAM_PLAN.md): team plan and timeline
- [`docs/prompts/`](docs/prompts/): scorer prompt files
- [`CONTRIBUTING.md`](CONTRIBUTING.md): branches, pull requests and what never gets committed
