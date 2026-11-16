# Rehat

Weather downtime cover for Singapore employers with outdoor crews, designed to sit alongside Work Injury Compensation.

Read `AGENTS.md`, `CONTEXT.md`, `PLAN.md` and `PROMPTS.md` first.

## Layout
- `engine/`: Python 3.11+ package `rehat` (rules, ledger, back-test, pricing, liquidity, AI checks) and a FastAPI service.
- `web/`: Next.js App Router app (TypeScript, Tailwind, shadcn/ui, Recharts, Leaflet).
- `data/raw` (cached API pulls, not committed), `data/processed`, `data/seed` (committed demo data).
- `docs/`: data sources, validation reports, model cards, judge pack.

## Run
```bash
make setup     # create engine venv and install web packages
make engine    # FastAPI on http://localhost:8000 (GET /health)
make web       # Next.js on http://localhost:3000
make test      # engine tests
make export    # engine writes JSON to web/public/data
```
The web app runs offline from `web/public/data`. Start `make engine` as well to show the current NEA heat reading on Employer home and the live station map. If the engine or source is unavailable, those views label their offline data or pending state clearly. Copy `.env.example` to `.env` for optional API keys.
