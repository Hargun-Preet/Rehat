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
- Cap: 10 top-up hours a year. Optional rider priced from the Site Match simulation (generated: see "Pricing" and "Site Match" in the section 5 block; assumptions in docs/model-cards/site-match.md).
- Kit prototype result (400 logs on 31 Oct 2025 curves): 0% honest flagged; 100% inflated and flat; 84% threshold-bunched; 77% pasted (reversed curve). Current engine result on 11 real days with harder fakes: generated "Site Match" block in section 5.

### Plans
| Plan | Benefit | Premium per worker (before GST) |
|---|---|---|
| Lite | S$5/h | generated: see "Pricing" in the section 5 block |
| Standard | S$8/h | generated: see "Pricing" in the section 5 block |
| Site Match rider | top-ups, 10 h/yr cap | generated: see "Pricing" (assumption until P8 simulation) |
Premium = expected insured hours x benefit / 0.65. GST 9% on top. Year-one launch credit 30%, applied before GST, printed on the premium line, ends 31 Dec 2027.

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
| Total market (premium) | generated (Pricing block) | in-scope workers x Standard premium |
| Income WIC book slice | generated (Pricing block) | 12% share (assumption) |
| Year-3 obtainable | generated premium; about 745 firms, 14,900 workers | 40% attach on Income book + 6,000 via associations |
| WIC cross-sell | S$0.9M to S$1.9M WIC premium from new firms | 1.5 to 3% of payroll (unsourced) |
| Employer's liability market 2025 | S$488M premium, S$94.4M underwriting profit (about 19%) | GIA |

### Unit economics, per worker, Standard
All values are generated by `python -m rehat.pricing` and shown in the generated block below (one version only).
| Item | Rule |
|---|---|
| Expected insured hours | Back-test expected insured hours + haze load (assumption, 1.0 h) |
| Premium | Expected insured hours x S$8 / 0.65 target loss ratio |
| Premium split | 65% claims, 12% variable expenses, 5% reinsurance and capital, 18% fixed cost and margin |
| Break-even | S$300k fixed cost (assumption) / (18% x premium of a 20-worker policy) |
| 20-worker firm | Premium, expected payout, 1-in-10, worst back-test year, worst capped (S$9,600), premium as share of labour bill (S$2,145 a worker a month, assumption), weather downtime cost (counted hours x S$10.20 idle-hour cost, assumption) |
Kit proxy values (10.46 h, S$128.70, S$2.48 a week, 647 policies) are reproduced by `engine/tests/test_pricing.py` from the kit inputs; they are superseded by the generated numbers.

### Worked month (May 2026, 20 workers, Bishan)
Heat counted 1.69 h vs allowance 1.25 -> 0.44 h. Rain 9.0 h vs allowance 6.25 -> 2.75 h. 3.19 h x S$8 x 20 = S$510, paid by the 5th working day of June (Mon 8 Jun 2026; 1 Jun is the Vesak Day holiday). (Heat from real sampled readings; rain and the normals 1.0 h and 5.0 h are assumptions for this example. Live receipts use station normals from the back-test.) Reproduced by `test_worked_month_may_2026_bishan_pays_510`.

### Reinsurance and capital (decided)
- Pilot (300 firms, 6,000 workers): Income retains all. Premium, expected claims, worst back-test year and hard cap (S$2.88M) are in the generated block.
- From year 2: aggregate stop-loss attaching at 150% annual loss ratio, up to the cap (decided; reconfirmed by the team on 2026-11-15). The back-test never reaches 150% in 26 years, so the layer is cheap protection against years worse than history (for example a severe haze year). A lower attachment inside the 5% budget was considered and not chosen.
- No quota share (gives away margin), no per-event cover (losses accrue over months). Capital under MAS RBC 2 set by Income's actuary; caps bound the maximum.

<!-- BEGIN GENERATED NUMBERS (python -m rehat.numbers; do not edit by hand) -->

