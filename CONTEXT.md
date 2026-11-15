# CONTEXT.md: Rehat by Income (prototype)

Read this whole file at the start of every coding session. Update the "Status" and "Worklog" sections at the end of every session. This file is the single source of truth for the project. If code and this file disagree, raise it in the worklog and fix one of them.

---

## 1. One-paragraph summary

Rehat is weather downtime cover for small Singapore firms with outdoor crews (construction subcontractors, landscapers, outdoor cleaners). It is sold as an optional add-on next to the Work Injury Compensation (WIC) insurance these employers must already buy, which Income Insurance sells. MOM's heat-stress rules make rest breaks paid working time, and work permit holders must be paid their declared salary even on idle days, so heat, heavy rain and haze cost the employer money without damaging anything. No insurance in Singapore covers this today. Rehat reads public NEA data (heat stress WBGT, rainfall, 24-hour PSI) at a station named on the policy, counts "downtime hours", and when a month is worse than that station's normal, pays S$8 per outdoor worker per extra hour by PayNow before payroll. No claim form. A second, AI-checked "Site Match" claim lets firms on hotter sites submit their site heat log for a capped top-up. Forecasting tells Income how much cash it needs for each monthly payout run and when to lean on reinsurance.

Name: Rehat is Malay for "rest"; close to Hindi "raahat", relief. Tagline: "Rest that is paid for gets taken."

## 2. The hackathon

- Event: Singapore-India Hackathon 2026, SMU, 15 to 17 Nov 2026, 36 hours. Track: FinTech/InsurTech, problem set by Income Insurance Limited.
- Income's challenge question: "How might we reimagine insurance, powered by data and AI, so that climate risk protection becomes affordable, accessible and actionable for every vulnerable household and SME in Singapore?"
- Income's open question (SmartBiz 360 case study): extend a simple, low-cost package to cover climate-related income loss for SMEs (heat, haze, flash floods), using public data and AI to price and trigger, while keeping premiums affordable.
- The organisers want a product proposal with a strong proof of concept (POC), not just code.

### What judges score ("strong outcome after 36 hours")
1. Concept/design
2. Target group
3. Simple pricing logic and unit economics
4. Clear claim parameters and exclusions
5. Expected impact on financial protection and affordability
6. Market competitiveness
7. Distribution proposal
8. How AI/data is integrated

### Must-haves (hard requirements)
- Offered by or with Income as the licensed insurer.
- Triggers and pricing inputs use independent, verifiable data.
- Target user understands what they pay for and when they get paid in under a minute.
- Collect only the personal data needed; any AI decision must be explainable.
- No new hardware for the core product.

### Out of scope (do not build towards these)
Large corporates and industrial risks; reinsurance or cat bonds AS the solution (budgeting for reinsurance is in scope); national infrastructure; climate ideas with no insurance element; hardware or sensors as the core; crypto or tokens; anything needing a change in the law.

### Judges to design for
Income: Dhiren Amin (Chief Customer Officer), David Tan (Chief Data Officer), Shannen Fong (Chief Sustainability Officer). Others include a former SEBI chair, Tata, Microsoft, Singtel and SMU faculty. Income mentor: Zhao Yiliang (VP, AI Centre of Excellence).
- CCO hears: no claim form, one SMS, money before payday, sold at a renewal the customer already does.
- CDO hears: deterministic payout on NEA data, fallback ladder, missing data never read as zero, AI kept upstream and auditable, back-test and forecast validation.
- CSO hears: makes MOM's rest rule cheaper to obey, worker notices in their language, reprices against NEA's V3 climate scenarios.

## 3. Why this user group (and not others)

Chosen: small and medium firms with outdoor manual crews.
1. The payer and channel already exist. WIC insurance is compulsory for all manual workers and non-manual staff earning S$2,600 or less a month; Income sells it. Every failed scheme in Income's brief died on "nobody would carry the premium" or distribution (KB Insurance, Korea: zero subscribers).
2. The trigger is already in the law. MOM: at WBGT 32°C or more, heavy work needs at least 10 min rest an hour; at 33°C or more, 15 min. Rest breaks count as paid working hours. On-site WBGT meters are mandatory only for construction sites with contract sum S$5M or more, shipyards and process plants; other workplaces "can refer to" NEA's myENV app. Every employer must monitor WBGT hourly.
3. The loss is a formula: rest minutes x outdoor headcount x hourly cost. Headcount and wages are already declared for WIC, so there is nothing new to lie about.
4. It is business interruption without physical damage: Income's own open question.
5. Scale: 490,700 work permit holders in construction, marine shipyard and process (MOM, Jun 2026).

