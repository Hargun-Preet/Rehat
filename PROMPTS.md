# PROMPTS.md: Codex prompts, in order

How to use: start a new Codex chat for each prompt. Paste the prompt as written. Every prompt begins and ends the same way so context is never lost. Do not skip the end-of-session step. If a prompt fails halfway, start the next chat with "Continue prompt N" and Codex will read the worklog.

Standard opening (already included in each prompt): "Read AGENTS.md and CONTEXT.md fully before doing anything."
Standard closing (already included): "Finish by appending a worklog entry to CONTEXT.md section 15 and updating section 13, as AGENTS.md requires."

---

## P0. Scaffold the monorepo

Read AGENTS.md and CONTEXT.md fully before doing anything.

Create the monorepo described in CONTEXT.md section 11:
- `/engine`: Python 3.11 project with `pyproject.toml` (pandas, numpy, pyarrow, scikit-learn, scipy, requests, fastapi, uvicorn, pydantic, pytest, python-dotenv). Package `rehat` with empty modules: `ingest/`, `stations.py`, `wbgt_rebuild.py`, `rules.py`, `ledger.py`, `backtest.py`, `pricing.py`, `liquidity.py`, `sitematch.py`, `gapfill.py`, `explain.py`, `api.py`.
- `/web`: Next.js (App Router, TypeScript strict, Tailwind, ESLint). Initialise shadcn/ui. Add the Aceternity registry to `components.json` (`"registries": {"@aceternity": "https://ui.aceternity.com/registry/{name}.json"}`). Install recharts, leaflet, react-leaflet, framer-motion, lucide-react.
- `/data/raw`, `/data/processed`, `/data/seed` (copy `d1031.csv` and `ai_usecases.py` from the kit into `/data/seed` and `/engine/prototypes`), `/docs/model-cards`.
- Root `Makefile` with `make engine`, `make web`, `make test`, `make export` (engine writes JSON to `web/public/data`).
- `.env.example` with `DATA_GOV_SG_API_KEY=` and `OPENAI_API_KEY=`; `.gitignore` covering `.env`, `data/raw`, `node_modules`, `.venv`.
- `README.md` with how to run both apps.

Acceptance: `make test` runs (zero tests is fine), `make web` serves a blank page, `make engine` serves FastAPI `/health`.

Finish by appending a worklog entry to CONTEXT.md section 15 and updating section 13, as AGENTS.md requires.

---

## P1. Design system that matches Income

Read AGENTS.md and CONTEXT.md fully before doing anything. Focus on CONTEXT.md section 12 and PLAN.md section 3.

1. Create `web/src/styles/tokens.css` with CSS variables: `--income-orange`, `--income-orange-600`, `--income-blue`, `--paper`, `--ink`, `--muted`, `--line`, state colours (`--state-triggered`, `--state-not`, `--state-pending`), radius, shadow, spacing scale. Use the placeholder hex values in CONTEXT.md and leave a comment telling the team to sample the exact values from income.com.sg.
2. Load Ubuntu (headings, weights 500 and 700) and Inter (body, 400 and 600) with `next/font/google`. Tabular figures for numbers.
3. Map tokens into Tailwind theme and shadcn CSS variables so every shadcn, Aceternity and 21st.dev component inherits them.
4. Build shared components in `web/src/components/brand/`: `Ellipsis` (three orange dots, animated loader and static divider), `AssumptionTag` (small pill with tooltip "Assumption: <basis>"), `StateBadge` (TRIGGERED / NOT TRIGGERED / PENDING with label, colour and icon, never colour alone), `Money` (S$ with optional "incl. 9% GST"), `SourceNote`, `PrototypeFooter` (exact text from AGENTS.md), `AppShell` with a header text wordmark "Income Business (concept)" and nav to all routes in PLAN.md section 2.
5. A `/styleguide` page showing every token and component.

Acceptance: `/styleguide` renders in light mode with Income-like orange and blue, Ubuntu headings, footer on every page.

Finish by appending a worklog entry to CONTEXT.md section 15 and updating section 13, as AGENTS.md requires.

---