Generated 2026-11-15T15:57 from engine outputs. Source files: data/processed/*.json.

**Back-test (2000 to 2025, demo book weighted, 1 worker, Standard)**

| Item | Value | Basis |
|---|---|---|
| Expected insured hours | 8.78 a worker a year | rules.py on NEA WBGT (observed) + corrected ERA5 rebuild, MSS daily rain, NEA PSI where pulled |
| Expected payout | S$70.3 a worker a year | insured hours x S$8 |
| 1-in-10 payout | S$128.8 a worker | 90th percentile of 26 book years; loss ratios at the current premium are under Pricing |
| Worst year | 2013: S$153.7 | |
| Zero-payout years | 0 of 26 (book); 1.15 for the average firm | |
| Months paying something | 46.1% | |
| Basis risk | 3.6% of window hours | named station below 31.5 C while a nearest neighbour is at 31.5+ (NEA observed) |
| Rain hours in window share | 0.616 | calibrated on 484 station-days where NEA 5-minute gauges and MSS daily records overlap |
| Changi rain days 10 mm+ | 61.4 a year (1983 to 2018) | MSS daily, matches proxy 61.4 |

**Pricing**

| Item | Value |
|---|---|
| Expected insured hours (pricing) | 9.78 a worker a year (back-test 8.78 h + haze load 1.0 h (assumption)) |
| Standard premium | S$120.37 a year, S$2.31 a week, before GST (S$131.20 with GST) |
| Lite premium | S$75.23 a year, S$1.45 a week, before GST |
| Site Match rider | S$88.13 a year, S$1.69 a week (Site Match simulation: honest uplift N(0.8, 0.5) C, files on 50% of eligible days, 10 h cap; expected top-up 7.16 h a worker a year) |
| Expected payout a worker | S$78.27 a year (loss ratio 65%) |
| 1-in-10 payout a worker | S$128.76 (107% loss ratio) |
| Worst back-test year | 2013: S$153.72 (128%); plus a 2015-like haze year 261% |
| Hard cap | S$480 a worker (399% loss ratio) |
| 20-worker firm | premium S$2,407 (S$2,624 with GST; S$1,837 with GST after 30% launch credit); expected payout S$1,565; worst capped S$9,600; premium 0.47% of labour bill; weather downtime costs about S$14,486 a year |
| Break-even | 692 policies of 20 workers at S$300k fixed cost; expense ratio 30% at break-even; 20% at 1,558 policies |
| Pilot (300 firms, 6,000 workers) | premium S$722,220; expected claims S$469,595; worst back-test year S$922,320; hard cap S$2,880,000 |
| Stop-loss (decided 150%) | attach 150%: expected recovery 0.0% of premium, cost 0.0% at 1.75x load, hit 0 of 26 years |
| Stop-loss (alternative considered) | lowest attachment inside the 5% budget would be 100% (cost 4.66%, hit 5 of 26 years). Team kept 150% (decision 2026-11-15). |
| Total market (premium) | S$22.3M (S$13.3M to S$31.5M); Income WIC slice S$2.7M; year-3 obtainable S$1.79M |

**Liquidity**

| Item | Value |
|---|---|
| Book (demo) | 300 firms, 4,774 outdoor workers |
| Next settlement | 2026-12-07 for 2026-11 (as of 2026-11-10): P50 S$2,912, P90 S$13,914, P99 S$22,031; buffer S$19,119 |
| Cash call for Oct 2025, as of 20 Oct | P50 S$314, P90 S$9,815, P99 S$14,938; buffer S$14,624; settles 2025-11-07 |
| Forecast validation (P90 coverage) | 87% of 174 month-forecasts (2022-01 to 2026-10, as of day 1, 10, 20); target about 90% |
| Forecast validation (P99 coverage) | 99% |

**Site Match**

| Item | Value |
|---|---|
| Simulated logs | 400 logs on 247 real station-days (11 days incl. 31 Oct 2025) |
| Honest logs flagged | 2% |
| Inflated logs caught | 100% |
| Flat logs caught | 100% |
| Threshold-bunched caught | 51% |
| Pasted-from-another-day caught | 67% |
| Fakes approved with a top-up | flat 0%, inflated 0%, pasted_day 23%, threshold 21% |
| rider_price_year | 88.13 |
| rider_basis | Site Match simulation: honest uplift N(0.8, 0.5) C, files on 50% of eligible days, 10 h cap; expected top-up 7.16 h a worker a year |
| Sample logs | 4 approved, 6 sent for review |

<!-- END GENERATED NUMBERS -->

## 6. Evidence and data

### Data already pulled (in /data/seed)
- `d1031.csv`: real NEA WBGT, 15-min, 15 stations, 31 Oct 2025, 08:00 to 17:30. Record day; peak 35.0°C Sentosa 12:15. Mandated rest per worker ranged 0 to 65 min by station; network mean 13 min.
- Proxy back-test on MSS Changi daily records 1983 to 2018 (third-party GitHub copy, chuachinhon/weather_singapore_cch): rain days >= 10 mm mean 61.4/yr (32 in 1997, 81 in 2013); correlation of above-normal rain and heat -0.31; bundling cuts year-to-year swing 41%; 0 of 36 years with zero payout; 55% of months pay something.
- Heat frequency sample: 33 days, Nov 2025 to Oct 2026: about 83 h/yr at WBGT 32+ per station, 16 h at 33+. Adjusted paid rest about 12 h/worker/yr (7 to 18.5). Sample year looks hot; Sentosa and Jurong Island drive much of it.

### Data sources to use
| Data | Source | Notes |
|---|---|---|
| WBGT 15-min | data.gov.sg v2 real-time API, `api=wbgt`, by `date`, paginate with `paginationToken` | From Feb 2025. 15 stations 2025, 31 by Nov 2026 (verified 2026-11-15). Dataset d_87884af1f85d702d4f74c6af13b4853d. Endpoints and shapes in docs/data-sources.md |
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
- Gap-filler, kit prototype (estimate a missing station from the other 14, afternoon of 31 Oct 2025): network median MAE 0.87°C, correct rest band 83%; median+offset 1.11°C, 79%; ridge 1.06°C, 81%. Engine retest on pulled history: docs/model-cards/gapfill.md (near the thresholds band agreement is about 57%). NOT good enough to pay on, so pending hours wait up to 48 h for a backup station, then a labelled estimate goes to human review.
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
Validation: back-test the month-end P90 against actual historical months (coverage rate should be about 90%); use archived forecasts so there is no hindsight. Result: see "Liquidity" in the section 5 generated block and docs/liquidity-validation.md.

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
- Colours sampled 2026-11-15 from income.com.sg `main.css` and stored in `web/src/styles/tokens.css`: `--income-orange: #F57100` (Income orange-500), `--income-orange-600: #E46A00` (buttons), `--income-orange-700: #B35300` (orange text on white), `--income-blue: #00467A` (Income blue-800), ink `#262727`. Ubuntu confirmed as Income's web font. Re-check with a colour picker before the final demo.
- Polished, calm, product-grade. Motion only where it explains (payout counting up, hours filling a meter). No neon, no heavy gradients.

## 13. Status
(Update every session.)
- [x] Repo scaffolded (P0, 2026-11-15)
- [x] Data ingest and cache (P2, 2026-11-15; full Feb 2025 to Nov 2026 pull of WBGT, PSI and rain still running in background)
- [x] WBGT rebuild and validation (P4, refreshed 2026-11-15 on 236 observed days; re-run as the pull completes)
- [x] Trigger engine and receipts (P3, 2026-11-15)
- [x] Back-test and robustness (P5, 2026-11-15; re-run when full WBGT and rain pulls finish)
- [x] Pricing and reinsurance (P6, 2026-11-15; stop-loss attachment needs a team decision)
- [x] Liquidity forecasting (P7, 2026-11-15)
- [x] Site Match AI (P8, 2026-11-15)
- [x] Design system and app shell (P1 done 2026-11-15: tokens, brand components, /styleguide)
- [x] Web: landing, employer portal, worker notices, live map, replay, back-test lab, insurer console, compliance (P10 to P12, 2026-11-15)
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

### 2026-11-15 14:27, P0 scaffold the monorepo
- Done: Copied the kit (AGENTS, CONTEXT, PLAN, PROMPTS, seed) from ~/Downloads/rehat-kit into the empty repo. Created `/engine` (pyproject, package `rehat` with module stubs, `ingest/`, FastAPI `/health`, `rehat.export`), `/web` (Next.js 15.5.4 App Router, TS strict, Tailwind 4.1.13, ESLint, shadcn init, Aceternity registry in components.json, recharts, leaflet, react-leaflet, framer-motion, lucide-react), `/data/{raw,processed,seed}`, `/docs/model-cards`, Makefile (setup, engine, web, test, export), `.env.example`, `.gitignore`, README.
- Files changed: AGENTS.md, CONTEXT.md, PLAN.md, PROMPTS.md, Makefile, README.md, .env.example, .gitignore, engine/**, web/**, data/seed/d1031.csv, engine/prototypes/ai_usecases.py.
- Numbers produced (with source): none.
- Decisions: Python 3.12 venv (3.11 not installed; pyproject requires >=3.11). Tailwind pinned to 4.1.13 because 4.3.5 pulls ESM-only magic-string 1.x that Node 20.17 cannot require. Gaps found while reading the kit are listed in the next entry's decisions as they get resolved: rain gauge assignment separate from WBGT station; haze "consecutive day" = working days with noon PSI > 100, tiers 101-200, 201-300, >300; premium rounding (10.46 x 8 / 0.65 = 128.74 vs 128.70 in section 4); rider S$0.50/wk = S$26/yr vs S$25; demo firm naming (Lim Landscaping vs Tanjong Greenworks).
- Broken or unverified: station ID to name map in ai_usecases.py unverified until P2 pulls metadata.
- Tests: `make test` 1 passed. `make web` 200 on /, `make engine` /health ok.
- Next: P1 design system.

### 2026-11-15 14:33, P1 design system that matches Income
- Done: Sampled Income's CSS variables from income.com.sg/assets/css/main.css (orange, blue, neutral scales; Ubuntu font-family). Wrote `web/src/styles/tokens.css`, mapped tokens into Tailwind theme and shadcn variables in `globals.css`. Loaded Ubuntu (500, 700) and Inter (400, 600) via next/font. Built `Ellipsis`, `AssumptionTag`, `StateBadge`, `Money`, `SourceNote`, `PrototypeFooter`, `PageHeader`, `AppShell` (text wordmark "Income Business (concept)", nav to every PLAN.md route, mobile menu below 1280px). Added shadcn tooltip, button, card, badge, tabs, slider, table, input, label, radio-group, checkbox, select, separator, switch, progress, dialog. `/styleguide` page.
- Files changed: web/src/styles/tokens.css, web/src/app/globals.css, web/src/app/layout.tsx, web/src/app/styleguide/page.tsx, web/src/components/brand/*, web/src/components/ui/*, CONTEXT.md section 12.
- Numbers produced (with source): brand hex values from income.com.sg main.css (see section 12).
- Decisions: Placeholder colours replaced with sampled ones. Orange text uses orange-700 for contrast; white text sits on orange-600 buttons. Light mode only. State colours: triggered orange, not triggered slate, pending amber with dashed border, plus approved green and review red for Site Match; every badge has a label and icon.
- Broken or unverified: Colours sampled from CSS, not a colour picker on rendered pages. Aceternity and 21st.dev components are not installed yet; they come in P10 to P12.
- Tests: `make test` 1 passed. tsc and eslint clean. /styleguide renders with footer.
- Next: P2 data ingest.

### 2026-11-15 14:45, P2 data ingest with caching
- Done: `rehat/ingest/` with `cache.py` (every response stored with URL, params, UTC fetch time; never refetched), `datagov.py` (WBGT, rainfall, air temperature, PSI by date, follows paginationToken, x-api-key from .env, backoff on 429/5xx), `normalise.py` (tidy parquet: wbgt_15min, rain_5min, temp_1min_or_5min, psi_hourly, station metadata JSON), `mss.py` (station code discovery S01 to S130, monthly CSVs), `openmeteo.py` (ERA5 archive with models=era5 and historical forecast, per 0.25 degree cell and year), `noaa.py` (ONI with enso_state), `coverage.py` (coverage table and seed check), CLI `python -m rehat.ingest`. Seed fixture loader. `docs/data-sources.md` with verified URLs and shapes, `docs/data-coverage.md`.
- Files changed: engine/rehat/ingest/*, engine/rehat/paths.py, engine/tests/test_ingest.py, docs/data-sources.md, docs/data-coverage.md, data/seed/stations_wbgt.json, stations_rain.json, psi_regions.json, data/raw/logs/run_ingest.sh.
- Numbers produced (with source): data.gov.sg API values for 31 Oct 2025 match d1031.csv for 15 of 15 stations, max diff 0.00 C. 31 WBGT stations by Nov 2026; 58 rain gauges; 5 PSI regions. 44 MSS station codes found. ONI to ASO 2026. ERA5 covers Singapore in 5 cells of 0.25 degrees.
- Decisions: Pull Sep to Nov 2025 first, then Feb 2025 to Nov 2026 newest first. ERA5 per grid cell (5 cells), not per station. MSS pulled directly from weather.gov.sg (Changi from 1980, 12 more stations from 2000) instead of the third-party GitHub copy. Air temperature only for sample days (58 pages a day).
- Broken or unverified: No DATA_GOV_SG_API_KEY: data.gov.sg rate-limits to about 4 WBGT days a minute and 30 s per rain day, so the full WBGT pull takes about 3 h and rain about 5 h. Both run in the background (data/raw/logs/). A key would help. ONI uses single-season thresholds, not NOAA's 5-season episode rule.
- Tests: `make test` 62 passed.
- Next: P3.

### 2026-11-15 14:46, P3 rules engine and ledger
- Done: `rules.py` pure functions with docstrings quoting section 4 (heat tiers, 3-of-4 hourly state, rain tiers and hourly state, haze tiers with 3rd-consecutive-day rule and 20 h limit, window and meal hour, fallback ladder, allowance, insured hours, caps, exclusions incl. MOM forfeit and 14-day wait, 5th-working-day settlement with SG public holidays, payout). `ledger.py` FirmMonthLedger (hourly lines with source and state, totals by peril, allowance, caps, payout, settlement date, plain-English receipt, "what did not count and why" incl. meal-hour heat, pending hours, allowance, caps, exclusions) and policy-year chaining. `stations.py` (nearest primary, backup, rain gauge, PSI region, reason text). `normals.py` with interim normals (assumption) in data/seed/normals_interim.json. `seedgen.py` writes 300 fictional firms to data/seed/firms.json. API `GET /stations`, `GET /ledger/{uen}/{month}`, `GET /receipt/{uen}/{month}`.
- Files changed: engine/rehat/{rules,ledger,stations,store,normals,seedgen,api}.py, engine/tests/{test_rules,test_ledger,test_smoke}.py, data/seed/{firms.json,normals_interim.json}.
- Numbers produced (with source): worked month reproduces S$510 (3.19 h x S$8 x 20). Demo book: 300 firms, 4,774 outdoor workers, 172 Standard, 92 Lite, 36 Standard with Site Match (rng seed 7). Tanjong Greenworks (T99DM0001B) at Jurong West: primary S132, backup S180, rain gauge S228, west PSI. Lim Landscaping (T99DM0002C) at Bishan: S128, S145, S216, central.
- Decisions: (1) Tier comparisons use the unrounded hourly mean (31.99 is 5 min). (2) Rain hour needs 9 of 12 five-minute totals, else PENDING, unless the partial sum already reaches 10 mm (top tier certain). (3) Haze: consecutive = calendar days with noon PSI above 100; hours paid only Mon to Sat; tiers 101 to 200, 201 to 300, above 300 (300 is in the middle tier); a missing day makes a dependent 3rd day PENDING. (4) Fallback ladder: primary, backup, regional median (stations in the same PSI region), then after 14 days the regional advisory level; a model estimate after 48 h is proposed for review and never pays alone. (5) Rain read at the nearest rain gauge, named on the schedule; backup is the second nearest gauge. (6) Payout rounded to the nearest dollar. (7) Fictional UENs use prefix T99DM. (8) Interim normals tagged as assumptions until P5.
- Broken or unverified: SG public holidays for 2025 to 2027 typed from memory (unverified; check MOM list). Oct 2025 receipt shows rain and haze PENDING until those pulls finish.
- Tests: `make test` 62 passed.
- Next: P4 WBGT rebuild.

### 2026-11-15 15:05, P4 WBGT rebuild and validation (pipeline done, numbers provisional)
- Done: `rehat/liljegren.py` (Liljegren 2008 Tg, Tnwb, WBGT in numpy, solar zenith, 10 m to 2 m wind). `rehat/wbgt_rebuild.py` (rebuild per ERA5 cell 2000 onward, observed hourly means with 3 of 4 rule, bias correction per station x month plus hour-of-day fitted on training only, last 3 months held out, metrics incl. band agreement and confusion matrix, `wbgt_hourly_rebuilt.parquet` with observed flag, `web/public/data/wbgt_validation.json`, `docs/wbgt-validation.md`). Model card `docs/model-cards/wbgt-rebuild.md`.
- Files changed: engine/rehat/liljegren.py, engine/rehat/wbgt_rebuild.py, engine/pyproject.toml (pandas pinned <3), docs/model-cards/wbgt-rebuild.md, docs/wbgt-validation.md.
- Numbers produced (with source): dry run only, on the data pulled so far (train Sep to Nov 2025, test 3 to 9 Nov 2026): corrected MAE 1.76 C, band agreement 0.76, band agreement when observed is 31 to 34 C 0.28. These are NOT final. Re-run when the full Feb 2025 to Nov 2026 pull finishes.
- Decisions: pywbgt 3.0.7 crashes (segfault in its compiled solar routine on macOS arm64 with numpy 2.2 and 2.5; also casts DatetimeIndex to float, which fails on current pandas), so Liljegren is re-implemented with references. Additive correction (explainable) rather than quantile mapping.
- Broken or unverified: Final validation numbers pending full data. Raw rebuild runs about 2 C warm before noon.
- Tests: `make test` 62 passed.
- Next: P5 back-test.

### 2026-11-15 14:57, P5 product back-test and robustness
- Done: `rehat/backtest.py`: exact rules on 2000 to 2025 per station and per demo-book station group (300 firms, nearest/second/median-of-three stations); heat from `wbgt_hourly_rebuilt.parquet` (observed where NEA has it); rain from MSS daily via an hours estimator; haze from NEA PSI where pulled; normals per station x calendar month (2000 to 2024) written to `data/processed/normals.json` (the ledger now uses them instead of interim assumptions); tornado (near-miss, thresholds +0.5, allowance 1.0/1.5, station rule, +/-0.5 C error, haze day 2); basis risk on observed NEA hours; MSS Changi 1983 to 2018 long view; slider grid (810 cells) in `web/public/data/backtest_grid.json`; `docs/backtest.md`. `rehat/numbers.py` writes the generated numbers block in section 5 and `web/public/data/numbers.json`. WBGT rebuild now falls back to the ERA5 cell's correction for stations with no training data.
- Files changed: engine/rehat/{backtest,numbers,wbgt_rebuild}.py, engine/tests/test_backtest.py, docs/backtest.md, CONTEXT.md section 5 (generated block).
- Numbers produced (with source): see the generated block in section 5. Base: 8.83 insured h a worker a year, S$70.7 expected payout, mean LR 55% and 1-in-10 LR 106% at S$128.70, worst year 2013 (S$163.1), 0 of 26 zero-payout book years (0.58 for the average firm), 49.3% of months pay, basis risk 3.51%. Changi rain days 10 mm+ 61.4 a year 1983 to 2018 (matches the proxy exactly). Biggest sensitivities: allowance multiple (x1.0: S$119.8, x1.5: S$41.0) and +/-0.5 C reading error (S$79.6 / S$63.9).
- Decisions: (1) Rain hours from MSS daily: wettest hour by tier + 0.5 h per further 5 mm (max 3), times a window share (0.55 assumption until 5-minute gauges are calibrated). (2) MSS publishes highest 60-min rain only from 2020: earlier days impute it as total x median ratio by size of day (0.86 small days down to 0.45 above 80 mm). (3) Haze only where PSI was pulled; pre-2025 haze years are missing, so the back-test understates haze. (4) Book weights = demo-book outdoor workers. (5) Section 5 proxy unit economics are rewritten in P6 from these outputs.
- Broken or unverified: Provisional until the full WBGT pull (bias correction now fitted on about 3 months) and the rain pull (window-share calibration) finish; then re-run `python -m rehat.wbgt_rebuild`, `python -m rehat.backtest`, `python -m rehat.numbers`.
- Tests: `make test` 74 passed.
- Next: P6 pricing.

### 2026-11-15 15:08, P6 pricing, unit economics, reinsurance
- Done: `rehat/pricing.py`: plan prices per worker per year, month, week and working day, before and after GST and launch credit; `quote()` using only plan, benefit and headcount; 20-worker firm sheet; expense model (break-even, expense-ratio curve, 20% point); stop-loss table at 100/110/125/150/175% with cost at 1.75x load; pilot view; market sizing with low/mid/high; assumptions list with bases. `docs/pricing.md`, `web/public/data/pricing.json`. API `POST /quote`, `GET /backtest`, `GET /reinsurance?attach=`. Tests reproduce the kit's section 5 numbers from kit inputs (S$128.70, S$2.48/wk, Lite S$80 and S$1.55/wk, S$2,575 and S$2,806 firm premium, 647 break-even, 30% and 1,456, S$23.9M, S$2.9M, S$1.92M).
- Files changed: engine/rehat/{pricing,api,numbers}.py, engine/tests/{test_pricing,test_smoke}.py, docs/pricing.md, CONTEXT.md sections 4 and 5 (hand-written prices replaced by the generated block), PLAN.md demo step 7.
- Numbers produced (with source): fed P5 outputs: pricing hours 9.83 (8.83 back-test + 1.0 haze load, assumption); Standard S$120.98 a year, S$2.33 a week before GST (S$131.87 with GST); Lite S$75.62, S$1.45 a week; expected LR 65%, 1-in-10 113%, worst back-test year 2013 135%, 2015-like haze stress 267%, cap 397%; 20-worker firm S$2,420 (S$2,637 with GST); break-even 689 policies, 20% expense ratio at 1,550; pilot premium S$725,880, expected claims S$472,043; market S$22.4M mid. What changed: premium S$128.70 -> S$120.98 because back-test hours (8.83 + 1.0 haze) are lower than the proxy (10.46).
- Decisions: Launch credit applied before GST. Haze load 1.0 h added explicitly (assumption) because the back-test has no pre-2025 PSI. Stop-loss kept at the decided 150%.
- Broken or unverified: OPEN DECISION for the team: the decided 150% stop-loss is never reached in the 26 back-test years; "lowest attachment inside the 5% budget" now suggests 110% (cost 3.4%, hit 3 of 26 years). Numbers are provisional until the full data re-run.
- Tests: `make test` 82 passed.
- Next: P7 liquidity.

### 2026-11-15 15:16, P7 liquidity forecasting for Income
- Done: `rehat/liquidity.py`: daily counted hours per station group for the demo book; accrual ("insured if the month ended today"); month-end Monte Carlo (2,000 paths, one historical year per path for all stations, next 3 days from archived Open-Meteo forecast via Liljegren + station bias); settlement P10/P50/P90/P99 and buffer; fan series for the last complete month and the current month; season view by ONI state; annual view with stop-loss and hard cap; validation for every month Jan 2022 to Oct 2026 as of day 1, 10, 20; employer and worker alerts from the forecast. `GET /liquidity?asof=`. `docs/liquidity-validation.md`, model card.
- Files changed: engine/rehat/{liquidity,api}.py, engine/tests/test_liquidity.py, docs/liquidity-validation.md, docs/model-cards/liquidity-forecast.md, CONTEXT.md section 9 and generated block.
- Numbers produced (with source): P90 coverage 87% of 174 month-forecasts (P99 98%), target about 90%. As of 20 Oct 2025, Oct 2025 cash call P50 S$413, P90 S$10,832, P99 S$20,789 (settles 7 Nov 2025; actual S$0). Next settlement Mon 7 Dec 2026 for Nov 2026 (as of 10 Nov): P50 S$1,026, P90 S$14,588, P99 S$22,287. Oct 2026 actual book payout S$39,214 (fan chart month). Demo book 300 firms, 4,774 workers, premium S$513,102, hard cap S$2,035,740. Season: annual LR mean El Nino 41%, neutral 58%, La Nina 80% (years 2000 to 2025, Aug to Oct ONI).
- Decisions: Book = demo book. Policy year = calendar year for year-to-date caps in the forecast. The PLAN "cash needed on 5 Dec" becomes 7 Dec 2026 (5 Dec is a Saturday). Alerts use raw rebuild 32.5 C as a 32 C stand-in (assumption).
- Broken or unverified: Actuals before Feb 2025 are rebuilt, not observed. Historical forecast days 2 to 3 are optimistic. Haze not forecast.
- Tests: `make test` 85 passed.
- Next: P8 Site Match.

### 2026-11-15 15:30, P8 Site Match AI (hybrid claim)
- Done: `rehat/sitematch.py`: CSV parser (HH:MM or timestamps), checks with codes and plain-English reasons (TIMESTAMPS, ADDRESS, COVERAGE, UPLIFT, SHAPE, NOT_FLAT, NOT_BUNCHED, plus added SAME_DAY), APPROVED top-up (extra rest minutes over station, meal hour excluded, 10 h a year cap) or REVIEW; never REJECTED; review queue with human approve/decline and audit; optional vision stub (off without key); 10 sample logs in `data/seed/site_logs/` (4 honest, 2 inflated, flat, threshold, pasted, wrong-day); evaluation on 31 Oct 2025 + 10 hottest complete days with a "fakes approved with a top-up" metric; rider pricing from simulated honest uptake. API `POST /sitematch/check`, `GET /sitematch/queue`, `POST /sitematch/decide`. Model card.
- Files changed: engine/rehat/{sitematch,api}.py, engine/tests/test_sitematch.py, data/seed/site_logs/*, docs/model-cards/site-match.md, CONTEXT.md section 4 and generated block.
- Numbers produced (with source): 400 simulated logs on 163 station-days: honest flagged 2%; inflated 100%, flat 100%, threshold 54%, pasted 60% caught; fakes approved with a top-up: threshold 16%, pasted 28%. Samples: 4 approved, 6 review. Rider: 7.21 h a worker a year -> S$88.76 a year, S$1.71 a week (was S$0.50 a week placeholder).
- Decisions: Added two checks (bunching among readings at 31.5+, same-day hour-to-hour correlation) because the harder fakes slipped past the kit rules; both keep honest flags at about 2%. Pasted fakes now use a real other-day curve.
- Broken or unverified: Rider price rests on two assumptions (uplift N(0.8, 0.5) C, 50% filing) and is 3.4x the old placeholder; test on real contractor logs before pricing. Vision extraction not wired.
- Tests: `make test` 99 passed.
- Next: P9 other AI.

### 2026-11-15 15:40, P9 other AI: explainer, gap-fill, station suggestion, declaration anomalies
- Done: `rehat/explain.py` (templates in en, ms, zh, ta, bn, my; optional LLM rephrase with number lock: any changed, dropped or added number returns the template; "why wasn't I paid" from the receipt; worker notice in six languages, flagged for native-speaker review). `rehat/gapfill.py` (median, median+offset, ridge; leave-one-station-out validation; `propose()` returns PENDING with a labelled model estimate after 48 h). `stations.suggest_station()` (three nearest, correlation with local ERA5 rebuild, reason, human approves, no correction factor). `rehat/anomaly.py` (rules + isolation forest, seeded anomalies, flag only). API `GET /explain/{uen}/{month}?lang=`, `GET /compliance`. Model cards: explainer, gapfill, station-suggestion, declaration-anomaly.
- Files changed: engine/rehat/{explain,gapfill,anomaly,stations,api}.py, engine/tests/test_explain.py, docs/model-cards/*.md, CONTEXT.md section 6.
- Numbers produced (with source): gap-fill (test from 2025-10-31, 15 stations): ridge MAE 0.501 C, band agreement 95% overall but 57% when observed is 31 to 34 C; median MAE 0.688 C. Anomalies: 8 seeded, 12 flagged, precision 67%, recall 100%.
- Decisions: LLM provider stays OpenAI as in AGENTS.md (optional, off without key); model name configurable and unverified. Number lock compares the multiset of numbers, so the LLM may not drop "25%" either. Firm size, activity code and paid-up capital for the anomaly test are fictional stand-ins for ACRA.
- Broken or unverified: Translations are drafts (Bengali, Tamil, Burmese, Mandarin, Malay) for native-speaker review. Vision log reading not wired.
- Tests: `make test` 112 passed (explainer refuses changed, dropped and added numbers).
- Next: P10 web landing, Income hub, onboarding.

### 2026-11-15 16:05, P10 web: landing, Income hub, onboarding
- Done: `rehat/export.py` (`make export`) writes 58 JSON files to `web/public/data` (stations, receipts with six-language explanations for Tanjong Greenworks and Lim Landscaping for every month Mar 2025 to Oct 2026, 31 Oct replay, live snapshot, worker notices, onboarding, book, fairness, numbers). Aceternity Spotlight, Bento Grid, Timeline, Multi Step Loader and File Upload installed from the registry and restyled to tokens (no default demo colours). Pages: `/` (Spotlight hero, key numbers with tags, why the law created the loss, Bento of four pillars, Timeline "A month with Rehat", may-not-pay sentence), `/income` (mock Income Business account: WIC active and renewing, SmartBiz 360, highlighted Rehat offer priced for the firm, roadmap cards marked concept), `/onboard` (UEN, mock Corppass/ACRA/WIC loader, headcount locked to WIC, site map with named, backup and rain stations and reason, plan choice with price per worker per week and total before and after GST and launch credit, Site Match rider, may-not-pay sentence verbatim with acknowledgement, teach-back with explanation if wrong, PDPA field list and consent, policy schedule with named stations and SMS). Shared Leaflet `StationMap` (OpenStreetMap tiles, desaturated; markers still render offline).
- Files changed: engine/rehat/export.py, web/src/app/{page,income/page,onboard/*}.tsx, web/src/components/rehat/*, web/src/components/ui/{spotlight-new,bento-grid,timeline,multi-step-loader,file-upload}.tsx, web/src/lib/*, web/src/app/globals.css.
- Numbers produced (with source): none new; all from engine JSON.
- Decisions: CARTO tiles now need an API key, so OpenStreetMap tiles are used. 21st.dev components were not installed (their install commands are per component page); equivalent cards, stepper and quote blocks are built with shadcn and tokens. Teach-back answer is recorded in page state for the demo (no backend write).
- Broken or unverified: Onboarding automated run: 17 s end to end; a human reading each step should finish in under 60 s (not timed with a person yet).
- Tests: `make test` 112 passed. tsc clean; no console errors on /onboard.
- Next: P11 live map, replay, receipt, Site Match, worker.

### 2026-11-15 16:20, P11 web: live map, replay, receipt, Site Match, worker
- Done: `/live` (Leaflet map and table of every WBGT station with hourly state badges for the snapshot day, hour picker, PSI chips by region with bands, source per station, live/offline toggle: live calls the engine `GET /live`, which pulls today from data.gov.sg and logs each response to data/raw/live/; any failure falls back to the snapshot with a message). `/replay` (31 Oct 2025, 39 readings, play/pause/scrub, 15 station cards with current reading tiers and rest meters on completed hourly means, meal hour struck through, Tanjong Greenworks day total and S$ count-up, end card linking the day to the October receipt honestly). `/employer/receipt` (firm and month pickers, payout and settlement date, peril cards with normal, allowance and insured hours and assumption/station-normal tags, caps line, pending notice, hour-by-hour heatmap for heat and rain with tooltips, what did not count and why, FIDReC link, "Ask about this receipt" in six languages with locked numbers). `/employer/site-match` (Aceternity File Upload or 10 sample logs, extracted table to confirm, checks revealed line by line, APPROVED top-up or REVIEW with reason chips, hour-by-hour site vs station, evaluation panel). `/worker` (phone mockup, notice in Bengali, Tamil, Mandarin, Burmese, Malay and English, review badge, demo QR pattern labelled not scannable, no personal data).
- Files changed: web/src/app/{live,replay,employer/receipt,employer/site-match,worker}/*, engine/rehat/api.py (GET /live), web/package.json (framer-motion removed; motion/react used everywhere).
- Numbers produced (with source): replay: Jurong West rest owed on 31 Oct 2025 = 35 min a worker excluding the meal hour, S$93.33 of wages across 20 workers at S$8; network mean 12 min (CONTEXT section 6 says 13 including the meal hour).
- Decisions: Replay title says "a record heat-stress day", not "hottest day on record". Uploaded CSVs that are not samples need the engine; offline the page says so. framer-motion 12 clashed with motion 14 (from Aceternity), so all motion imports use motion/react.
- Broken or unverified: Live mode returned no stations during the background pull (rate limit); fallback works. Receipts show rain PENDING until 5-minute rain is pulled.
- Tests: `make test` passed; all five pages 200 and render from /data.
- Next: P12 back-test lab, insurer console, compliance.

### 2026-11-15 16:40, P12 web: back-test lab, insurer console, compliance
- Done: `/backtest` (sliders for threshold shift, reading error, near-miss tier, allowance multiple, benefit, monthly and yearly caps, station rule, all reading the precomputed 810-cell grid so they are instant; headline cards; payout by year with 65% line; loss-ratio histogram; tornado; basis risk by station; WBGT rebuild vs NEA scatter near the threshold; loss ratios at the current premium for the chosen benefit). `/insurer` (top row readable in 10 seconds: cash needed on the 5th working day with P50/P90/P99 and buffer, and the stop-loss decision with the open question flagged; KPIs: book, year-to-date paid and loss ratio, P90 coverage, hard cap; fan chart for the last complete month with actual line, and for the current month to date; annual loss ratio by back-test year with stop-loss and target lines and the stop-loss table; season tabs El Nino / neutral / La Nina; Site Match review queue with approve/decline, reason and audit log (posts to the engine when it is running); fairness panel with price inputs, never-used inputs and expected insured hours by region and firm size; declaration flags). `/compliance` (21 rows: brief must-haves, every CONTEXT section 7 row, plus pending-data and forecast rules, each with source, what Rehat does, screen links and code rule; also served by `GET /compliance`).
- Files changed: web/src/app/{backtest,insurer,compliance}/*, engine/rehat/export.py (compliance, fairness), engine/rehat/sitematch.py (claim id now includes a 4-character hash of the log so ids are unique).
- Numbers produced (with source): year-to-date 2026 book payout and loss ratio shown from liquidity.json (computed in the browser from recent_months / book premium).
- Decisions: Fairness shows payout rates by region and size from back-test station results (same price everywhere). Reviewer decisions are kept on the page offline and posted to the engine when live.
- Broken or unverified: Recharts animates on mount; screenshots taken too early look empty (charts verified in the DOM).
- Tests: `make test` passed. All pages 200.
- Next: P13 polish, offline hardening, pitch mode.

### 2026-11-15 17:00, P13 polish, offline hardening, pitch mode
- Done: `make export` now runs the whole chain from cached data (normalise, WBGT rebuild, back-test, Site Match, pricing, liquidity, gap-fill, anomalies, export) with no network; `make export-fast` rewrites web JSON only; `make demo` builds and serves the production app. App-wide `loading.tsx` (three-dot Ellipsis), `error.tsx` (explains when data was not exported), `not-found.tsx`. Contrast: white text on orange moved to orange-700 (#B35300, 5.1:1; orange-600 was 3.3:1, orange-500 2.9:1); triggered-state text to #B35300. `/pitch`: full-screen guided mode over PLAN.md section 8 (8 steps, arrow keys, F for full screen, Esc to leave), each step loads the live page in a frame with a deep link (`/replay?autoplay=1`, `/employer/site-match?log=...` honest and faked), talking points and one key number from the engine JSON; prototype footer inside the overlay. `next.config.ts` pins file tracing to /web.
- Files changed: Makefile, web/src/app/{loading,error,not-found}.tsx, web/src/app/pitch/*, web/src/app/replay/Replay.tsx, web/src/app/employer/site-match/SiteMatch.tsx, web/src/styles/tokens.css, web/src/app/globals.css, web/next.config.ts.
- Numbers produced (with source): production build: 17 routes, all prerendered static; first load JS 102 to 272 kB; local TTFB 43 ms, DOM ready 71 ms on /. No requests leave localhost on any page except map tiles (OpenStreetMap), which degrade to markers on a plain background offline.
- Decisions: Pages are static at build time, so after `make export` run `make demo` (or the dev server) to pick up new numbers. Every number on screen is read from the same engine JSON that writes the CONTEXT.md section 5 block, so screen and CONTEXT cannot drift; the landing page's S$510 is the CONTEXT worked month.
- Broken or unverified: Not tested with Wi-Fi physically off (verified by request inspection only). ESLint warnings remain inside two vendored Aceternity files (unused import, expression statement).
- Tests: `make test` passed; `npm run build` passed.
- Next: P14 judge pack; then re-run `make export` when the WBGT and rain pulls finish.

### 2026-11-15 17:10, P14 docs and judge pack
- Done: `rehat/judgepack.py` writes `docs/judge-pack.md` from the engine outputs (eight strong-outcome items with numbers and screen links, must-haves, legal map, model-card index, limits stated plainly, what the pilot must prove, ten hardest questions with answers). Added to `make export` so it regenerates with every data refresh. Scanned UI copy and docs: no em dashes, no hype words.
- Files changed: engine/rehat/judgepack.py, docs/judge-pack.md, Makefile.
- Numbers produced (with source): none new; all read from data/processed/*.json.
- Decisions: Judge pack is generated, not hand-written, so it cannot drift from the app. One-page PDF not made (time); the markdown renders cleanly.
- Broken or unverified: Demo script not rehearsed with people.
- Tests: `make test` passed.
- Next: Re-run `make export` on the larger WBGT pull; keep the rain pull running for the window-share calibration.

### 2026-11-15 17:45, data refresh on the larger WBGT pull
- Done: WBGT now pulled for every 4th day Feb 2025 to Nov 2026 plus all of Sep to Nov 2025 (the full pull continues in the background). Re-ran `make export` end to end. Added quantile mapping to the WBGT correction (decided before looking at the test set, fitted on training only) because the additive correction matched the mean but caught only 23% of observed trigger hours. Liquidity buffer now computed from the shown P99 and P50, so the subtraction always matches. Rain-share calibration now needs 300 overlapping station-days (10 days of October would have set it from one season).
- Files changed: engine/rehat/{wbgt_rebuild,backtest,liquidity}.py, docs/*.md, web/public/data/*, CONTEXT.md generated block, docs/judge-pack.md.
- Numbers produced (with source): WBGT rebuild held-out (train 2025-02-01 to 2026-08-07, test 2026-08-11 to 2026-11-09, 9,968 station-hours): raw MAE 1.618 C, bias 1.431; corrected MAE 1.124 C, bias 0.378, band agreement 89% overall and 48% when NEA reads 31 to 34 C; trigger hit rate 30%, false trigger rate 7%. Plainly: the rebuild is poor at hour-level timing near the threshold; it is used for frequencies only, never payouts. Back-test: 8.04 insured h a worker a year, 0 of 26 zero-payout years, 46.1% of months pay. Pricing: Standard S$111.26 a year, S$2.14 a week before GST. Forecast P90 coverage 87%. All other values in the section 5 generated block (single version).
- Decisions: Keep quantile mapping (committed in advance; hit rate 23% -> 30%, false triggers 5.7% -> 7.1%, band agreement near threshold about the same).
- Broken or unverified: Rain 5-minute pull still running (Oct 2025 first), so the rain window share is still the 0.55 assumption and demo receipts still show rain PENDING. PSI pull about 40% done. Re-run `make export` then `make demo` when they finish.
- Tests: `make test` 112 passed; production build passed.
- Next: let the background pulls finish, re-run `make export`, rehearse the demo script.

### 2026-11-15 18:00, decision: keep the 150% stop-loss
- Done: Team confirmed the aggregate stop-loss stays at 150% annual loss ratio from year 2, up to the cap. Removed the "decision needed" flags from the insurer console, pricing headline, judge pack and section 5; the cheaper alternative inside the 5% budget is shown as "considered, not chosen".
- Files changed: engine/rehat/{pricing,judgepack}.py, web/src/app/insurer/Console.tsx, CONTEXT.md section 5 and generated block, docs/pricing.md, docs/judge-pack.md, web/public/data/*.
- Numbers produced (with source): unchanged. 150% layer: 0 of 26 back-test years reached, expected recovery 0.0% of premium. Alternative: 100% attachment, cost 4.52% at 1.75x load, hit 4 of 26 years (pricing.json).
- Decisions: 150% kept as cheap protection against years worse than history (for example a severe haze year, which the back-test lacks). Supersedes the open decision in the P6 entry.
- Broken or unverified: none new. Background pulls still running.
- Tests: `make test` 112 passed; production build passed.
- Next: re-run `make export` and `make demo` when the pulls finish; rehearse the demo.

### 2026-11-15 16:10, status check and refresh commit
- Done: Found a full `make export` that ran at 15:56 (not started in this session) on the larger WBGT pull (stride-2 job adding days). Checked that data/processed, web/public/data, the section 5 generated block and docs/judge-pack.md all agree, then committed it. All 13 routes return 200, engine /health ok, background pulls running (WBGT stride 2, PSI about half done, rain queued behind WBGT).
- Numbers produced (with source): generated block is the single version; Standard now S$120.37 a year, S$2.31 a week before GST. Earlier worklog entries quoting 8.04 h and S$111.26 are history.
- Tests: `make test` 112 passed.
- Next: UEN lookup (see next entry).

### 2026-11-15 16:20, UEN check against ACRA's public register
- Done: `rehat/uen.py`: shape check (business 8 digits + letter; local company 4-digit year + 5 digits + letter; other entities T/S/R + year + 2 letters + 4 digits + letter), then exact lookup on ACRA's "Entities Registered with ACRA" dataset on data.gov.sg, cached per UEN in data/raw/acra/. Fictional T99DM UENs are never sent; network failure returns "offline", never an error. `GET /uen/{uen}`. Onboarding: invalid UEN is stopped with a plain message; otherwise the record (name, type, status, issue date, source, date checked) is shown above the WIC details, with a note that the prototype continues with the fictional firm's WIC policy; offline shows "ACRA check offline". Compliance map row and docs/data-sources.md updated.
- Files changed: engine/rehat/{uen,api,export}.py, engine/tests/test_uen.py, web/src/app/onboard/Onboard.tsx, docs/data-sources.md, web/public/data/compliance.json.
- Numbers produced (with source): none.
- Decisions: Check letter not validated (ACRA does not publish the algorithm; only third-party versions exist). Real company names are shown only as the register returns them and are never used as demo data, so the fictional-firms rule holds. Production route remains Corppass sign-in plus Myinfo Business (needs GovTech onboarding).
- Broken or unverified: The ACRA dataset is a monthly snapshot, so a company registered this month may show as not found.
- Tests: `make test` 126 passed (14 new UEN tests); production build passed.
- Next: unchanged.