Rejected, with reasons (say these if asked):
| Group | Why not |
|---|---|
| Hawkers (about 6,500 cooked-food stalls) | Centres are roofed, so rain is weak; haze under a 3-day rule pays in about 3 of 12 years; pool near S$1.2M. Roadmap phase 3 via Stallholder Insurance. |
| Delivery riders (15,300, MOM 2024) | Rain raises surge pay, so the loss is unclear; no payer without a platform deal; login gaming; many teams will pick them. Roadmap phase 2 via platform WIC (Income is a designated insurer). |
| Taxi and private-hire drivers | Air-conditioned; rain raises demand. |
| Lower-income households | PUB flood-prone area now under 25 hectares; weak income link; home insurance covers flood. |

## 4. Product specification (Rehat Standard)

| Term | Value |
|---|---|
| Insured | ACRA-registered SME with a current WIC policy and declared outdoor manual workers |
| Benefit | S$8 per outdoor worker per insured hour (Lite: S$5). Never above the firm's own idle-hour cost (about S$10.20, assumption) |
| Window | Mon to Sat, 08:00 to 18:00, minus the declared unpaid meal hour (default 12:00 to 13:00) |
| Heat meter | Hourly mean of the four 15-min WBGT readings (needs 3 of 4 valid, else pending). 31.5 to 31.9: 5 min (near-miss tier). 32.0 to 32.9: 10 min. 33.0+: 15 min |
| Rain meter | Clock-hour total at the named rain gauge. 2.5 to 9.9 mm: 0.5 h. 10 mm+: 1 h |
| Haze meter | NEA 24-hour PSI for the region at 12:00. 101 to 200: 1 h, from the 3rd consecutive day. 201 to 300: 3 h. 300+: 6 h. Haze limit 20 h a year. No allowance for haze |
| Allowance | Heat and rain each: station's normal for that calendar month x 1.25. Only hours above it are insured |
| Caps | 20 insured hours a month, 60 a year (S$480 per worker on Standard) |
| Payment | PayNow to the company UEN by the 5th working day of next month. No claim form |
| Term | 1 year, aligned to WIC renewal. 14-day wait if added mid-term |
| Station | One named primary and one backup, printed on the schedule. Default nearest; a representativeness check may suggest another, with reason shown. No correction factor applied |
| Fallback ladder | Primary (3 of 4 readings) > backup station > regional median > labelled model estimate > after 14 days settle at published regional advisory level |
| Day/hour states | TRIGGERED, NOT_TRIGGERED, PENDING. Missing data is NEVER "no event" |
| Exclusions | Indoor workers; hours outside window; workers not on the WIC declaration; lapsed WIC; shipyards, process plants, firms above SME limit; the heat payout for any month with an MOM heat enforcement action; actual losses above the benefit |

### Site Match claim (the innovation, hybrid parametric)
- For firms whose site is hotter than the station (typically subcontractors on big sites that must keep on-site WBGT logs).
- Firm uploads the main contractor's hourly WBGT log (photo, PDF or CSV).
- AI extracts readings, then a checker scores plausibility against the station network: uplift within -1 to +2°C of station, daily shape correlates with station (r >= 0.7), no flat or copied values, no bunching just above 32.0 or 33.0.
- Inside the band: auto-approved top-up = extra rest minutes implied by the log over the station's. Outside: sent to a person. AI never rejects a claim on its own.
- Cap: 10 top-up hours a year. Optional rider, about S$0.50 per worker a week (assumption until real logs tested).
- Prototype result (simulated logs on real 31 Oct 2025 curves, 400 logs): 0% of honest logs flagged; 100% of inflated and flat logs caught; 84% threshold-bunched caught; 77% pasted-from-another-day caught.

### Plans
| Plan | Benefit | Premium per worker (before GST) |
|---|---|---|
| Lite | S$5/h | about S$80 a year, S$1.55 a week |
| Standard | S$8/h | S$128.70 a year, S$2.48 a week |
| Site Match rider | top-ups, 10 h/yr cap | +about S$25 a year, S$0.50 a week (assumption) |
GST 9% on top. Year-one launch credit 30%, printed on the premium line, ends 31 Dec 2027.