## P2. Data ingest with caching

Read AGENTS.md and CONTEXT.md fully before doing anything. Focus on CONTEXT.md section 6.

Implement `engine/rehat/ingest/`:
1. `datagov.py`: a client for data.gov.sg v2 real-time weather endpoints (WBGT, rainfall, air temperature) and PSI, fetched by `date=YYYY-MM-DD`, following `paginationToken` until done. First verify the exact URLs and response shapes against the dataset pages listed in CONTEXT.md and record them in `/docs/data-sources.md`. Optional header `x-api-key` from `.env`. Retry with backoff on 429. Cache each raw page to `/data/raw/datagov/<api>/<date>/<page>.json`; never refetch a cached page.
2. Normalise to tidy parquet: `wbgt_15min.parquet` (station_id, name, lat, lon, ts_sgt, wbgt), `rain_5min.parquet`, `temp_1min_or_5min.parquet`, `psi_hourly.parquet` (region, ts, psi_24h). Store station metadata separately.
3. `mss.py`: download MSS historical daily CSVs for a station list (start with Changi, Bishan, Jurong West equivalents if available; document which), normalise to `mss_daily.parquet`. If the site blocks scripted downloads, document the manual download steps and load from `/data/raw/mss/`.
4. `openmeteo.py`: ERA5 hourly from the Open-Meteo archive API for each WBGT station's lat/lon (temperature_2m, relative_humidity_2m, dew_point_2m, wind_speed_10m, shortwave_radiation, direct and diffuse radiation, surface pressure), 2000 to latest; and archived forecasts from the historical forecast API from 2022. Cache by station and year.
5. `noaa.py`: NOAA Oceanic Niño Index table to `oni.parquet` with an `enso_state` column (El Niño if ONI >= 0.5 for the season, La Niña if <= -0.5, else neutral).
6. CLI: `python -m rehat.ingest --from 2025-02-01 --to <today> --what wbgt,rain,psi` and `--what era5,mss,oni`.
7. Load `/data/seed/d1031.csv` as a fixture for tests.

Acceptance: WBGT pulled for at least 60 days including 2025-10-31; values for 31 Oct 2025 match the seed CSV for at least 10 stations within 0.05°C; a coverage report in `/docs/data-coverage.md` (stations by month, % missing).

Finish by appending a worklog entry to CONTEXT.md section 15 and updating section 13, as AGENTS.md requires.

---

## P3. Rules engine and ledger (the product)

Read AGENTS.md and CONTEXT.md fully before doing anything. Focus on CONTEXT.md sections 4, 7 and 8.

1. `rules.py`, pure functions with docstrings quoting the CONTEXT.md term they implement:
   - `heat_rest_minutes(hourly_mean_wbgt)` -> 0, 5, 10 or 15.
   - `hourly_wbgt_state(four_readings)` -> (value, state) where fewer than 3 valid readings = PENDING.
   - `rain_hours(clock_hour_mm)` -> 0, 0.5 or 1.
   - `haze_hours(daily_noon_psi_series)` with the 3rd-consecutive-day rule for 101 to 200 and the 20 h annual limit.
   - `in_window(ts, meal_hour)` Mon to Sat 08:00 to 18:00 minus meal hour.
   - `fallback(primary, backup, regional_median, model_estimate, days_since)` returning value, source and state, following the ladder exactly.
   - `allowance(normal_hours, multiple=1.25)`, `insured_hours(counted, allowance)`, `apply_caps(month_hours, year_to_date, monthly=20, yearly=60)`.
   - `exclusions(firm, month)` including the MOM heat-action forfeit.
