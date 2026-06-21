# Contributing to Soroban License

## Development Setup

1. Fork and clone the repo
2. Copy env files: `cp .env.example .env`
3. Start local infra: `docker-compose up -d postgres redis`
4. Install deps in each workspace: `backend/`, `frontend/`, `sdk/`, `indexer/`
5. Run migrations: `cd backend && npm run migrate`

## Project Structure

```
contracts/   Soroban smart contracts (Rust)
backend/     Node.js REST API
frontend/    Next.js developer dashboard
sdk/         TypeScript client SDK
indexer/     Event indexer / state sync
docs/        Documentation
```

## Coding Standards

- TypeScript strict mode — no `any`
- All API inputs validated with Zod
- Parameterized queries — no raw SQL string interpolation
- Secrets never logged or returned in responses
- Tests required for new API routes and contract functions

## Pull Requests

- Branch from `main`, name branches `feat/`, `fix/`, `chore/`
- Keep PRs focused — one concern per PR
- Include a brief description and test evidence

## Contract Changes

Run `cargo test` before opening a PR that touches Rust code.
Deploy to testnet and include the contract ID in the PR description.

## License

Apache 2.0