### Disclosure and communication (use verbatim)
- May-not-pay sentence at sale: "Rehat pays only when NEA's published readings at your named station cross the levels shown; your own site can be hotter or wetter than the station, so you can lose work time and receive nothing."
- Employer SMS (159 chars): "Rehat: if NEA's Bishan station shows heat (WBGT 32+), heavy rain or haze in work hours beyond a normal month, we pay $8/worker/hr. Station only, not your site."
- Worker notice (Bengali, Tamil, Mandarin, Burmese, Malay; translations need native-speaker review): "WBGT is 32 now. By MOM rule you get 10 min paid rest in shade every hour. Your pay is not cut."
- Monthly receipt: every counted hour, reading, station, allowance, sum, and what did not count and why.

## 5. Numbers (mid case unless stated; label assumptions in UI)

### Market
| Item | Value | Basis |
|---|---|---|
| Work permit holders, construction + shipyard + process | 490,700 (Jun 2026) | MOM |
| In-scope outdoor workers at SMEs | 185,400 (110,700 to 261,800) | 75% construction x 60% SME x 70% outdoor + 10,800 landscape + 20,000 outdoor cleaners (assumptions) |
| Firms | about 12,400 | 15 outdoor workers per firm (assumption) |
| Total market (premium) | S$23.9M (S$14.3M to S$33.7M) | 185,400 x S$129 |
| Income WIC book slice | S$2.9M | 12% share (assumption) |
| Year-3 obtainable | S$1.92M, about 745 firms, 14,900 workers | 40% attach on Income book + 6,000 via associations |
| WIC cross-sell | S$0.9M to S$1.9M WIC premium from new firms | 1.5 to 3% of payroll (unsourced) |
| Employer's liability market 2025 | S$488M premium, S$94.4M underwriting profit (about 19%) | GIA |

### Unit economics, per worker, Standard
| Item | Value |
|---|---|
| Expected insured hours | 10.46 a year (low 7.25, high 17.58) |
| Expected payout | S$84 |
| Premium | S$128.70 = expected payout / 0.65 target loss ratio |
| 1-in-10 year payout | S$159 (124% loss ratio) |
| Worst back-test year (1997-like) | S$295 (229%) |
| Hard cap | S$480 (373%) |
| Premium split | 65% claims, 12% variable expenses, 5% reinsurance and capital, 18% fixed cost and margin |
| Break-even | 647 policies at S$300k fixed cost (assumption); expense ratio 30% at break-even; 20% at 1,456 policies (S$300k fixed) or 485 to 728 policies with lower fixed or variable costs |
| 20-worker firm | Premium S$2,575 (S$2,806 with GST); expected payout S$1,674; worst capped S$9,600; premium about 0.5% of labour bill; loses about S$12,200 a year to weather downtime |

### Worked month (May 2026, 20 workers, Bishan)
Heat counted 1.69 h vs allowance 1.25 -> 0.44 h. Rain 9.0 h vs allowance 6.25 -> 2.75 h. 3.19 h x S$8 x 20 = S$510, paid by 5th working day of June. (Heat from real sampled readings; rain and normals are assumptions.)

### Reinsurance and capital (decided)
- Pilot (300 firms, 6,000 workers): premium S$0.77M, expected claims S$0.50M, worst back-test year S$1.77M, hard cap S$2.88M. Income retains all.
- From year 2: aggregate stop-loss attaching at 150% annual loss ratio, up to the cap.
- Expected recovery as % of premium (36 proxy years): attach 110% = 6.2% (hit 5/36); 125% = 4.2% (4/36); 150% = 2.2% (2/36). With an assumed 1.75x reinsurer load, 150% costs about 3.9%, inside the 5% budget.
- No quota share (gives away margin), no per-event cover (losses accrue over months). Capital under MAS RBC 2 set by Income's actuary; caps bound the maximum.

## 6. Evidence and data