2. `ledger.py`: `FirmMonthLedger` that takes a firm (UEN, name, outdoor workers, wage band, sites, primary/backup station, plan, meal hour) and a month, and produces hourly lines (ts, peril, reading, source, state, minutes or hours), monthly totals by peril, allowance, insured hours after caps, payout, settlement date (5th working day, Singapore public holidays respected), and receipt lines in plain English, including a "what did not count and why" list.
3. Normals: compute monthly normals per station and peril from available history; until the rebuild exists, use documented interim normals and tag them as assumptions.
4. Fictional demo book: 300 firms in `/data/seed/firms.json` (fictional names like "Tanjong Greenworks Pte Ltd"), sizes 5 to 60 outdoor workers, sites spread across Singapore, plans 60% Standard, 30% Lite, 10% with Site Match.
5. Tests: one pytest per tier boundary (31.49, 31.5, 31.99, 32.0, 32.99, 33.0), meal hour, Sunday, pending with 2 of 4 readings, each fallback step, allowance, monthly and yearly caps, haze day 1/2/3, forfeit, and the worked month in CONTEXT.md section 5 (must produce S$510).

Acceptance: `make test` passes; `GET /ledger/{uen}/2025-10` and `GET /receipt/{uen}/2025-10` return JSON for a demo firm.

Finish by appending a worklog entry to CONTEXT.md section 15 and updating section 13, as AGENTS.md requires.

---

## P4. WBGT rebuild and validation (back-test foundation)

Read AGENTS.md and CONTEXT.md fully before doing anything. Focus on the expert input in CONTEXT.md section 6.

1. `wbgt_rebuild.py`: compute outdoor WBGT from ERA5 hourly variables with the Liljegren method. Use a maintained package if one exists (check `thermofeel` and `pywbgt` on PyPI; record the version), otherwise implement Liljegren with references in comments. Document assumptions (wind height adjustment, solar zenith, globe size).
2. Bias-correct per station and month using the overlap period with NEA observations (Feb 2025 onward). Keep raw and corrected series.
3. Validation report `/docs/wbgt-validation.md` and JSON for the UI: per station MAE, bias, hourly band agreement for the classes <31.5, 31.5 to 31.9, 32 to 32.9, 33+, confusion matrix, and performance specifically in 31 to 34°C. Hold out the last 3 months as a test set.
4. Produce `wbgt_hourly_rebuilt.parquet` 2000 onward per station with a flag `observed` vs `rebuilt`.
5. Model card `/docs/model-cards/wbgt-rebuild.md`.

Acceptance: report exists with held-out numbers; if band agreement near the threshold is poor, say so plainly in the report and in the worklog. Do not tune on the test set.

Finish by appending a worklog entry to CONTEXT.md section 15 and updating section 13, as AGENTS.md requires.

---

## P5. Product back-test and robustness

Read AGENTS.md and CONTEXT.md fully before doing anything. Focus on CONTEXT.md sections 4 and 5.

1. `backtest.py`: for each station and each year in history (rebuilt WBGT 2000+, real rainfall where available, PSI where available; MSS Changi daily proxy for 1983 to 2018 as a second, longer view), run the exact product rules from `rules.py` for a representative firm (1 worker, Standard). Output per station-year and station-month: counted hours by peril, insured hours, payout, loss ratio at the current premium, flags for zero-payout years, months paying, years hitting the cap.
2. Aggregate across a book weighted by the demo firm distribution.
3. Robustness grid (the NEA researcher asked for this): thresholds (31.5 vs none; 32 vs 32.5), allowance multiple (1.0, 1.25, 1.5), station rule (nearest, second nearest, median of three), estimation error (+/-0.5°C), haze rule (2 vs 3 consecutive days). Output a tornado table of expected payout and 1-in-10 loss ratio.
4. Basis-risk metric: share of hours where the named station says NOT_TRIGGERED while any of the two nearest neighbours says TRIGGERED; by station and overall.
5. Compare results to the proxy numbers in CONTEXT.md section 6 and explain differences.
6. Export JSON for `/backtest` page; write `/docs/backtest.md`.

Acceptance: the four headline numbers (expected insured hours per worker, zero-payout years, % months paying, 1-in-10 loss ratio) are produced from real data and written into CONTEXT.md section 5 with source, replacing proxy numbers where better.

Finish by appending a worklog entry to CONTEXT.md section 15 and updating section 13, as AGENTS.md requires.

---

## P6. Pricing, unit economics, reinsurance

Read AGENTS.md and CONTEXT.md fully before doing anything.

