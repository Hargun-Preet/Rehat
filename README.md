# Rehat (concept prototype)

Weather downtime cover for small Singapore firms with outdoor crews, sold next to Work Injury Compensation.
Concept prototype for Income Insurance, Singapore-India Hackathon 2026. Not an Income product. Fictional data.

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
The web app runs offline from `web/public/data`. Copy `.env.example` to `.env` for optional API keys.