### Data already pulled (in /data/seed)
- `d1031.csv`: real NEA WBGT, 15-min, 15 stations, 31 Oct 2025, 08:00 to 17:30. Record day; peak 35.0°C Sentosa 12:15. Mandated rest per worker ranged 0 to 65 min by station; network mean 13 min.
- Proxy back-test on MSS Changi daily records 1983 to 2018 (third-party GitHub copy, chuachinhon/weather_singapore_cch): rain days >= 10 mm mean 61.4/yr (32 in 1997, 81 in 2013); correlation of above-normal rain and heat -0.31; bundling cuts year-to-year swing 41%; 0 of 36 years with zero payout; 55% of months pay something.
- Heat frequency sample: 33 days, Nov 2025 to Oct 2026: about 83 h/yr at WBGT 32+ per station, 16 h at 33+. Adjusted paid rest about 12 h/worker/yr (7 to 18.5). Sample year looks hot; Sentosa and Jurong Island drive much of it.

### Data sources to use
| Data | Source | Notes |
|---|---|---|
| WBGT 15-min | data.gov.sg v2 real-time API, `api=wbgt`, by `date`, paginate with `paginationToken` | From Feb 2025. 15 stations 2025, about 30 by Sep 2026. Dataset d_87884af1f85d702d4f74c6af13b4853d |
| Rainfall 5-min | data.gov.sg v2 real-time rainfall, by date | Dataset d_72ef872af64a49bbf85c037e714267c0 |
| Air temperature | data.gov.sg v2 real-time air temperature | Dataset d_66b77726bbae1b33f218db60ff5861f0 |
| 24-hour PSI by region | data.gov.sg v2 real-time PSI, by date | Regions: north, south, east, west, central |
| Daily rain and temperature history | MSS historical daily records (weather.gov.sg) | From 1980 for many stations |
| Hourly reanalysis | Open-Meteo archive API (ERA5), no key | From 1940; for WBGT rebuild (Liljegren method) |
| Archived forecasts | Open-Meteo historical forecast API | From about 2022; for honest forecast back-tests |
| ENSO state | NOAA Oceanic Niño Index (ONI) table | Classify years El Niño / La Niña / neutral |
| Climate scenarios | NEA V3 projections | High heat-stress days by 2100: 54 to 135 (low emissions), 107 to 205 (medium), 207 to 326 (high), vs 21 (2024) and 29 (2025) |
| Workforce | MOM foreign workforce numbers | Market sizing |
Verify every endpoint before relying on it. data.gov.sg may rate-limit: cache everything to disk; an API key raises limits.

### Expert input (scientific guidance from an NEA climate researcher, NOT an endorsement)
Stations do not perfectly represent a site and there is no universal correction factor; rebuild WBGT from ERA5 with Liljegren and validate against NEA observations near the payout threshold; the nearest station is not always the most representative; test robustness by varying thresholds, durations, station choice and estimation error; missing data must never be treated as "no event"; for 36 hours, demonstrate event calculations rather than claim a validated product.

### AI prototype results (real 31 Oct 2025 data)
- Gap-filler (estimate a missing station from the other 14, afternoon test): network median MAE 0.87°C, correct rest band 83%; median+offset 1.11°C, 79%; ridge 1.06°C, 81%. NOT good enough to pay on, so pending hours wait up to 48 h for a backup station. Retest with a full year of history.
- Site Match checker: see section 4.

## 7. Legal and regulatory constraints (encode these as rules in code and copy)