1. `pricing.py`: premium = expected insured hours x benefit / target loss ratio (0.65), for Lite (S$5) and Standard (S$8); Site Match rider priced from the top-up simulation (P8) or the CONTEXT.md assumption until then. GST 9%. Launch credit 30% to 31 Dec 2027. Per worker per year, month, week, working day.
2. 20-worker firm sheet: premium before and after GST, expected payout, 1-in-10, worst back-test year, cap.
3. Expense model: variable %, fixed cost (input), break-even policies, expense ratio curve vs policy count, policy count where expense ratio hits 20%.
4. Reinsurance: annual book loss-ratio distribution from P5; expected stop-loss recovery at attachments 100, 110, 125, 150, 175%; cost at a reinsurer load input (default 1.75x); pick the cheapest attachment inside the 5% budget and show retained worst case. Pilot view (300 firms) and scale view.
5. Market sizing from CONTEXT.md section 5 with low/mid/high inputs editable.
6. Export JSON; write `/docs/pricing.md`.

Acceptance: numbers reproduce CONTEXT.md section 5 when fed the same inputs; when fed P5 outputs, the new numbers are written into CONTEXT.md with a note of what changed.

Finish by appending a worklog entry to CONTEXT.md section 15 and updating section 13, as AGENTS.md requires.

---

## P7. Liquidity forecasting for Income

Read AGENTS.md and CONTEXT.md fully before doing anything. Focus on CONTEXT.md section 9 and PLAN.md section 5.

1. `liquidity.py`:
   - Daily accrual for the demo book: counted hours to date per firm, "insured if month ended today".
   - Month-end Monte Carlo (2,000 paths): remaining working days sampled from the same calendar month in history for each station (block bootstrap by day to keep within-day structure, and sample a single historical year per path across stations to keep spatial correlation). Next 1 to 3 days drawn from the forecast instead of history (Open-Meteo forecast for live mode, archived forecast for back-tests). Apply allowance and caps per firm, sum to the book.
   - Settlement cash call on the 5th working day: P50, P90, P99, buffer = P99 - P50; series showing how the band narrows day by day through the month.
   - Season view: reweight historical years by ONI state; show cash and annual loss ratio under El Niño, neutral, La Niña.
   - Annual view: loss-ratio distribution, stop-loss recovery at the chosen attachment, retained worst case, hard cap.
2. Validation: for every month from 2022 onward, run the forecast as of day 1, 10 and 20 using only data available then (archived forecasts), and record whether the actual payout fell under P90. Report coverage and mean absolute error. Write `/docs/liquidity-validation.md` and a model card.
3. Firm alerts: when the 1 to 3 day forecast predicts trigger hours, produce an employer alert ("Heat stress likely 12:00 to 15:00 tomorrow at Bishan. Plan heavy work early.") and a worker notice.
4. Export JSON for `/insurer`.

Acceptance: `GET /liquidity?asof=2025-10-20` returns a cash call distribution for the November settlement; coverage report exists and its number is written into CONTEXT.md.

Finish by appending a worklog entry to CONTEXT.md section 15 and updating section 13, as AGENTS.md requires.

---

## P8. Site Match AI (hybrid claim)

Read AGENTS.md and CONTEXT.md fully before doing anything. Port `/engine/prototypes/ai_usecases.py` as the starting point.

1. `sitematch.py`:
   - Parse a site log from CSV (columns time, wbgt). Optional: image or PDF extraction with a vision model if `OPENAI_API_KEY` is set; the user always confirms the extracted table before submission.
   - Checks with explicit reasons: median uplift vs station within -1 to +2°C; correlation with station >= 0.7; not flat (std of differences >= 0.05); share of readings in [32.0, 32.15) or [33.0, 33.15) <= 0.35; timestamps inside the claimed day and window; site address matches the declared site.
   - Result: APPROVED (top-up minutes = rest implied by site log minus rest paid by station, per worker, capped at 10 h a year) or REVIEW (reasons listed). Never REJECTED by the model.
   - Review queue with human decision and audit event.
