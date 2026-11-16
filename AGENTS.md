# AGENTS.md: rules for every coding session on Rehat (version 2)

Codex reads this file automatically. Follow it in every session.

The repo is already built. Your job now is to refine it: make it correct against CONTEXT.md version 2, make it one cohesive product, and make it easy to use. Prefer changing existing code to adding new code. Do not rewrite a working module to restyle it.

## Start of every session
1. Read `CONTEXT.md` in full before writing any code. It holds the product spec, numbers, legal constraints, data sources, decisions and the worklog. If you knew version 1, read section 16 first.
2. Read the last three worklog entries in `CONTEXT.md` section 15 to see what was done and what is broken.
3. Read `data/seed/product.json`. It is the machine-readable copy of the spec.
4. Look at the code you are about to change before changing it. Say what already exists.
5. Restate in two or three lines what this session will change and which files it touches.

## End of every session (mandatory)
1. Append a worklog entry to `CONTEXT.md` section 15 using the template there: what was done, files changed, numbers produced with their source, decisions, anything broken or unverified, and the next step.
2. Tick or update the checklist in `CONTEXT.md` section 13.
3. If you changed a number, rule or decision, change it in `CONTEXT.md` and in `data/seed/product.json` in the same commit. Never leave two versions of the same number.
4. Run `make test` and `make check-numbers` and say in the worklog whether they pass.
5. If the session touched the web app, run `make export` and confirm the changed screens work with the engine stopped.

## Product rules that code must never break
- The payout is deterministic arithmetic on NEA/MSS readings, plan terms, work class and WIC headcount. No model output may change a payout amount. The only exception is a Site Match top-up approved inside the published band, and Site Match is a pilot rider under Labs.
- AI never rejects a claim on its own. Anything outside a band goes to a human review queue with the reason.
- Missing or partial data is `PENDING`, never `NOT_TRIGGERED`, and never shown as zero.
- Forecasts plan Income's cash and reinsurance and warn firms. They never change a customer's payout or price.
- Price depends only on plan and declared outdoor headcount. The S$8 benefit is fixed on every plan. Never use work class, nationality, age, health, gender or any worker personal data in pricing.
- Three plans: Essential, Standard, Plus. They differ only by deductible (allowance multiple 1.5, 1.25, 1.0). The benefit is S$8 on all of them. There is no Lite plan and no launch credit. If you find either in code or copy, remove it.
- Work class comes from the WIC job class. The user never picks it. It can change counted heat hours, never the price.
- Site Match never appears in onboarding, on the landing page or in the main navigation. It lives under Labs with the label "pilot rider".
- The break log is optional. It is never a condition of payout.
- Collect only the fields listed in `product.json` under `pdpa_fields_collected`. No worker NRIC, names or phone numbers. Workers scan a QR and never log in.
- Before purchase, show the may-not-pay sentence verbatim, record the teach-back answer, and record the warranty tick.
- Show premiums before and after 9% GST.
- Every page footer: "Concept prototype for Income Insurance, Singapore-India Hackathon 2026. Not an Income product. Fictional data." Do not use Income's logo image. All firms and people are fictional.
- Every number in the UI carries a source tag: published, back-test, simulation, assumption or plan. An assumption tag has a tooltip giving the basis.
- The "What owners told us" block renders only when `data/seed/interviews.json` has real entries. Never invent a quote, a name or a count.

## Wording rules (the team has been caught on these)
- MOM requires rest breaks. Never write that work must stop.
- "At least 10 minutes of rest an hour at a heat reading of 32 is mandatory. MOM's framework sets 15 minutes at 33." Do not call the 15 minutes mandatory.
- The firm "pays for 60 minutes and gets 50". Never "45", never "one-fourth of the wage".
- "Heat reading (WBGT)" on first use on a screen, then "heat reading".
- Haze guidance is advisory. Never say haze stops work by law.
- Legal status: "Designed to be confirmed by Income's legal team". Never "compliant" or "approved".
- "Profitable" always comes with its basis: 65% claims, 20% expenses, 5% reinsurance, 10% profit, as a plan.
- Count employers when you size the market. 20 WBGT stations, not 30.
- Use the human line "A normal month is part of the job. A hard month, we carry with you." Never "We don't insure the summer."
- The full list is in `product.json` under `copy.never_say`. `make check-numbers` greps for it.

## UX rules
- One job and one primary button per screen. The first line of every screen is the answer in plain words with one number.
- One demo firm on every screen: read `demo_firm` from `product.json`. Do not introduce a second firm in a default view.
- Build employer and worker screens at 390 px wide first, then 1440 px.
- Use the shared components for money, hours, states, source tags, plan cards and meters. Do not make a local copy.
- Every counted hour has a "Why?" that shows the reading, the tier and the deductible.
- States carry a label and an icon, never colour alone.
- Every screen has empty, loading and error states. Loading is the three-dot Ellipsis.
- Keyboard reachable, visible focus, labelled inputs, text contrast 4.5:1, reduced-motion respected.
- No number and no legal sentence typed into a component. Import from the product module.
- Keep existing route paths. Add redirects if a screen moves. Do not rename routes.
- Motion only to explain, under 400 ms.
- Employer screens never use the words "parametric", "trigger", "index" or "attachment". See the word table in PLAN.md section 5.

## Engineering conventions
- Monorepo: `/engine` (Python, FastAPI), `/web` (Next.js App Router, TypeScript, Tailwind, shadcn/ui, Aceternity UI, 21st.dev components, Recharts), `/data/raw`, `/data/processed`, `/data/seed`, `/docs`.
- `data/seed/product.json` is loaded by `engine/rehat/product.py` and exported to `web/public/data/product.json`. The web app reads it through one typed module, `web/src/lib/product.ts`.
- `make check-numbers` runs `scripts/check_numbers.py`. It fails if a literal price, split, path figure or retired term appears in `/web/src` or `/engine/rehat` outside the product modules, or if `product.json` and the exported copy differ.
- Cache every external API response to `/data/raw` with the request URL and timestamp. Never hit an API twice for the same request.
- The web app must run fully offline from precomputed JSON in `/web/public/data`. The demo cannot depend on venue Wi-Fi. Live mode is a toggle.
- Python: type hints, pure functions for rules, `pytest` tests for every trigger tier, plan multiple, work class, cap, fallback step, forfeit and exclusion.
- TypeScript: strict mode; shared types generated from the FastAPI OpenAPI schema where possible.
- Restyle every Aceternity and 21st.dev component to the tokens in `web/src/styles/tokens.css`. Never ship default demo colours.
- Keep secrets in `.env` (never commit). Optional keys: `DATA_GOV_SG_API_KEY`, `OPENAI_API_KEY`. The app must work with neither.
- Small commits with clear messages. After a passing offline run, tag `demo-safe-N` so the team can roll back.
- After the Monday evening freeze, fix bugs only. No new features, no dependency upgrades, no refactors.

## Writing style for any UI copy or docs
Plain, direct English. Short sentences. No em dashes. No hype words (seamless, revolutionary, unlock, leverage, empower). Sentence case for headings and buttons. Write for a contractor reading on a phone on site.