| Rule | Source | What the product must do |
|---|---|---|
| WIC compulsory for manual workers and non-manual earning S$2,600 or less | Work Injury Compensation Act, MOM | Rehat requires an active WIC policy; headcount comes from WIC declaration |
| Heat-stress rest: WBGT 32+ 10 min/h, 33+ 15 min/h (heavy work); paid working time; hourly monitoring; on-site meters for construction S$5M+, shipyards, process | MOM heat stress framework and FAQs | Trigger tiers mirror these; never encourage working through heat; worker notices state the rule |
| Four measures mandatory from 1 Dec 2026: heat-stress training, cool drinking water, cooling supplies on standby, suitable clothing | MOM, 28 Aug 2026 | Show in employer compliance checklist; renewal reward for compliance |
| Declared salary owed on idle days | MOM Work Permit FAQ (Employment of Foreign Manpower framework) | Basis of insurable interest for rain and haze |
| Haze guidance for outdoor work | MOM haze guidelines (Oct 2026) | Haze tiers; link guidance in alerts |
| Licensed insurer; product filed by Income | Insurance Act, MAS | Every screen says "Underwritten by Income Insurance Limited (proposed)" and "Concept prototype" |
| Fair dealing and disclosure | MAS Guidelines on Fair Dealing (revised May 2024) | May-not-pay sentence before purchase; teach-back question recorded; plain-language receipts |
| Fair, explainable AI | MAS FEAT principles; Veritas methodology | Price varies only by plan, headcount and benefit; no nationality, age or health inputs; every AI check outputs a reason; human review of flags; model cards |
| Climate risk management | MAS Guidelines on Environmental Risk Management for Insurers (2020) and transition planning addendum (Mar 2026) | Scenario stress tests (V3), annual repricing, disclosure of climate assumptions |
| Personal data | PDPA | Collect only: UEN, WIC policy no., outdoor headcount, wage band, site addresses, PayNow (UEN), one contact. No worker personal data by default; workers opt in to notices by QR; delete at policy end; consent and purpose screens |
| Insurable interest | Income brief constraint | Benefit below real hourly cost; only firms with declared outdoor workers; one policy per UEN |
| GST 9% on premiums | IRAS | Show premium before and after GST |
| Disputes | FIDReC | Receipt shows how to dispute; disputes are data checks |
| Platform Workers Act (from 1 Jan 2025) | MOM | Roadmap only: riders via platform WIC |
| No law change needed | Brief | Everything above uses existing rules |

## 8. Fraud and moral hazard controls
| Risk | Control |
|---|---|
| Inflating headcount | Capped at WIC-declared numbers (which also raise WIC premium); CPF and work-pass cross-check with consent |
| Stopping work to collect / working on for pay | Impossible: payout depends only on NEA readings |
| Payout kept, rest not given | Worker notices, no-wage-deduction condition, heat payout forfeited in any month with MOM heat action |
| Buying before a bad spell | Annual term tied to WIC; 14-day wait mid-term; seasonal normals; alert on sign-up spikes vs forecasts |
| Station shopping | Station set by rule from declared addresses; changes apply next month |
| Indoor staff declared outdoor | WIC job class, spot checks |
| Over-insurance | Benefit below hourly cost; one policy per UEN |
| Fake site logs | Site Match checker; human review; cap |

## 9. Forecasting for liquidity (Income's cash, not the customer's payout)
Forecasts NEVER change a payout. They plan cash and reinsurance.
| Horizon | Method | Decision |
|---|---|---|
| 1 to 3 days | NEA/Open-Meteo forecasts -> predicted trigger hours per station | Daily accrual; firm alerts to reschedule heavy work |
| Month-end settlement | Accrued hours to date + Monte Carlo of remaining days (bootstrap same calendar month, same station, conditioned on near-term forecast) -> apply allowance and caps per firm -> aggregate | Cash call for the 5th working day: P50, P90, P99; buffer = P99 - P50 |
| Season | ENSO state (ONI) reweights historical years | Reinsurance purchase before haze (Aug to Oct) and monsoon (Nov to Jan) seasons |
| Year | Annual loss-ratio distribution; stop-loss recovery at 150% | Capital and reinsurance |
| Decades | V3 scenarios | Normals reset yearly; affordability check |
Validation: back-test the month-end P90 against actual historical months (coverage rate should be about 90%); use archived forecasts so there is no hindsight.

