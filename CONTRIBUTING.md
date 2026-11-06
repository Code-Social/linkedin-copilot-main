# Contributing

Thanks for your interest in LinkedIn Copilot! Bug reports, ideas, and pull requests are all welcome.

## Getting set up

Requires **Node 22.13+** (see `.nvmrc`).

```bash
npm install
npm run dev
```

The app runs at http://localhost:3000 and stores data in `./data/copilot.db`. No accounts or API keys are needed.

To test against Postgres instead, copy `.env.example` to `.env.local` and set `DATABASE_URL`.

## Before you open a pull request

1. Open an issue first for anything larger than a small fix, so we can agree on the approach.
2. Keep changes focused: one feature or fix per PR.
3. Make sure these pass:

   ```bash
   npm run typecheck
   npm run lint
   npm run build
   ```

4. Match the existing style: TypeScript, Tailwind for styling, Zod schemas in `src/lib/schemas.ts` for request validation, and parameterized queries (`?` placeholders) in `src/lib/store.ts`.
5. Any SQL you add must work on **both** SQLite and Postgres.
6. If you change behavior, update the README.

## Project principles

- **No AI, no API keys, no accounts.** Features should work entirely offline on a local database.
- **Your data stays yours.** No telemetry, no third-party calls from the app.

## Reporting bugs

Use the bug report template and include steps to reproduce, what you expected, and what happened. Mention your Node version and whether you're on SQLite or Postgres.

For security issues, follow [SECURITY.md](SECURITY.md) instead of opening a public issue.

## Code of Conduct

By taking part you agree to follow our [Code of Conduct](CODE_OF_CONDUCT.md).
