# AGENTS.md: rules for every coding session on Rehat

Codex reads this file automatically. Follow it in every session.

## Start of every session
1. Read `CONTEXT.md` in full before writing any code. It holds the product spec, numbers, legal constraints, data sources, decisions and the worklog.
2. Read the last three worklog entries in `CONTEXT.md` section 15 to see what was done and what is broken.
3. Restate in two or three lines what this session will change and which files it touches.

## End of every session (mandatory)
1. Append a worklog entry to `CONTEXT.md` section 15 using the template there: what was done, files changed, numbers produced with their source, decisions, anything broken or unverified, and the next step.
2. Tick or update the checklist in `CONTEXT.md` section 13.
3. If you changed a number, rule or decision that appears elsewhere in `CONTEXT.md`, update it there too. Never leave two versions of the same number.
4. Run the tests (`make test`) and say in the worklog whether they pass.

## Product rules that code must never break
- The payout is deterministic arithmetic on NEA/MSS readings, plan terms and WIC headcount. No model output may change a payout amount, except a Site Match top-up approved inside the published band.
- AI never rejects a claim on its own. Anything outside the band goes to a human review queue with the reason.
- Missing or partial data is `PENDING`, never `NOT_TRIGGERED`.
- Forecasts plan Income's cash and reinsurance only. They never change a customer's payout or price.
- Price depends only on plan, benefit and headcount. Never use nationality, age, health, gender or any worker personal data in pricing or eligibility.
- Collect only the fields listed in `CONTEXT.md` section 7 (PDPA row). No worker NRIC, names or phone numbers by default.
- Show the may-not-pay sentence verbatim before purchase, and record the teach-back answer.
- Show premiums before and after 9% GST.
- Every page footer: "Concept prototype for Income Insurance, Singapore-India Hackathon 2026. Not an Income product. Fictional data." Do not use Income's logo image. All firms and people are fictional.
- Every number shown in the UI that is an assumption carries an "assumption" tag with a tooltip giving the basis.

## Engineering conventions
- Monorepo: `/engine` (Python, FastAPI), `/web` (Next.js App Router, TypeScript, Tailwind, shadcn/ui, Aceternity UI, 21st.dev components, Recharts), `/data/raw`, `/data/processed`, `/data/seed`, `/docs`.
- Cache every external API response to `/data/raw` with the request URL and timestamp. Never hit an API twice for the same request.
- The web app must run fully offline from precomputed JSON in `/web/public/data` (the demo cannot depend on venue Wi-Fi). Live mode is a toggle.
- Python: type hints, pure functions for rules, `pytest` tests for every trigger tier, allowance, cap, fallback step and exclusion.
- TypeScript: strict mode; shared types generated from the FastAPI OpenAPI schema where possible.
- Install Aceternity components with `npx shadcn@latest add @aceternity/<name>` after adding the registry to `components.json`, and 21st.dev components with the install command shown on each component page. Restyle every component to the tokens in `web/src/styles/tokens.css`; never ship default demo colours.
- Keep secrets in `.env` (never commit). Optional keys: `DATA_GOV_SG_API_KEY`, `OPENAI_API_KEY`.
- Small commits with clear messages.

## Writing style for any UI copy or docs
Plain, direct English. Short sentences. No em dashes. No hype words (seamless, revolutionary, unlock, leverage). Sentence case for headings and buttons.
