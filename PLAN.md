# PLAN.md: how we build and win with Rehat

## 1. What wins this room

The organisers want a product proposal with a strong proof of concept. Judges include three Income C-suite officers. Most teams will show a dashboard of weather data and a chatbot. We win by showing an insurance product Income could file, priced from a real back-test, with a working claims engine, an honest AI layer, and a liquidity view their finance team would recognise.

Three moments the demo must deliver:
1. The record-day replay: 31 Oct 2025, real NEA readings, rest minutes filling up station by station, ending in a PayNow receipt. (Concrete, emotional, true.)
2. The Site Match claim: upload a site heat log, watch the checker pass an honest log and catch a faked one, with reasons. (Innovation plus AI that does real work.)
3. The insurer console: "Cash needed on 7 Dec (5th working day): P50 S$x, P90 S$y", the stop-loss curve, and the hard cap. (Income's CDO and CFO brain.)

Everything else supports these three.

## 2. Product surfaces (screens)

| Route | Who | Purpose | Key components |
|---|---|---|---|
| `/` | Judges | Story in 60 seconds: problem, law, product, proof | Aceternity Spotlight hero (subtle, orange), Bento Grid of the four pillars, Timeline of "a month with Rehat", three-dot ellipsis motif |
| `/income` | Employer (mock Income business account) | Shows the firm's existing Income policies (WIC active, SmartBiz 360) with Rehat offered as an add-on at WIC renewal; roadmap tiles for Stallholder and platform WIC | 21st.dev product/plan cards, status badges, Aceternity Card Hover Effect |
| `/onboard` | Employer | 60-second onboarding: UEN -> mock Corppass/ACRA pull -> WIC headcount and wage band pulled -> site address -> station assigned on map with reason -> plan choice -> may-not-pay sentence -> teach-back question -> quote with GST and launch credit -> consent | Aceternity Multi Step Loader for the mock pulls, 21st.dev stepper, shadcn form, Leaflet map |
| `/employer/receipt` | Employer | Monthly receipt: every counted hour, reading, station, allowance, caps, payout, what did not count and why; "Ask about this receipt" (AI explainer, numbers locked) | Data table, hour heatmap, receipt card, chat panel |
| `/employer/site-match` | Employer | Upload a site heat log (CSV or photo); extraction preview; checker result with reasons; approved top-up or "sent for review" | Aceternity File Upload, result cards with reason chips |
| `/worker` | Worker | Phone mockup showing the notice in Bengali, Tamil, Mandarin, Burmese, Malay; QR opt-in; no personal data | 21st.dev phone/iPhone mockup, language tabs |
| `/live` | Everyone | Live map of stations: WBGT, rain, PSI, hour state (triggered, not triggered, pending), fallback used | Leaflet map, legend, live/offline toggle |
| `/replay` | Judges | Scrub through 31 Oct 2025, 08:00 to 17:30; rest minutes accumulate per station; firm at Jurong West ends with its payout | Timeline scrubber, animated meters, count-up |
| `/backtest` | CDO | Sliders: thresholds, allowance multiple, benefit, caps, station rule, ±0.5°C error. Outputs: payout by year, zero-payout years, months paying, loss ratio distribution, tornado chart, basis-risk rate, WBGT rebuild validation | Recharts, shadcn sliders |
| `/insurer` | Income ops and finance | Liquidity: next settlement cash call P50/P90/P99, daily accrual, 1 to 3 day forecast, season scenario (El Niño/La Niña), stop-loss simulation, capital ceiling; claims queue for Site Match flags; audit log; fairness panel | 21st.dev KPI/stat cards, fan chart, queue table |
| `/compliance` | Judges | Every brief constraint and law mapped to the screen and rule that satisfies it | Checklist table with links |
| `/pitch` | Presenter | Full-screen guided demo that steps through the three moments | Keyboard-driven sections |

## 3. Visual system (looks like an Income product)

- Tokens in `web/src/styles/tokens.css`: `--income-orange` (primary), `--income-blue` (secondary), warm neutrals (`--paper #FAF7F2`, `--ink #1A1D21`), state colours: triggered = orange, not triggered = slate, pending = amber with a dashed border (never colour alone: always a label).
- Type: Ubuntu for headings, Inter for body (verify against income.com.sg). Numbers in tabular figures.
- Brand device: three orange dots (Income's "For every story" ellipsis) as loader, section divider and the "payout on its way" state.
- Layout: product-grade, calm. Cards with soft 1px borders, 16px radius, lots of white space. Motion only to explain: meters filling, numbers counting, a log being checked line by line.
- Header: "Income Business (concept)" text wordmark, not Income's logo. Footer disclaimer on every page.
- Use Aceternity for 3 to 4 hero moments only (Spotlight, Bento Grid, Timeline, File Upload, Multi Step Loader). Use 21st.dev for product UI blocks (pricing cards, stat cards, stepper, phone mockup). Restyle everything to tokens.

## 4. Engine modules (Python)

| Module | Responsibility |
|---|---|
| `ingest/` | Pull and cache data.gov.sg WBGT, rainfall, air temperature, PSI by date (paginate); MSS daily CSVs; Open-Meteo ERA5 hourly and archived forecasts; NOAA ONI. Write tidy parquet |
| `stations.py` | Station metadata, nearest/backup assignment, representativeness score (distance, correlation, coastal/inland) with explanation |
| `wbgt_rebuild.py` | Liljegren WBGT from ERA5 (use a maintained implementation, e.g. `thermofeel` or `pywbgt`, verify on PyPI); bias correction per station; validation report (MAE, band agreement at 31.5/32/33, confusion matrix) |
| `rules.py` | Pure functions: heat tier, rain tier, haze tier with consecutive-day logic, window and meal hour, hour state, fallback ladder, allowance, caps, exclusions |
| `ledger.py` | Firm-month ledger: counted hours by peril, allowance, insured hours, payout, receipt lines, audit events |
| `backtest.py` | Year-by-year and month-by-month product simulation; zero-payout years; months paying; loss-ratio distribution; robustness grid; basis-risk (neighbour disagreement) |
| `pricing.py` | Premium = expected insured hours x benefit / target loss ratio; plan table; GST; launch credit; break-even and expense ratio curves |
| `liquidity.py` | Daily accrual; month-end Monte Carlo (bootstrap remaining days, conditioned on forecast); P50/P90/P99 cash call; season reweighting by ONI; annual stop-loss recoveries; forecast validation (P90 coverage) |
| `sitematch.py` | Log extraction (CSV parser; vision model optional), plausibility checks with reasons, top-up calculation, review queue |
| `gapfill.py` | Neighbour-based estimate for pending hours, with validation; never pays on its own |
| `explain.py` | Receipt to plain language; LLM may rephrase, numbers locked and re-checked |
| `api.py` | FastAPI endpoints; also exports JSON to `/web/public/data` |

API: `GET /stations`, `GET /readings?date=`, `GET /hours?station=&date=`, `POST /quote`, `GET /ledger/{firm}/{month}`, `GET /receipt/{firm}/{month}`, `POST /sitematch/check`, `GET /backtest?params`, `GET /liquidity?asof=`, `GET /reinsurance?attach=`, `GET /compliance`.

## 5. Liquidity forecasting design (headline for Income's finance judges)

1. Accrual: each day, add counted downtime hours per firm. The allowance is monthly, so keep both "counted to date" and "insured if the month ended today".
2. Month-end distribution: for each station, simulate the remaining working days 2,000 times by sampling the same calendar month from history (rebuilt WBGT, real rain, PSI), with the next 1 to 3 days drawn from the forecast instead. Apply allowance and caps per firm, sum across the book.
3. Output for the settlement date (5th working day): P50, P90, P99 cash; recommended buffer P99 - P50; chart of how the band narrows as the month progresses.
4. Season: reweight historical years by ONI state (El Niño years hotter, drier, hazier; La Niña wetter). Show the reinsurance decision before Aug to Oct.
5. Year: annual loss ratio distribution, stop-loss recovery at 150% attachment, retained worst case, hard cap.
6. Validation: run the month-end forecast on past months using only data available at the time (archived forecasts from about 2022). Report P90 coverage. Honest number on screen.

## 6. AI use cases (each with a test and a reason output)

| Use | Model | Test | Guardrail |
|---|---|---|---|
| Site Match: read log | Vision LLM or OCR; CSV first | Extraction accuracy on 10 hand-made sample logs | Human sees extracted table before submit |
| Site Match: check log | Rules plus scores (uplift, correlation, flatness, threshold bunching) | 400 simulated logs (already: 0% honest flagged) | Never auto-reject |
| Gap-fill pending hours | Neighbour median / ridge | MAE and band agreement on held-out days | Never pays alone; proposes a value for review after 48 h |
| Station representativeness | Correlation clustering | Compare suggested vs nearest on history | Reason shown, human approves |
| Claim explainer | LLM over the fixed receipt | Numbers in output must equal receipt numbers (automatic check) | Falls back to template |
| Declaration anomaly | Isolation forest on headcount/wage band vs ACRA activity and size | Seeded anomalies | Flag only |
| Liquidity forecast | Monte Carlo + forecast conditioning | P90 coverage on past months | Forecast never changes payouts |

Each gets a one-page model card in `/docs/model-cards/`.

## 7. Team split and 36-hour timeline

Suggested roles (adjust to the team):
- Engine and data lead: ingest, rules, ledger, tests.
- Back-test and forecast lead: WBGT rebuild, back-test, pricing, liquidity.
- Web lead: design system, all screens, offline JSON mode.
- AI lead: Site Match, explainer, gap-fill, model cards.
- Product and pitch lead (Singapore teammates ideal): hawker/contractor interviews, compliance mapping, deck, demo script, Q&A drills.

| Hours | Engine and data | Back-test and forecast | Web | AI | Product and pitch |
|---|---|---|---|---|---|
| 0 to 4 | Scaffold, ingest WBGT/rain/PSI with cache | Pull ERA5, MSS, ONI | Scaffold, tokens, layout, landing | Site Match checker port | Confirm open questions with Income mentor |
| 4 to 10 | Rules + tests | WBGT rebuild + validation | Onboarding + Income hub | Log extraction | Interviews; compliance table |
| 10 to 16 | Ledger, receipts, API | Back-test + robustness | Live map + replay | Explainer with locked numbers | Deck v2 with real numbers |
| 16 to 22 | Fallback ladder, pending | Pricing, reinsurance | Back-test lab | Gap-fill validation | Demo script |
| 22 to 28 | JSON export, offline mode | Liquidity Monte Carlo + validation | Insurer console | Model cards | Rehearsal 1, judge Q&A |
| 28 to 32 | Bug fixes | Freeze numbers into CONTEXT.md | Polish, motion, empty states | Edge cases | Rehearsal 2 |
| 32 to 36 | Freeze | Freeze | Pitch mode | Freeze | Final pitch |

Code freeze at hour 32. Numbers in the deck must match the app.

## 8. Demo script (5 minutes)

1. 0:00 Problem: one 20-worker landscaping firm, a hot wet May, payroll due. The law already made this loss (paid rest at WBGT 32, salary on idle days). No insurance covers it.
2. 0:45 Why us: payer, channel and trigger already exist. Show `/income`: their WIC policy, Rehat offered at renewal.
3. 1:15 Onboarding in 60 seconds: UEN, station on map, plan, the honest sentence, teach-back, quote.
4. 2:00 Replay 31 Oct 2025: rest fills up; receipt; PayNow.
5. 2:45 Site Match: honest log approved, fake log caught, reasons shown.
6. 3:20 Insurer console: cash call for 7 Dec, P90 band narrowing, stop-loss at 150%, hard cap.
7. 4:00 Back-test and unit economics: weekly premium a worker and zero-payout years from `web/public/data/numbers.json` (one version of each number), honest limits.
8. 4:30 Roadmap and ask: riders via platform WIC, hawkers via Stallholder; 300-firm pilot from April 2027.

## 9. Risks and mitigations
| Risk | Mitigation |
|---|---|
| Venue Wi-Fi or API rate limits | Offline JSON mode; cached data |
| WBGT history too short | ERA5 rebuild with validation; show the validation honestly |
| Numbers drift between deck and app | Freeze into CONTEXT.md; deck reads from it |
| Judges say "AI is decorative" | Site Match does real work with measured results; liquidity forecast with coverage test |
| Judges say "it's a bet" | Insurable interest slide: MOM makes rest paid; benefit below cost |
| Translations wrong | Label "for native-speaker review"; ask Singapore teammates |
| Looks like impersonation | Concept-prototype footer; no logo; fictional firms |