## 10. Income products in the story (mocked, not wired)
| Income product | Role in prototype |
|---|---|
| Work Injury Compensation (employer) | Host policy; source of headcount and wages; Rehat is a tick box at WIC renewal |
| SmartBiz 360 (launched Oct 2026) | Optional "Weather Downtime" section; answers Income's open question |
| Platform worker WIC (Income is a designated insurer) | Roadmap: riders |
| Stallholder Insurance | Roadmap: haze section for hawkers |
| Droplet (2018 parametric rain cover) | Heritage: Income has done parametric before |
| NTUC network (U SME, Migrant Workers' Centre) | Distribution and worker notices |
All integrations are mocked with fictional data. Never use Income's logo file or imply this is a live Income product. Every page footer: "Concept prototype for Income Insurance, Singapore-India Hackathon 2026. Not an Income product. Fictional data."

## 11. Architecture (target)
- `/engine` Python 3.11+: data ingest and cache, trigger engine, back-test, pricing, forecasting and liquidity, AI checks; FastAPI service.
- `/web` Next.js (App Router) + TypeScript + Tailwind + shadcn/ui + Aceternity UI + 21st.dev components + Recharts; reads the API, falls back to precomputed JSON in `/web/public/data` so the demo never depends on live APIs.
- `/data/raw` (cached API pulls), `/data/processed` (parquet/JSON), `/data/seed` (committed demo data).
- `/docs` decisions, model cards, demo script.

## 12. Brand and UI direction
- Match Income's look: warm orange as the primary colour, deep blue as secondary, generous white space, real-people warmth. Income's 2026 brand platform "For every story" uses three orange dots (an ellipsis) as its device: use the three dots as the loader and as the "story continues" accent. Income's earlier identity used the Ubuntu typeface: use Ubuntu for headings (verify against income.com.sg and switch if the site uses another face) and Inter for body.
- Sample exact colour hex values from income.com.sg with a colour picker and put them in `web/src/styles/tokens.css`. Until then use placeholders `--income-orange: #F26722` and `--income-blue: #1B3A6B` (unverified).
- Polished, calm, product-grade. Motion only where it explains (payout counting up, hours filling a meter). No neon, no heavy gradients.

## 13. Status
(Update every session.)
- [x] Repo scaffolded (P0, 2026-11-15)
- [ ] Data ingest and cache
- [ ] WBGT rebuild and validation
- [ ] Trigger engine and receipts
- [ ] Back-test and robustness
- [ ] Pricing and reinsurance
- [ ] Liquidity forecasting
- [ ] Site Match AI
- [ ] Web: landing, employer portal, worker notices, live map, replay, back-test lab, insurer console, compliance
- [ ] Demo script rehearsed

## 14. Open questions for Income's mentor
1. Income's share of small-firm employer WIC; typical construction WIC premium per worker.
2. Does the WIC application record outdoor/manual headcount by job class and wages?
3. Can a parametric section sit alongside compulsory WIC, or must it be a separate policy?
4. Fixed cost to add a section to an existing policy (sets expense ratio).
5. Lessons from Droplet.

## 15. Worklog
(Append one entry per session, newest last. Format below.)

### YYYY-MM-DD HH:MM, session title
- Done:
- Files changed:
- Numbers produced (with source):
- Decisions:
- Broken or unverified:
- Next:

### 2026-11-15 14:40, P0 scaffold the monorepo
- Done: Copied the kit (AGENTS, CONTEXT, PLAN, PROMPTS, seed) from ~/Downloads/rehat-kit into the empty repo. Created `/engine` (pyproject, package `rehat` with module stubs, `ingest/`, FastAPI `/health`, `rehat.export`), `/web` (Next.js 15.5.4 App Router, TS strict, Tailwind 4.1.13, ESLint, shadcn init, Aceternity registry in components.json, recharts, leaflet, react-leaflet, framer-motion, lucide-react), `/data/{raw,processed,seed}`, `/docs/model-cards`, Makefile (setup, engine, web, test, export), `.env.example`, `.gitignore`, README.
- Files changed: AGENTS.md, CONTEXT.md, PLAN.md, PROMPTS.md, Makefile, README.md, .env.example, .gitignore, engine/**, web/**, data/seed/d1031.csv, engine/prototypes/ai_usecases.py.
- Numbers produced (with source): none.
- Decisions: Python 3.12 venv (3.11 not installed; pyproject requires >=3.11). Tailwind pinned to 4.1.13 because 4.3.5 pulls ESM-only magic-string 1.x that Node 20.17 cannot require. Gaps found while reading the kit are listed in the next entry's decisions as they get resolved: rain gauge assignment separate from WBGT station; haze "consecutive day" = working days with noon PSI > 100, tiers 101-200, 201-300, >300; premium rounding (10.46 x 8 / 0.65 = 128.74 vs 128.70 in section 4); rider S$0.50/wk = S$26/yr vs S$25; demo firm naming (Lim Landscaping vs Tanjong Greenworks).
- Broken or unverified: station ID to name map in ai_usecases.py unverified until P2 pulls metadata.
- Tests: `make test` 1 passed. `make web` 200 on /, `make engine` /health ok.
- Next: P1 design system.