2. Evaluation: regenerate the 400-log simulation on the real record-day curves and on 10 more real days; report flag rates by log type. Make 10 sample CSV logs in `/data/seed/site_logs/` (honest, inflated, flat, threshold-bunched, pasted-day) for the demo.
3. Price the rider from simulated honest uptake (document the assumptions).
4. Model card `/docs/model-cards/site-match.md`.

Acceptance: `POST /sitematch/check` returns status, reasons and top-up for each sample log; honest logs approved, fakes sent to review.

Finish by appending a worklog entry to CONTEXT.md section 15 and updating section 13, as AGENTS.md requires.

---

## P9. Other AI: explainer, gap-fill, station suggestion, declaration anomalies

Read AGENTS.md and CONTEXT.md fully before doing anything.

1. `explain.py`: turn a receipt into plain English in English, Bengali, Tamil, Mandarin, Burmese and Malay. Template first; if an LLM key exists, the LLM may rephrase but every number in its output must match the receipt (parse and compare; if any mismatch, return the template). Answer "why wasn't I paid this month?" from the receipt only.
2. `gapfill.py`: neighbour median and ridge estimates for a missing station-hour; validation on held-out days (MAE, band agreement). Used only to propose a value for PENDING hours after 48 h, shown with a "model estimate" label and sent for review.
3. `stations.py`: representativeness suggestion: for a site, rank the three nearest stations by distance and historical correlation with the local rebuilt series; return the suggestion with a reason. Human approves.
4. Declaration anomaly flags: compare declared outdoor headcount and wage band against firm size bands and activity code; isolation forest on the demo book with seeded anomalies; flag only.
5. Model cards for each.

Acceptance: tests show the explainer refuses any LLM output with a changed number.

Finish by appending a worklog entry to CONTEXT.md section 15 and updating section 13, as AGENTS.md requires.

---

## P10. Web: landing, Income hub, onboarding

Read AGENTS.md and CONTEXT.md fully before doing anything. Focus on PLAN.md sections 2 and 3.

1. `/`: Aceternity Spotlight hero in Income orange, headline "Rest that is paid for gets taken.", sub-line from CONTEXT.md section 1; Bento Grid of the four pillars (explainability, back-test and forecast, value to Income, KYC and fraud); a Timeline "A month with Rehat" (alert, rest, receipt, PayNow); key numbers with AssumptionTags; CTA buttons to the demo routes.
2. `/income`: mock Income business account for a fictional firm. Cards for the firm's Income policies: Work Injury Compensation (active, renewal in 30 days, headcount and wage band shown), SmartBiz 360 (active). A highlighted offer: "Add Rehat to your WIC renewal". Roadmap cards: Stallholder Insurance (haze section) and platform worker WIC (riders), marked "concept". Use 21st.dev plan or product cards restyled to tokens.
3. `/onboard`: stepper: UEN entry -> Aceternity Multi Step Loader for "Checking ACRA via Corppass", "Reading your WIC policy", "Finding your nearest NEA stations" (mocked, 1 to 2 s each) -> review headcount and wage band (pulled from WIC, editable only by re-declaring WIC) -> site address and map with primary and backup station plus reason -> plan choice (Lite, Standard, Site Match rider) with price per worker per week and total, before and after GST, launch credit line with end date -> the may-not-pay sentence verbatim -> teach-back question "When does Rehat pay you?" with three options (record the answer; explain if wrong) -> PDPA consent listing exactly the fields collected and why -> confirmation with policy schedule (named stations printed).

Acceptance: a judge can complete onboarding in under 60 seconds; every assumption number has a tag; footer present.

Finish by appending a worklog entry to CONTEXT.md section 15 and updating section 13, as AGENTS.md requires.

---

## P11. Web: live map, replay, receipt, Site Match, worker view

Read AGENTS.md and CONTEXT.md fully before doing anything.

