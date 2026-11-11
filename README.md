# LinkedIn Copilot

A workspace for planning, drafting, and scheduling LinkedIn posts. Capture ideas, write drafts, plan them on a calendar, and see how you write, measured from your own past posts.

No AI, no API keys, no accounts. Your data stays in your own database.

## What's inside

| Page | What it does |
| --- | --- |
| **Dashboard** | What's ready or scheduled, what you're working on, your open ideas, and a snapshot of your writing stats. |
| **Ideas** 💡 | Idea bank with status, category, priority, hook, tags, links, notes, and a planned date. Turn any idea into a draft in one click. |
| **Drafts** | Searchable draft list with status and category filtering. Editor includes a live LinkedIn feed preview with the 210-character `...see more` fold, offline Unicode formatting toolbar (bold, italic, bullets, hooks), reading time, 3,000 character counter, and repeat post warning. |
| **Calendar** | Month view of ideas, drafts, ready and published posts. Drag to schedule. Shows posting themes for the month and nudges you when one topic dominates. |
| **My Voice** | Measured from your writing samples: words per post and per sentence, paragraph length, emoji, em dash and hashtag use, how often you end with a question, your most used words and openings. Compares your ❤️ posts with the rest. |
| **Writing Samples** | Add past posts one at a time or paste many at once. Rate each one ❤️ exactly like me / 👍 like / 👎 not me. |

Press **`i`** anywhere to capture a quick idea.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS
- Postgres (Neon / Netlify DB) on serverless hosts, or a local SQLite file via Node's built-in `node:sqlite`

## Run it locally

Requires **Node 22.13+**.

```bash
npm install
npm run dev
```

Open http://localhost:3000. Data is saved to `./data/copilot.db`; no setup needed.

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | on serverless hosts | Postgres connection string (Neon or Netlify DB). When set, it's used instead of SQLite. `NETLIFY_DATABASE_URL` is picked up automatically. |
| `DATABASE_PATH` | no | SQLite file location when no `DATABASE_URL` is set. Defaults to `./data/copilot.db` |

## Deploying

**Netlify (or Vercel):** serverless functions can't keep a local file, so use Postgres.

1. Add a database. On Netlify, enable **Netlify DB** (it sets `NETLIFY_DATABASE_URL` for you). Anywhere else, create a free [Neon](https://neon.tech) database and set `DATABASE_URL`.
2. Deploy. Tables are created automatically on first request.

**A server with a disk (Railway, Render, Fly.io, a VPS):** no database setup needed. Point `DATABASE_PATH` at a persistent volume.

> There is no login. Anyone who can reach your deployment can read and edit its data. Keep the URL private or put it behind your host's access controls.

## Project layout

```
src/
  app/
    (workspace)/      pages: dashboard, ideas, drafts, calendar, voice, samples
    api/              route handlers (samples, ideas, drafts)
  components/         client UI
  lib/
    memory.ts         repeat detection + writing stats
    store.ts          data access
    db.ts             Postgres / SQLite drivers + schema
```

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) to get started, and please follow the [Code of Conduct](CODE_OF_CONDUCT.md). To report a security issue, see [SECURITY.md](SECURITY.md).

## License

MIT. See [LICENSE](LICENSE).

## Disclaimer

This is an independent project. It is not affiliated with, endorsed by, or sponsored by LinkedIn Corporation. "LinkedIn" is a trademark of LinkedIn Corporation. The app does not connect to LinkedIn or use its API.