1. `/live`: Leaflet map of WBGT stations and rain gauges; each marker shows the latest reading and hour state badge; region PSI chips; a source chip when a fallback is used; live/offline toggle (offline reads JSON).
2. `/replay`: 31 Oct 2025, 08:00 to 17:30, a scrubber and play button; per-station meters fill with rest minutes; select "Tanjong Greenworks, 20 workers, Jurong West" and watch its day total and the S$ amount count up; end card with receipt preview.
3. `/employer/receipt`: the monthly receipt for a demo firm (use a month with a payout); hour-by-hour heatmap by peril; allowance line; caps; payout; "what did not count and why"; dispute link (FIDReC); "Ask about this receipt" panel using the explainer.
4. `/employer/site-match`: Aceternity File Upload; pick a sample log; extracted table preview; checker running line by line; result card APPROVED with top-up minutes or REVIEW with reason chips.
5. `/worker`: 21st.dev phone mockup; notice in five languages (tabs); QR opt-in; badge "translations pending native-speaker review".

Acceptance: all five pages work offline from JSON.

Finish by appending a worklog entry to CONTEXT.md section 15 and updating section 13, as AGENTS.md requires.

---

## P12. Web: back-test lab, insurer console, compliance

Read AGENTS.md and CONTEXT.md fully before doing anything.

1. `/backtest`: sliders for thresholds, allowance multiple, benefit, monthly and yearly caps, station rule, estimation error; precompute a grid in JSON so sliders are instant. Charts: payout per year, months paying, loss-ratio distribution with 1-in-10 marker, tornado chart, basis-risk by station, WBGT rebuild validation (observed vs rebuilt near the threshold). Headline cards: expected insured hours, zero-payout years, % months paying, 1-in-10 loss ratio.
2. `/insurer`: 21st.dev KPI cards: next settlement date and cash call P50/P90/P99; buffer; book size; year-to-date loss ratio. Fan chart of the month-end forecast narrowing by day. Season toggle El Niño / neutral / La Niña. Annual loss-ratio distribution with stop-loss attachment line at 150% and the hard cap. Claims queue (Site Match REVIEW items) with approve/decline and audit log. Fairness panel: price inputs listed (plan, benefit, headcount only), payout rate by region and firm size. Forecast validation number (P90 coverage).
3. `/compliance`: table mapping every row of CONTEXT.md section 7 and every must-have to the screen and code rule that satisfies it, with links.

Acceptance: an Income finance person can read the next cash call and the reinsurance decision in 10 seconds.

Finish by appending a worklog entry to CONTEXT.md section 15 and updating section 13, as AGENTS.md requires.

---

## P13. Polish, offline hardening, pitch mode

Read AGENTS.md and CONTEXT.md fully before doing anything.

1. `make export` regenerates every JSON the web app needs; the app runs with the engine stopped.
2. Empty, loading (three-dot Ellipsis) and error states on every page.
3. Accessibility: contrast, labels, keyboard navigation, no colour-only meaning.
4. `/pitch`: full-screen guided mode stepping through PLAN.md section 8 with arrow keys; each step deep-links to the live page state.
5. Performance: first load under 2 s on a laptop; images optimised.
6. Final check that every number on screen matches CONTEXT.md section 5; list any mismatch in the worklog and fix it.

Acceptance: full demo runs with Wi-Fi off.

Finish by appending a worklog entry to CONTEXT.md section 15 and updating section 13, as AGENTS.md requires.

---

## P14. Docs and judge pack

Read AGENTS.md and CONTEXT.md fully before doing anything.

Write `/docs/judge-pack.md`: the eight strong-outcome items each answered in a paragraph with numbers and links to screens; the must-haves; the legal map; model cards index; limits and what the pilot must prove; the ten hardest questions with answers (from CONTEXT.md and the deck). Export a one-page PDF summary if time allows.

Finish by appending a worklog entry to CONTEXT.md section 15 and updating section 13, as AGENTS.md requires.

---

## Quick prompts for during the build

- "Read AGENTS.md and CONTEXT.md. Run all tests, list failures, fix the smallest one first. Update the worklog."
- "Read AGENTS.md and CONTEXT.md. Compare every number shown in the web app with CONTEXT.md section 5 and list mismatches. Update the worklog."
- "Read AGENTS.md and CONTEXT.md. The demo must run offline. Turn off network calls, run `make export`, open every route and report what breaks. Update the worklog."
