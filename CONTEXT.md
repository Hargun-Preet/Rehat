# CONTEXT.md: Rehat, version 2

Read this whole file at the start of every coding session. Update section 13 (Status) and section 15 (Worklog) at the end of every session. This file is the single source of truth. If code and this file disagree, raise it in the worklog and fix one of them.

Version 2, written Sun 15 Nov 2026, 21:30 SGT. It replaces the first CONTEXT.md. Sections 1 to 15 keep their old numbers so existing habits still work. Sections 16 to 19 are new. Section 16 lists every decision that changed. Read it first if you knew version 1.

The repo already exists. This version is about making the product cohesive, correct and easy to use, not about building from zero.

---

## 1. One-paragraph summary

Rehat is weather downtime cover for small Singapore firms with outdoor crews (construction subcontractors, landscapers, outdoor cleaners). It is one tick box on the Work Injury Compensation (WIC) policy these employers must already buy, which Income Insurance sells. MOM requires rest breaks for heavy work in high heat, and work permit holders must be paid their declared salary even when there is no work, so heat, heavy rain and haze cost the employer money without damaging anything. No insurance in Singapore covers this today. Rehat reads public NEA data (heat stress WBGT, rainfall, 24-hour PSI) every hour at a station named on the policy, counts downtime hours, and when a month runs worse than that station's normal, pays S$8 per outdoor worker for each extra hour, automatically, before payroll. No claim form. The firm chooses its deductible. Every policy includes a free hourly heat alert and a compliance log. Forecasting tells Income how much cash each monthly payout run needs.

Name: Rehat is Malay for "rest"; close to Hindi "raahat", relief. Team: Chai-Kopi.

Lines to use verbatim:
- Tagline: "Rest that is paid for gets taken."
- Hook: "At a heat reading of 32, a contractor pays for 60 minutes and gets 50."
- The human line: "A normal month is part of the job. A hard month, we carry with you."
- Do not use the old line "We don't insure the summer. We insure the bad month."

## 2. The launch brief

- Product brief: FinTech/InsurTech, prepared with Income Insurance Limited. The presentation is five minutes, then questions.
- Income's challenge question: "How might we reimagine insurance, powered by data and AI, so that climate risk protection becomes affordable, accessible and actionable for every vulnerable household and SME in Singapore?"
- Income's open question (SmartBiz 360 case study): extend a simple, low-cost package to cover climate-related income loss for SMEs (heat, haze, flash floods), using public data and AI to price and trigger, while keeping premiums affordable.
- The brief calls for a product that can be tested in a real workflow, not just code.

### What the review panel scores
1. Product and experience design
2. Target group
3. Simple pricing logic and unit economics
4. Clear claim parameters and exclusions
5. Expected impact on financial protection and affordability
6. Market competitiveness
7. Distribution proposal
8. How AI/data is integrated

### Must-haves
- Offered by or with Income as the licensed insurer.
- Triggers and pricing inputs use independent, verifiable data.
- Target user understands what they pay for and when they get paid in under a minute.
- Collect only the personal data needed; any AI decision must be explainable.
- No new hardware for the core product.
- Brief also says: expenses should sit within about 20% of premium. We budget exactly that (section 5).

### Out of scope
Large corporates and industrial risks; reinsurance or cat bonds as the solution (budgeting for reinsurance is in scope); national infrastructure; climate ideas with no insurance element; hardware or sensors as the core; crypto or tokens; anything needing a change in the law.

### Review panel to design for
Income: Chief Customer Officer, Chief Data Officer, Chief Sustainability Officer. Others include a former SEBI chair, Tata, Microsoft, Singtel and SMU faculty.
- CCO hears: one tick box, no claim form, money before payday, sold at a renewal the customer already does, a free compliance log.
- CDO hears: deterministic payout on NEA data, fallback ladder, missing data never read as zero, AI kept in the interface and auditable, back-test and forecast validation.
- CSO hears: makes MOM's rest rule cheaper to obey, worker notices in their language, normals reset yearly against the climate.
- Finance hears: 65 / 20 / 5 / 10, profitable from the pilot year, worst case capped in the contract.

## 3. Why this user group (and not others)

Chosen: small and medium firms with outdoor manual crews.
1. The payer and channel already exist. WIC insurance is compulsory for all manual workers and non-manual staff earning S$2,600 or less a month; Income sells it. Earlier schemes died on "nobody would carry the premium" or on distribution (KB Insurance, Korea: zero subscribers).
2. The trigger is already in the rules. MOM: at WBGT 32°C or more, heavy physical work needs an hourly rest break of at least 10 minutes. This is mandatory. MOM's framework also lists at least 15 minutes at 33°C or more; two compliance guides say that figure is recommended, not required, and we have not confirmed it on MOM's FAQ page. Every employer must monitor WBGT hourly. On-site WBGT meters are mandatory only for construction sites with contract sum S$5M or more, shipyards and process plants; other workplaces use NEA's myENV app.
3. The loss is a formula: rest minutes x outdoor headcount x hourly cost. Headcount and wages are already declared for WIC, so there is nothing new to lie about.
4. It is business interruption without physical damage: Income's own open question.
5. Heat is the hook, rain is the bulk. About two-thirds of normal downtime hours in our model are heavy rain (40 of 59), and no boss can order the rain to stop.

### Wording rules (the team got these wrong in front of three mentors)
- Never say "work must stop at 33". MOM requires rest breaks. Work continues.
- Never say "the employer pays one-fourth of the wage". Say: the firm pays for 60 minutes and gets 50.
- Say "heat reading (WBGT)" on first use, then "heat reading". Never "WGTT" or "bulbs".
- Say "ten minutes of rest an hour at 32 is mandatory, and MOM's framework sets fifteen at 33."
- Never claim haze stops work by law. MOM's haze guidance is advisory.
- Count employers, not workers, when talking market size.

Rejected groups, with reasons (say these if asked):
| Group | Why not |
|---|---|
| Hawkers | Centres are roofed, so rain is weak; haze under a 3-day rule pays rarely. Roadmap via Stallholder Insurance. |
| Delivery riders | Rain raises surge pay, so the loss is unclear; no payer without a platform deal. Roadmap via platform WIC. |
| Taxi and private-hire drivers | Air-conditioned; rain raises demand. |
| Lower-income households | Weak income link; home insurance covers flood. |
| Large contractors | Out of scope in the brief. Shown only as "later" in market sizing. |

## 4. Product specification

| Term | Value |
|---|---|
| Insured | ACRA-registered SME with a current WIC policy and declared outdoor manual workers |
| Benefit | S$8 per outdoor worker per insured hour, on every plan. Below the firm's own idle-hour cost (about S$10.20, assumption), so the firm keeps about 22% of every insured hour |
| Window | Mon to Sat, 08:00 to 18:00, minus the declared unpaid meal hour (default 12:00 to 13:00) |
| Heat meter | Hourly mean of the four 15-min WBGT readings (needs 3 of 4 valid, else pending). 31.5 to 31.9: 5 min (near-miss tier, because worksites run hotter than stations). 32.0 to 32.9: 10 min. 33.0+: 15 min |
| Rain meter | Clock-hour total at the named rain gauge. 2.5 to 9.9 mm: 0.5 h. 10 mm+: 1 h |
| Haze meter | NEA 24-hour PSI for the region at 12:00. 101 to 200: 1 h, from the 3rd consecutive day. 201 to 300: 3 h. 300+: 6 h. Haze limit 20 h a year. No allowance for haze |
| Deductible (monthly allowance) | Heat and rain each: station's normal for that calendar month x the plan's multiple. Only hours above it are insured. Normals reset every year |
| Limit | 20 insured hours a month, 60 a year (S$480 per worker) |
| Payment | PayNow to the company UEN by the 5th working day of next month. No claim form |
| Term | 1 year, aligned to WIC renewal. 14-day wait if added mid-term. Optional two-year rate lock |
| Station | One named primary and one backup, printed on the schedule. Default nearest; a representativeness check may suggest another, with reason shown. One national price: each station is measured against its own normal |
| Fallback ladder | Primary (3 of 4 readings) > backup station > regional median > labelled model estimate > after 14 days settle at published regional advisory level |
| Hour states | TRIGGERED, NOT_TRIGGERED, PENDING. Missing data is NEVER "no event" |
| Exclusions | Indoor workers; hours outside window; workers not on the WIC declaration; lapsed WIC; shipyards, process plants, firms above SME limit; actual losses above the benefit |

### Plans: one lever, the deductible
The benefit is S$8 an hour on every plan. The old Lite plan (S$5 benefit) is retired. Remove it from code and UI.

| Plan | Deductible (allowance multiple) | Per worker a week | Per worker a year | 20 workers a year | Average payout, 20 workers | Months that pay | Source |
|---|---|---|---|---|---|---|---|
| Essential | Normal + 50% (1.5) | S$1.76 | S$91.50 | S$1,830 | S$1,190 | 1 in 3 | Simulation |
| Standard (default) | Normal + 25% (1.25) | S$2.48 | S$128.75 | S$2,575 | S$1,565 | 1 in 2 | 26-year back-test |
| Plus | Normal month (1.0) | S$3.61 | S$187.50 | S$3,750 | S$2,440 | 2 in 3 | Simulation |

All three use a cautious price calibration. Standard is deliberately held at S$2.48 a week even though the observed 26-year back-test returns about 61% of premium as payouts (S$1,565 for 20 workers); 65% is the product target, not the historical result. Worst capped year is S$9,600 for 20 workers on every plan. GST 9% on top (Standard, 20 workers: S$2,807 when rounded to whole dollars). No launch credit and no cash launch offer: remove the old 30% credit everywhere.

### The three levers (use these words in the UI and pitch)
- Deductible: the monthly allowance.
- Co-insurance: S$8 paid against a S$10.20 cost.
- Limit: 60 hours a year, S$480 a worker.

### Work classes (set automatically from the WIC job class, never chosen by the user)
| Class | Trades | Heat hours counted | Rain and haze |
|---|---|---|---|
| A, heavy work | Construction, civil works, landscaping | 100% | 100% |
| B, moderate work | Outdoor cleaning, conservancy, pest control | 50% | 100% |
Work class changes counted heat hours, not price. Class B uses the same published plan price as Class A. MOM's rest rule is written for heavy work.

### Included with every policy
- Hourly heat alert: "Heat reading is 32 at {station}. Ten-minute breaks start now."
- Compliance log: an automatic hourly record of the station reading and the rest owed, exportable as a PDF. This is the record an MOM inspector asks to see. Firms without their own meter must check NEA's reading every hour, and the engine already reads it.
- Optional break log: the supervisor can tap "break started" and "break ended". Optional. Never a condition of payout.

### Retention features
- Two-year rate lock, to match project length. The lock itself is not priced yet. Tag as assumption.
- Renewal discount for firms that keep the break log all year and have no MOM heat action. Modelled at 5%, not priced. Tag as assumption, label "to be tested in the pilot".

### Conditions against misuse (an owner who takes the payout and keeps people working)
The core stays a pure index with no claim form. Three conditions, none of which adds a monthly step:
1. Yearly warranty at purchase, verbatim: "We give the rest breaks MOM requires and do not cut pay for them." A false warranty lets Income void the heat cover.
2. Any MOM heat enforcement action forfeits that month's heat payout. A second one cancels the heat cover.
3. Worker QR notice in five languages: workers are told their pay is not cut and where to report a missed break.
These deter misuse. They do not prevent it. If the pilot's worker survey shows breaks being skipped, the next step is making the heat payout conditional on the break log.

### Site Match (pilot rider, not core)
Site Match is no longer part of the core product or the main demo. It adds paperwork and an abuse surface. Keep the screen and the checker, move them under Labs, and label them "pilot rider".
- For subcontractors on sites of S$5M or more, where the main contractor's MOM-required WBGT meter gives a third-party log.
- Firm uploads the main contractor's hourly WBGT log. A checker scores plausibility against the station network: uplift within -1 to +2°C of station, daily shape correlates (r >= 0.7), no flat or copied values, no bunching just above 32.0 or 33.0.
- Inside the band: approved top-up. Outside: sent to a person. AI never rejects on its own.
- Cap 10 top-up hours a year. About S$0.50 per worker a week (assumption).
- Evaluation results live in the generated numbers block and the Labs model card. They are not a core-product claim.

### Disclosure and communication (use verbatim)
- May-not-pay sentence at sale: "Rehat pays only when NEA's published readings at your named station cross the levels shown; your own site can be hotter or wetter than the station, so you can lose work time and receive nothing."
- Employer SMS (155 characters): "Rehat pays $8/worker/hr when NEA heat (WBGT 32+), heavy rain or haze at your station runs above a normal month. Station only: you may lose time and get $0."
- Worker notice (Bengali, Tamil, Mandarin, Burmese, Malay; translations need native-speaker review): "WBGT is 32 now. You get 10 minutes of rest in shade every hour. Your pay is not cut. No break? Scan to tell us."
- Monthly receipt: every counted hour, reading, station, allowance, sum, and what did not count and why.

## 5. Numbers (label source in the UI: back-test, simulation or assumption)

Back-test = the proxy back-test on MSS Changi daily records, 1983 to 2018. Simulation = 400,000 simulated years calibrated to the back-test (monthly heat and rain shaped on Changi 1991 to 2020, an El Niño / neutral / La Niña state each year, haze in about 1 year in 5). Assumption = a team estimate.

### Market
| Item | Value | Basis |
|---|---|---|
| Work permit holders, construction + shipyard + process | 490,700 (Jun 2026) | MOM, published |
| Premium if every crew were covered | S$63M a year | 490,700 x S$129. Includes large firms, which are beyond the brief. Say "later" |
| In-scope outdoor workers at SMEs | 185,400 (110,700 to 261,800) | 75% construction x 60% SME x 70% outdoor + about 30,000 landscape and outdoor cleaning (assumptions) |
| In-scope employers | about 12,400 | 15 outdoor workers per firm (assumption) |
| In-scope premium | S$23.9M (S$14.3M to S$33.7M) | 185,400 x S$129 |
| Reachable first | 3,100 employers, 46,400 workers, S$6.0M | 25% of in-scope (assumption, used in deck). See open question 1 |
| Year-3 target | 745 employers, 14,900 workers, S$1.92M | 24% take-up of reachable |
| Employer's liability market 2025 | about S$490M premium | GIA, via a secondary summary. Each 1% of share is about S$4.9M a year |
| WIC underwriting figure 2025 | S$94.4M | GIA page; segment not confirmed in the text. Do not quote "19% margin" without checking |

### Unit economics, per worker, Standard
| Item | Value | Source |
|---|---|---|
| Normal downtime | about 59 h a year (heat 16, rain 40, haze 2.5) | Simulation |
| Cost of an idle worker-hour | S$10.20 | Assumption (S$2,450 a month over 240 hours) |
| Loss in a normal year, 20 workers | about S$12,000 (team figure S$12,200) | Model |
| Expected insured hours | 9.78 a year (8.78 observed + 1.0 haze load assumption) | 26-year back-test + assumption |
| Expected payout | S$78.27 | 26-year back-test + haze load assumption |
| Premium | S$128.75, deliberately held at a cautious calibration | Product decision |
| 1-in-10 year payout | S$159 (124% loss ratio) | Back-test |
| Worst back-test year (1997-like) | S$295 (229%) | Back-test |
| Limit | S$480 (373%) | Contract |
| 20-worker firm | Premium S$2,575 (S$2,807 with GST, rounded); expected payout S$1,565; worst year S$9,600; premium about 0.5% of labour bill | |

### Where each premium dollar goes (the headline for finance judges)
| Share | Goes to | Note |
|---|---|---|
| 65% | Back to firms as claims | Product target. The observed 26-year Standard result at the cautious price is about 61%. |
| 20% | Expenses | The ceiling in Income's brief. About 12 points direct costs, 8 points room for overheads |
| 5% | Reinsurance | From year 2. Income keeps the pilot's risk |
| 10% | Profit | 15% in the pilot year, because no reinsurance is bought |

### Three-year path (plan, not forecast)
| | Year 1 (pilot) | Year 2 | Year 3 | Total |
|---|---|---|---|---|
| Firms | 500 | 620 | 745 | |
| Workers | 10,000 | 12,400 | 14,900 | |
| Premium S$ | 1,287,500 | 1,596,500 | 1,918,375 | 4,802,375 |
| Claims 65% S$ | 836,875 | 1,037,725 | 1,246,944 | |
| Expenses 20% S$ | 257,500 | 319,300 | 383,675 | |
| Reinsurance 5% S$ | 0 | 79,825 | 95,919 | |
| Profit S$ | 193,125 | 159,650 | 191,838 | 544,613 |
Year 2 dips because reinsurance starts. Say so before a judge asks.

### The pilot
500 firms, 10,000 workers, from the April 2027 hot season. Premium S$1.29M. Expected profit S$0.19M. Capped worst case S$4.8M (10,000 x S$480), known on day one. A 1-in-100 year is about S$2.6M of claims. Income retains all.

### Probabilities (simulation unless stated)
| Question | Answer |
|---|---|
| Share of months that pay something, Standard | 48% (55% in back-test). Say "about half" |
| Years with no payout at all | Under 0.1% (0 of 36 in back-test) |
| Years a firm gets back more than it paid | About 1 in 5 |
| Years Income makes a profit after all expenses | About 7 in 10 (69%) |
| Yearly loss ratio above 110% / 125% / 150% | 16% / 12% / 7% (back-test: 5, 4 and 2 of 36 years) |
| Average loss ratio by year type | El Niño 103%, neutral 50%, La Niña 56% |

### Why 65% (show this table in the pricing lab)
| Target loss ratio | Price a week | Profit margin | Years in profit |
|---|---|---|---|
| 55% | S$2.93 | 20% | 77% |
| 60% | S$2.69 | 15% | 73% |
| 65% (chosen) | S$2.48 | 10% | 69% |
| 70% | S$2.30 | 5% | 66% |
| 75% | S$2.15 | 0% | 62% |
Reasons: the owner must see value (two-thirds comes back, half of months pay); with no claims team more can go to claims than the 52% Singapore general insurers paid out in 2025; 10% profit is left after 20% expenses.

### Stress tests (simulation, price held at S$129)
| Stress | Loss ratio becomes |
|---|---|
| Base | 65% |
| Haze 60% more frequent | 75% |
| Haze twice as frequent | 80% |
| Heat up 30%, normals not reset | 83% |
| Heat up 30%, rain up 10%, normals not reset | 96% |
The yearly reset of normals is a policy term, not an option. Haze is where the price is most likely to be wrong.

### If a judge says 20% expenses is not realistic for a pilot
A dedicated team at about S$250,000 a year would put expenses near 31% in a 500-firm pilot, break-even at 539 firms, and 20% near 1,200 firms. Answer: "We budgeted at your guideline. If the pilot's costs run higher, year 1 is about break-even and the margin arrives with scale."

### Worked month (May 2026, 20 workers, Bishan, Standard)
Heat counted 1.69 h vs allowance 1.25 -> 0.44 h. Rain 9.0 h vs allowance 6.25 -> 2.75 h. 3.19 h x S$8 x 20 = S$510, paid by the 5th working day of June. (Heat from real sampled readings; rain and normals are assumptions.)

### Reinsurance and capital
- Pilot: Income retains all. Hard cap S$4.8M.
- From year 2: aggregate stop-loss attaching at 150% annual loss ratio, up to the cap. Expected recovery about 2% of premium (2.2% back-test, 2.0% simulation). With a 1.75x reinsurer load (assumption) it costs about 3.9%, inside the 5% budget.
- The published 2015-style haze capital stress is 261% loss ratio. It is a simulation scenario for capital planning, not observed recovery and never changes a customer payout or price.
- No quota share, no per-event cover. Capital under MAS RBC 2 set by Income's actuary; caps bound the maximum.

<!-- BEGIN GENERATED NUMBERS (python -m rehat.numbers; do not edit by hand) -->

Generated 2026-11-16T11:27 from engine outputs. Source files: data/processed/*.json.

**Published Standard calibration (2000 to 2025, 1 worker)**

| Item | Value | Basis |
|---|---|---|
| Expected insured hours | 9.78 a worker a year | approved pricing calibration; see product.json basis |
| Expected payout | S$78.27 a worker a year | insured hours x S$8 |
| 1-in-10 payout | S$159.0 a worker | published Standard calibration |
| Worst back-test payout | S$295.0 | published Standard calibration |
| Zero-payout years | 0 of 26 (book); 0.11 for the average firm | |
| Months paying something | 43.5% | |
| Basis risk | 3.69% of window hours | named station below 31.5 C while a nearest neighbour is at 31.5+ (NEA observed) |
| Rain hours in window share | 0.586 | calibrated on 1513 station-days where NEA 5-minute gauges and MSS daily records overlap; missing MSS station-days, including before a local station began, use Changi on the same date |
| Changi rain days 10 mm+ | 61.4 a year (1983 to 2018) | MSS daily, matches proxy 61.4 |

**Pilot geographic-mix diagnostic (capital and cash only, not a price calibration)**

| Item | Value |
|---|---|
| Scope | Fictional pilot-book geographic mix used for portfolio, capital and cash diagnostics only. |
| Generated pilot firms | 500 |
| Expected insured hours | 6.19 a worker a year |
| Expected payout | S$49.5 a worker a year |

**Pricing**

| Item | Value |
|---|---|
| Published Standard price | S$128.75 a worker a year, S$2.48 a week before GST (S$140.34 with GST) |
| Observed 26-year Standard result | S$78.27 expected payout a worker a year, 61% of the cautious published price |
| Published calibration basis | 9.78 insured hours and S$78.27 per worker; not recalculated from the pilot's station mix |
| 500-firm geographic-mix diagnostic | S$49.50 a worker a year in this generated mix; capital and cash only, not a price input |
| 20-worker Standard example | S$2,575 before GST, S$2,807 with GST; observed expected payout S$1,565 |
| Plan split | 65% claims, 20% expenses, 5% reinsurance and 10% profit (plan) |
| 2015-style haze capital stress | 261% loss ratio (simulation; capital planning only, never a customer payout input) |
| Aggregate stop-loss | Attaches at 150%; observed recovery is 0.0% over 26 years. |
| Market | S$23.9M small-firm premium at the midpoint; year-three plan S$1.92M |

**Liquidity**

| Item | Value |
|---|---|
| Book (demo) | 500 firms, 8,313 outdoor workers |
| Next settlement | 2026-06-08 for 2026-05 (as of 2026-05-29): P50 S$111,432, P90 S$111,432, P99 S$111,432; buffer S$0 |
| Cash call for Oct 2025, as of 20 Oct | P50 S$5,872, P90 S$26,497, P99 S$32,365; buffer S$26,493; settles 2025-11-07 |
| Forecast validation (P90 coverage) | 85% of 174 month-forecasts (2022-01 to 2026-10, as of day 1, 10, 20); target about 90% |
| Forecast validation (P99 coverage) | 97% |

<!-- END GENERATED NUMBERS -->

## 6. Evidence and data

### Data already pulled (in /data/seed)
- `d1031.csv`: real NEA WBGT, 15-min, 15 stations, 31 Oct 2025, 08:00 to 17:30. Record day; peak 35.0°C Sentosa 12:15. Rest owed per worker ranged 0 to 65 min by station; network mean 13 min.
- Proxy back-test on MSS Changi daily records 1983 to 2018: rain days >= 10 mm mean 61.4/yr; correlation of above-normal rain and heat -0.31; bundling cuts year-to-year swing 41% (43% in simulation); 0 of 36 years with zero payout; 55% of months pay something.
- Heat frequency sample: 33 days, Nov 2025 to Oct 2026: about 83 h/yr at WBGT 32+ per station, 16 h at 33+.

### Facts checked on 15 Nov 2026 (safe to show)
| Fact | Source |
|---|---|
| Days of high heat stress: 37 (2023), 21 (2024), 29 (2025) | NEA annual climate assessments |
| 20 WBGT stations as of March 2026 | NEA. Do not say 30 |
| MOM has taken enforcement action against 213 employers | MOM press reply, 8 Apr 2026 |
| About a third of 250 workplaces inspected in the hotter months of 2024 breached heat rules (78 sites) | The Straits Times |
| Four more heat measures mandatory from 1 Dec 2026 | MOM |
| Work permit holders must be paid the declared salary even with no work | MOM FAQ |
| Oct 2026: 12 straight days of unhealthy air, longest since 2015 | The Straits Times |
| Worksites can run hotter than the nearest NEA station | NUS Project HeatSafe |
| Singapore general insurers' incurred loss ratio about 52% in 2025 | GIA annual report |

### Not verified (do not show as fact)
- Whether 15 minutes at 33°C is mandatory or recommended.
- Income's own premium (S$1.8B) and profit (S$110M) quoted by a mentor.
- That the GIA S$94.4M figure is the employer's liability segment.
- Any statement about what SME owners actually do. No owner has been interviewed yet (see section 19).

### Data sources to use
| Data | Source | Notes |
|---|---|---|
| WBGT 15-min | data.gov.sg v2 real-time API, `api=wbgt`, by `date`, paginate with `paginationToken` | Dataset d_87884af1f85d702d4f74c6af13b4853d |
| Rainfall 5-min | data.gov.sg v2 real-time rainfall, by date | Dataset d_72ef872af64a49bbf85c037e714267c0 |
| Air temperature | data.gov.sg v2 real-time air temperature | Dataset d_66b77726bbae1b33f218db60ff5861f0 |
| 24-hour PSI by region | data.gov.sg v2 real-time PSI, by date | Regions: north, south, east, west, central |
| Daily rain and temperature history | MSS historical daily records (weather.gov.sg) | From 1980 for many stations |
| Hourly reanalysis | Open-Meteo archive API (ERA5), no key | For WBGT rebuild (Liljegren method) |
| Archived forecasts | Open-Meteo historical forecast API | For honest forecast back-tests |
| ENSO state | NOAA Oceanic Niño Index (ONI) table | Classify years |
| Call list for owner interviews | BCA Listing of Registered Contractors, data.gov.sg dataset d_dcda79be4aded5f9e769b8e23ff69b47 | Public, includes phone numbers. Research calls only |
Verify every endpoint before relying on it. Cache everything to disk.

### Expert input (scientific guidance from an NEA climate researcher, NOT an endorsement)
Stations do not perfectly represent a site and there is no universal correction factor; rebuild WBGT from ERA5 with Liljegren and validate against NEA observations near the payout threshold; the nearest station is not always the most representative; missing data must never be treated as "no event"; for 36 hours, demonstrate event calculations rather than claim a validated product.

### AI evaluation results (real 31 Oct 2025 data)
- Gap-filler: network median MAE 0.87°C, correct rest band 83%. NOT good enough to pay on, so pending hours wait up to 48 h for a backup station.
- Site Match checker: see section 4.

## 7. Legal and regulatory constraints (encode these as rules in code and copy)

| Rule | Source | What the product must do |
|---|---|---|
| WIC compulsory for manual workers and non-manual earning S$2,600 or less | Work Injury Compensation Act, MOM | Rehat requires an active WIC policy; headcount comes from the WIC declaration; Rehat is a separate optional policy so compulsory WIC terms are untouched |
| Heat-stress rest: WBGT 32+ at least 10 min/h for heavy work (mandatory); framework sets 15 min/h at 33+; hourly monitoring; on-site meters for construction S$5M+, shipyards, process | MOM heat stress framework | Trigger tiers mirror these; never encourage working through heat; worker notices state the rule; compliance log records the hourly reading |
| Four measures mandatory from 1 Dec 2026: heat-stress training, cool drinking water, cooling supplies on standby, suitable clothing | MOM, 28 Aug 2026 | Show in the employer compliance checklist |
| Enforcement under the WSH Act: stop-work orders and composition fines | MOM FAQ | MOM heat action forfeits that month's heat payout; second action cancels heat cover |
| Declared salary owed on idle days | MOM Work Permit FAQ | Basis of insurable interest; policy bans pay deductions for weather downtime |
| Haze guidance for outdoor work | MOM haze guidelines | Advisory only. Haze tiers; link guidance in alerts |
| Licensed insurer | Insurance Act, MAS | The required disclosure appears in the page footer. Do not repeat it in product copy. |
| Fair dealing and disclosure | MAS Guidelines on Fair Dealing | May-not-pay sentence before purchase; teach-back question recorded; plain-language receipts |
| Fair, explainable AI | MAS FEAT principles | Price varies only by plan and declared outdoor headcount; work class affects counted heat hours, never price; no nationality, age or health inputs; every AI check outputs a reason; human review of flags |
| Climate risk management | MAS Guidelines on Environmental Risk Management for Insurers | Yearly reset of normals, scenario stress tests |
| Personal data | PDPA | Collect only: UEN, WIC policy no., outdoor headcount, job class, wage band, site addresses, PayNow (UEN), one contact. No worker personal data; workers scan a QR, no login; delete at policy end; consent and purpose screens |
| Insurable interest | Income brief constraint; no Singapore rule written for parametric cover | Benefit below real hourly cost; only firms with declared outdoor workers; one policy per UEN. Say "designed to be confirmed by Income's legal team", never "compliant" |
| Insurance intermediaries | Insurance Act | Trade bodies and unions raise awareness and refer only. The sale happens on Income's own renewal journey |
| GST 9% on premiums | IRAS | Show premium before and after GST |
| Disputes | FIDReC | Receipt shows how to dispute |
| No law change needed | Brief | Everything above uses existing rules |

## 8. Fraud and moral hazard controls
| Risk | Control |
|---|---|
| Inflating headcount | Capped at WIC-declared numbers (which also raise the WIC premium) |
| Stopping work to collect | Not possible: payout depends only on NEA readings |
| Payout kept, rest not given | Yearly warranty; worker QR notice; MOM heat action forfeits the month, second cancels heat cover; optional break log rewarded at renewal |
| Buying before a bad spell | Annual term tied to WIC; 14-day wait mid-term; normals reset yearly |
| Station shopping | Station set by rule from declared addresses |
| Indoor staff declared outdoor | WIC job class sets the work class |
| Over-insurance | Benefit below hourly cost; one policy per UEN |
| Fake site logs (Site Match pilot only) | Checker; human review; cap; third-party logs only |

## 9. Forecasting for liquidity (Income's cash, not the customer's payout)
Forecasts NEVER change a payout or a price. They plan cash and reinsurance, and they warn firms so heavy work can move.
| Horizon | Method | Decision |
|---|---|---|
| 1 to 3 days | Official forecasts -> predicted trigger hours per station | Daily accrual; employer alert "Heat stress likely {from} to {to} tomorrow at {station}. Plan heavy work early." |
| Month-end settlement | Accrued hours to date + Monte Carlo of remaining days -> apply allowance and caps per firm | Cash call for the 5th working day: P50, P90, P99 |
| Season | ENSO state reweights historical years | Reinsurance before haze and monsoon seasons |
| Year | Annual loss-ratio distribution; stop-loss recovery at 150% | Capital and reinsurance |
Do not build a temperature prediction model of our own. A mentor was explicit about this.

## 10. Income products in the product story
| Income product | Role in product |
|---|---|
| Work Injury Compensation (employer) | Host policy; source of headcount, job class and wages; Rehat is a tick box at WIC renewal |
| SmartBiz 360 (launched Oct 2026) | Optional "Weather Downtime" section; answers Income's open question |
| Platform worker WIC | Roadmap: riders |
| Stallholder Insurance | Roadmap: haze section for hawkers |
| Droplet (2018 parametric rain cover) | Heritage: Income has done parametric before |
| NTUC network | Awareness for employers; worker notices |
The app uses fictional data. Never use Income's logo file or imply a live Income integration. Every page footer: "Concept prototype for Income Insurance, Singapore-India Hackathon 2026. Not an Income product. Fictional data."

## 11. Architecture
- `/engine` Python 3.11+: ingest and cache, trigger engine, back-test, pricing, economics, forecasting and liquidity, AI checks; FastAPI service.
- `/web` Next.js (App Router) + TypeScript + Tailwind + shadcn/ui + Aceternity UI + 21st.dev components + Recharts; reads the API, falls back to precomputed JSON in `/web/public/data`.
- `/data/raw`, `/data/processed`, `/data/seed`.
- `/docs`.
- New in version 2: `data/seed/product.json` is the machine-readable copy of sections 4 and 5. The engine and the web app read plan terms, prices, the premium split, the three-year path and all verbatim copy from it. No screen hard-codes a number or a legal sentence. `make check-numbers` fails if any number in the UI or the engine differs from it.

## 12. Brand and UI direction
- Match Income's look: warm orange primary, deep blue secondary, generous white space, real-people warmth. Three orange dots (an ellipsis) as loader and "payout on its way" state. Ubuntu for headings, Inter for body.
- Placeholders `--income-orange: #F26722` and `--income-blue: #1B3A6B` until sampled from income.com.sg.
- Polished, calm, product-grade. Motion only where it explains. No neon, no heavy gradients.
- Full UX principles and the information architecture are in section 17.

## 13. Status
(Carry over ticks from the old CONTEXT.md, then update every session.)

Already built (confirmed in the R0 audit):
- [x] Repo scaffolded
- [x] Data ingest and cache
- [x] Trigger engine and receipts
- [x] Back-test
- [x] Pricing
- [x] Liquidity forecasting
- [x] Site Match checker
- [x] Web screens from version 1

Version 2 refinement:
- [x] R0 Audit written, old worklog carried over (2026-11-16)
- [x] R1 product.json wired, hard-coded numbers and copy removed, `make check-numbers` passes
- [x] R2 Engine: deductible plans, work classes, forfeiture, economics 65/20/5/10
- [x] R3 Shell: role switcher, grouped nav, one demo firm everywhere
- [x] R4 Landing with "what Rehat would have paid you"
- [x] R5 Onboarding in four steps
- [x] R6 Employer home and receipts
- [x] R7 Compliance log, alerts, worker notice
- [x] R8 Income console
- [x] R9 Labs: Site Match demoted, back-test detail, compliance map
- [x] R10 UX polish pass at 390 px and 1440 px
- [x] R11 Pitch mode, demo cuts, numbers frozen, runs offline
- [x] R12 Pitch-readiness pass: May payment demo, console economics, offline map and deck consistency
- [x] R13 Final production verification: core pitch handoffs, payment flow and offline preview served without the Next.js dev overlay

## 14. Open questions
1. Reachable market. The deck says 3,100 employers reachable first (25% of in-scope). An older build-up assumed Income holds about 12% of small-firm WIC, which is about 1,480 firms on Income's own book. On that view a 500-firm pilot needs a third of Income's small outdoor WIC customers, or association channels from day one. Ask Income for its real share. Until then tag 3,100 as an assumption.
2. Is 15 minutes at 33°C mandatory? Check MOM's FAQ page.
3. Does the WIC application record outdoor headcount by job class and wages? (The Income mentor said they collect worker numbers, job types and salary level.)
4. Can a parametric section sit alongside compulsory WIC, or must it be a separate policy?
5. What do owners actually do on a hot or wet day? Only interviews answer this (section 19).
6. The team told one mentor 7,534 and 3,014 firms. Source unknown. The deck uses 12,400 and 3,100.

## 15. Worklog
(Paste every entry from the old CONTEXT.md here first, oldest at the top. Then append one entry per session, newest last.)

+### 2026-11-15 14:27, P0 scaffold the monorepo
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

### 2026-11-15 23:39, onboarding-led product UX refresh
- Done: Read the root Markdown set and the untracked alternative context kit, then redesigned the employer journey around the active product specification. Replaced the nine-step onboarding flow with four steps: WIC and named-station verification, plan choice, disclosure plus correct teach-back and consent, then the policy schedule. Added a persistent renewal quote, made Site Match a clearly optional follow-on, shortened the simulated record check from 4.2 s to 0.9 s, and grouped the header into Employer, Worker, Income and Proof views. Landing now leads with the WIC renewal quote. Fixed the flagship policy SMS to use Jurong West, matching its schedule.
- Files changed: `web/src/app/onboard/Onboard.tsx`, `web/src/app/page.tsx`, `web/src/components/brand/{AppShell,nav}.ts(x)`, `engine/rehat/{export,judgepack}.py`, `web/public/data/*`, `docs/judge-pack.md`, `CONTEXT.md`.
- Numbers produced (with source): No pricing, trigger or payout number changed. `make export-fast` refreshed generated timestamps and the firm-specific SMS. The flagship SMS is 156 characters from `engine/rehat/export.py`, within the 159-character product limit.
- Decisions: Root `CONTEXT.md` remains the active source of truth. The untracked `data/` kit is an alternative v2 spec with conflicting plans, pricing and Site Match scope; only its non-conflicting UX ideas were adopted. Confirmation now requires the correct teach-back answer, the mandatory named-station acknowledgement and PDPA consent.
- Broken or unverified: The redesigned flow has not yet been timed with a person. The two existing lint warnings remain in vendored `file-upload.tsx` and `timeline.tsx`. The untracked v2 kit still needs an explicit product decision before any migration.
- Tests: `make test` 126 passed. `npx tsc --noEmit` passed. `npm run lint` passed with two existing warnings. `npm run build` passed. Browser checks covered mobile layout, plan selection, wrong and correct teach-back branches, confirmation guardrails and the final schedule with no console errors.
- Next: Time a human completing the four-step journey, rehearse the demo script, and decide whether to migrate any of the alternative v2 commercial model.

### 2026-11-16 00:20, product-grade employer workflow UI pass
- Done: Strengthened the Income-style design system with purpose-led Lucide icon tiles, deeper surface and shadow tokens, expanded Ubuntu and Inter type weights, a worker-language fallback stack, improved hierarchy and accessible primary actions. Reworked the home and Income views around a clear WIC renewal route and a truthful first-year price breakdown. Added `/employer`, a fictional but operational workspace for the renewal, worker notice, receipt and Site Match next actions. Onboarding now resets its preview if cover changes, blocks offline or unregistered UENs, labels the final action as a non-binding renewal request preview and presents key terms before it. The receipt now separates a confirmed amount from a sent payout while data is pending, explains the named-station fallback ladder and lets users select an hour for touch- and keyboard-accessible evidence detail.
- Files changed: `web/src/{app/{page,income/page,onboard/Onboard,employer/page,employer/receipt/ReceiptView,worker/Worker,globals,layout},components/{brand/{AppShell,PageHeader,IconTile,index,nav},ui/button},styles/tokens}.tsx/css`, `CONTEXT.md`.
- Numbers produced (with source): No pricing, trigger or payout arithmetic changed. The Income renewal offer now consistently displays the existing engine total after the 30% launch credit and 9% GST, rather than a pre-credit, pre-GST amount alongside the payable total.
- Decisions: Use `lucide-react` as the single new icon language. White-label primary actions remain on accessible orange-700 (#B35300). A concept-only renewal request never claims to issue cover, take payment or send data to Income. Pending evidence never implies zero payout or a sent payment.
- Broken or unverified: The two pre-existing lint warnings remain in vendored `file-upload.tsx` and `timeline.tsx`. The demo flow has not yet been timed with a person. The transient local dev-cache error seen after a production build cleared after restarting the local preview; production build is clean.
- Tests: `make test` 126 passed. `npx tsc --noEmit` passed. `npm run lint` passed with two existing warnings. `npm run build` passed. Browser checks covered desktop and mobile employer workspace, the pending receipt state and touch/keyboard evidence selection.
- Next: Time a human completing the four-step journey and rehearse the demo script.

### 2026-11-15 21:30, context version 2 adopted
- Done: replaced CONTEXT.md, PLAN.md, AGENTS.md and PROMPTS.md with version 2; added data/seed/product.json and docs/pitch-script.md.
- Files changed: the four context files, product.json, pitch-script.md.
- Numbers produced (with source): none new in code. Section 5 now carries deck version 6 numbers.
- Decisions: see section 16.
- Broken or unverified: the app still shows version 1 numbers, plans and copy until R1 and R2 are done.
- Next: run prompt R0.

### 2026-11-16 07:38, R0 audit and v2 kit adoption
- Done: Promoted the version 2 AGENTS, CONTEXT, PLAN, PROMPTS, product specification and pitch script to their canonical repository paths. Preserved the live version 1 context in `docs/CONTEXT_v1.md`, carried its complete worklog into this file and carried forward the completed build status. Wrote `docs/audit.md`, which inventories the routes, engine, APIs, offline JSON, tests, v1-to-v2 mismatches, route migration and risks. Added a local map error boundary so an unavailable Leaflet chunk no longer blocks onboarding.
- Files changed: `AGENTS.md`, `CONTEXT.md`, `PLAN.md`, `PROMPTS.md`, `data/seed/product.json`, `docs/{CONTEXT_v1,audit,pitch-script,README_KIT_v2}.md`, `web/src/components/rehat/StationMap.tsx`.
- Numbers produced (with source): No product arithmetic changed. The audit records the active engine Standard price of S$2.31 a week versus the v2 deck price of S$2.48; the deck figure needs explicit conservative-calibration labelling because the active engine payout implies a 60.79% rather than 65% loss ratio at that price.
- Decisions: Version 2 is the active product specification. The mandatory concept-prototype footer remains because it is a product rule. Until an authorised pricing-rule change, price remains limited to plan, benefit and headcount even though v2 proposes a work-class input.
- Broken or unverified: `make check-numbers` does not exist until R1, so it cannot run in this bootstrap audit. Existing v1 data and screens still show retired plans and launch credit until R1 and R2 are complete.
- Tests: `make test` 126 passed. The map fallback change also passed `npx tsc --noEmit` and `git diff --check`.
- Next: R1, make `product.json` the single source for product terms and copy, then retire Lite, launch credit and core Site Match.

### 2026-11-16 09:42, v2 product completion and walkthrough hardening
- Done: Promoted the v2 product contract across the engine, offline export and web app. Replaced the old offer with Essential, Standard and Plus deductible plans; retired Lite and the launch credit; moved Site Match to Labs; and kept price inputs to plan plus declared outdoor headcount. Rebuilt the landing around a live quote calculator, consolidated the employer, worker and Income journeys around Tanjong Greenworks and May 2026, added the full employer compliance log, grouped technical screens under Labs, added the plain-language glossary, and aligned the ten-beat pitch mode. Removed non-required product-facing concept, prototype and event language; the required footer disclosure remains. Added `docs/ux-review.md` and refreshed the offline data, decision pack, pricing and back-test documentation.
- Files changed: `data/seed/{product,firms}.json`, `engine/rehat/{product,api,export,pricing,rules,ledger,seedgen,backtest,numbers,liquidity,judgepack,sitematch,explain,anomaly}.py`, relevant engine tests, `scripts/check_numbers.py`, `web/src/{app,components,lib,styles}/**`, `web/public/data/**`, `README.md`, `PLAN.md`, `PROMPTS.md`, `AGENTS.md`, `CONTEXT.md`, and `docs/**`.
- Numbers produced (with source): Published Standard is S$2.48 a worker a week and S$128.75 a year. For 20 workers it is S$2,575 before GST and S$2,807 rounded with GST. The approved 26-year calibration is 9.78 insured hours, S$78.27 a worker and S$1,565 for 20 workers, or 61% of premium (product.json, `pricing.py`). The generated 500-firm geographic-mix diagnostic is 8.32 hours and S$66.60 a worker; it is capital and cash only, not a price calibration (backtest export). The published 2015-style haze capital stress is 261% loss ratio, tagged simulation and never a customer payout input (product.json).
- Decisions: The S$2.48 deck price is the published cautious customer calibration. The 500-firm station mix is disclosed separately rather than silently replacing it. The 150% stop-loss is justified by the labelled 261% 2015-style haze capital scenario, not by historical recovery. The footer disclosure is retained because it is a standing product rule.
- Broken or unverified: No open functional or link failures in the offline walkthrough. Non-English worker content remains pending native-speaker review; real customer, underwriting and legal approval remain outside the demo.
- Tests: `make export`; `make test` (131 passed, one third-party Starlette deprecation warning); `make check-numbers`; `npx tsc --noEmit`; `npm run lint`; and `git diff --check` all passed. Browser checks completed the four-step onboarding, employer handoff, map, compliance log, console, pitch destinations and the 390 px link/mobile audit with no fresh console errors.
- Next: Keep the existing preview running for the user walkthrough. Before a real pilot, complete native-language review and obtain underwriting and legal approval.

### 2026-11-16 11:11, pitch-readiness consistency pass
- Done: Rebuilt the demo around Tanjong Greenworks' paid May 2026 receipt and left the zero-payment October replay for questions. The receipt picker now exposes only those two coherent months. Unified the fictional firm UEN and WIC policy number across onboarding, home and receipts. Made receipt AI copy two plain sentences and stated that a payment is due by PayNow rather than already sent.
- Done: Reframed the landing calculator around hard-year protection, normal-year downtime and the 60-minutes-gets-50 problem. Reordered the Income console around the planned 65/20/5/10 split, three-year plan and market size, labelled its 8,313-worker cash diagnostic separately from the 10,000-worker pilot, and explained that low pre-2010 ratios came from rainfall coverage rather than a climate trend.
- Done: Completed onboarding handoff and schedule details, clear warranty requirements, deductible meters, compliance-log export, current worker notice, offline station map, compact pitch source tags, and pitch links to the May employer home and deductible step. Updated the pitch deck through `Rehat_pitch_deck_v9.pptx`, including S$1,565, S$544,613, the wet-year and haze-year explanation, fixed benefit, optional break log and legal-review wording.
- Files changed: `data/seed/product.json`, `engine/rehat/{backtest,explain,export,liquidity}.py`, related engine tests, `web/src/app/{page,LandingQuote,onboard,employer,worker,replay,insurer,pitch}/**`, `web/src/components/rehat/MapInner.tsx`, `web/src/lib/product.ts`, generated `web/public/data/**`, `docs/{backtest,pricing,pitch-script,judge-pack}.md`, `CONTEXT.md`, `.codex-pptx-build/**`, and `deliverables/Rehat_pitch_deck_v9.pptx`.
- Numbers produced (with source): Main May receipt: 11.5 rain hours, 7.44-hour deductible, 4.06 insured hours and S$650 due by 8 June (engine receipt export). Published Standard remains S$2.48 a worker a week, S$2,575 before GST, S$2,807 with GST, S$1,565 average year and S$9,600 capped hard year for 20 workers (product calibration). The cash diagnostic is 500 firms and 8,313 workers at S$49.50 expected payout a worker, while the separate pilot plan is 500 firms and 10,000 workers (generated back-test and plan). Forecast P90 coverage is 85% of 174 month-forecasts (liquidity validation).
- Decisions: The investor narrative says loss years are very wet years and severe haze years, not El Niño labels alone. The rainfall back-test uses same-day Changi readings for missing early local rainfall coverage, and discloses the resulting coverage limitation. The deck's legal position is "Designed to be confirmed by Income's legal team."
- Broken or unverified: The deck validator reports three inherited table-geometry warnings on backup slides 12, 13 and 20; all were visually reviewed and readable. Native-language worker notices remain pending review. A real pilot still needs underwriting and legal confirmation.
- Tests: `make export`, `make test` (134 passed; one third-party Starlette deprecation warning), `make check-numbers`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, and `git diff --check` passed. Production browser checks confirmed the hard-year landing card, the S$650 May employer home, the two-month receipt picker, current 29.2 worker notice, no map-tile assets, plan carry-through, top-of-step navigation, and both pitch handoffs.
- Next: Rehearse the paid May cut from `/employer`, then use the October replay only when a reviewer asks how a record day can still have no payment.

### 2026-11-16 11:33, final production pitch pass
- Done: Completed the remaining UI consistency pass before the pitch. The Income console now leads with the 65 / 20 / 5 / 10 split, three-year plan and market size, and replaces the potentially misleading ENSO tabs with a loss-driver and forecast-validation card. The narrative is explicitly very wet years and severe haze years, with the early rainfall-coverage limitation disclosed. Kept the paid May 2026 story as the main employer journey: S$650 due by 8 June, 11.5 rain hours, 7.44-hour deductible and 4.06 insured hours. The worker notice now always reflects the current 29.2° station reading while translations await review. Standardised remaining customer-facing wording on deductible and covered crews.
- Done: Verified the landing hard-year framing, plan carry-through, deductible-step pitch handoff, schedule details, receipt picker, compliance PDF export, offline marker map, canonical fictional UEN and cash-diagnostic labelling. Rebuilt and restarted the app as a production server on port 3001, which removes the Next.js dev overlay and stale development cache.
- Files changed: `web/src/app/{income,insurer,pitch,worker}/**`, plus the prior pitch-readiness UI and engine/export changes listed in the preceding entry; regenerated `web/public/data/**`, pitch/back-test/pricing/judge documentation, and this context file.
- Numbers produced (with source): No pricing or payout rule changed. May 2026 remains 11.5 rain hours minus a 7.44-hour deductible = 4.06 insured hours and S$650 due on 8 June (engine receipt export). Published Standard remains S$2.48 a worker a week, S$2,575 before GST, S$2,807 with GST, S$1,565 average year and S$9,600 capped hard year for 20 workers (product calibration). Forecast validation remains 85% P90 coverage and 97% P99 coverage across 174 month-forecasts (liquidity validation).
- Decisions: Keep the fictional `T99DM0001B` UEN throughout rather than presenting a realistic-looking UEN, so no demo company data is ever queried from ACRA. Keep the required footer disclosure only, per the product rule. The 8,313-worker geography mix remains a separately labelled cash diagnostic; the pilot plan remains 10,000 workers.
- Broken or unverified: Native-language worker notices still await native-speaker review. A real pilot still requires underwriting and legal confirmation.
- Tests: `make export`; `make test` (134 passed; one third-party Starlette deprecation warning); `make check-numbers`; `npx tsc --noEmit`; `npm run lint`; `npm run build`; and `git diff --check` passed. Production browser checks confirmed the landing protection card, S$650 employer screen, 29.2° worker screen, receipt picker, onboarding handoff, pitch deductible deep link, console business case and absence of the dev overlay.
- Next: Rehearse the paid-May path from `/employer` and use the October 2025 replay only for follow-up questions.

---

## 16. What changed from version 1 (decision log)

| Topic | Version 1 | Version 2 | Why |
|---|---|---|---|
| Plans | Lite (S$5) and Standard (S$8) | Essential, Standard, Plus by deductible; S$8 on all | A mentor asked for deductible levels. One lever is easier to explain |
| Launch credit | 30% in year one | None | It made the pilot year negative |
| Site Match | Core innovation, demo moment 2 | Pilot rider under Labs | Adds paperwork and an abuse surface. Income said claims must be simple and not open to abuse |
| Free compliance log and heat alert | Not in product | Included with every policy | Turns regulation into a reason to buy |
| Misuse | Forfeit on MOM action | Yearly warranty + forfeit (second action cancels) + worker QR notice | Mentor asked what stops pay-and-still-work |
| Rate lock, renewal discount | None | Two-year lock; discount for break log and no MOM action | Mentor asked for price certainty over a project |
| Work classes | None | A heavy, B moderate | Income asked if trades are differentiated |
| Premium split | 65 / 12 / 5 / 18 | 65 / 20 / 5 / 10 | Expenses budgeted at the brief's 20% ceiling |
| Pilot | 300 firms, S$0.77M, cap S$2.88M | 500 firms, S$1.29M, profit S$0.19M, cap S$4.8M | Team wanted a pilot that earns more |
| Market framing | 185,400 workers, S$23.9M | S$63M all crews, S$24M small firms, 12,400 employers, 3,100 first | Mentor: size must matter to Income; count employers |
| Rule wording | "15 minutes at 33", "paid rest" | 10 at 32 is the firm claim; "framework sets 15 at 33" | A mentor caught the team misquoting the rule |
| Hook | 60 minutes, gets 45 | 60 minutes, gets 50 | Follows from the rule wording |
| Human line | "We don't insure the summer" | "A normal month is part of the job. A hard month, we carry with you." | Team wanted warmth |
| AI | Four jobs incl. Site Match | AI sits in the interface: read, explain, warn, check | Mentor: AI belongs in the interface, not the model |
| Distribution | Five channels incl. brokers | Renewal tick box; "what Rehat would have paid you"; trade bodies and NTUC for awareness; no commission | A S$129 premium cannot carry a commission |
| Demo's three moments | Replay, Site Match, insurer console | Would-have-paid and onboarding, replay to receipt, Income console | Employer-friendly first, as the founder mentor asked |

## 17. UX principles and information architecture

The product had about twelve separate routes. Version 2 makes it feel like one product with three doors.

### Three doors, one demo firm
A role switcher in the header: Employer, Worker, Income. One fictional firm flows through every screen: Tanjong Greenworks Pte Ltd, landscaping (class A), 20 outdoor workers, Jurong West, Standard plan, owner "Mr Tan". The same firm, numbers and month appear on the landing page, onboarding, home, receipt, replay and console. Never show a second firm unless the user picks one.

One demo date. Offline demo mode pins "today" to 29 May 2026, so the home screen shows May 2026 for the demo firm at its own station. Tanjong Greenworks' engine receipt has 11.5 rain hours against a 7.44-hour deductible and pays S$650 on 8 June. The S$510 worked month in section 5 is a Bishan test fixture, so the demo firm's number can differ. The replay is the record day, 31 Oct 2025, and its "Open the receipt" button opens the October 2025 zero-payment receipt for questions. All dates live in `product.json` under `demo_clock`.

### Navigation
| Door | Screens (in order) |
|---|---|
| Story | Landing, Replay of the record day |
| Employer | Account (WIC and add Rehat), Get cover, Home, Receipts, Compliance log |
| Worker | Notice |
| Income | Console: Overview, Cash, Risk, Pricing lab, Review queue |
| Labs | Site Match pilot, Back-test detail, Live map, Brief and law map |
Keep existing route paths where they exist and add redirects. Do not rename routes late in the build.

### Principles
1. One job per screen and one primary button. Everything else is secondary or behind "Details".
2. Answer first. Each screen's first line is the answer in plain words with one number: "This month so far: 3.2 insured hours. S$510 on its way."
3. Plain words. "Heat reading (WBGT)" on first use. "Deductible" with a one-line gloss. No "parametric" in employer screens.
4. Every number has a unit, a period and a source tag (back-test, simulation, assumption).
5. Show the rule next to the result. A "Why?" link on every counted hour opens the reading, the tier and the allowance.
6. Never colour alone. States carry a label and an icon.
7. Honest by default. The may-not-pay sentence is visible before purchase and one tap away afterwards. Assumptions are tagged. Missing data says "pending", never zero.
8. Employer and worker screens work at 390 px wide first. Owners and supervisors use phones.
9. Three clicks from landing to a quote. Sixty seconds to complete onboarding.
10. Empty, loading and error states on every screen. Loading uses the three dots.
11. Motion only to explain: a meter filling, a number counting up.
12. The same component for the same thing everywhere: Money, Hours, StateBadge, SourceTag, PlanCard, Meter.

### Screen-level standards
- Page header: door name, page title, one-sentence answer, primary button.
- Tables: right-align numbers, tabular figures, sticky header, no more than seven columns on desktop and a card list on mobile.
- Forms: one question per row, inline validation, sensible defaults, the price visible at all times in onboarding.
- Glossary: a single `/glossary` drawer with twelve terms at most.

## 18. Pitch narrative (the app's pitch mode and copy must match)

Ten slides, 700 words, 4 minutes 50 seconds. Full script in `docs/pitch-script.md`.
1. Hook: pays for sixty minutes, gets fifty.
2. Mr Tan: about S$12,000 a year; 37, 21, 29 heat days; S$0 from any policy.
3. The rule and the reality: 10 minutes at 32; salary owed with no work; 213 employers acted against; two-thirds of hours are rain.
4. Size: S$63M all crews, S$24M small firms, 12,400 employers, 3,100 first; 1% of WIC is S$4.9M.
5. How it works: one tick box; read, count, compare, pay; free compliance log; station, not site.
6. A normal month is part of the job: deductible, co-insurance, limit; yearly reset.
7. Choose your deductible: S$1.76 to S$3.61; S$2,575, S$1,565, S$9,600.
8. Plan economics: 65 / 20 / 5 / 10; S$0.54M over three years; loss years are very wet years and severe haze years; 7 years in 10; forfeiture.
9. AI sits in the interface: read, explain, warn. Rules decide the payout.
10. Ask: 500-firm pilot from April 2027; "Would you pilot this? If not, what would have to be true?"

Demo cuts:
- Cut A, 20 seconds, inside slide 5: employer home -> May receipt for Tanjong Greenworks: 11.5 rain hours, 7.44-hour deductible, S$650 paid by 8 June.
- Cut B, 90 seconds, for questions or a booth: landing calculator -> get cover -> home -> May receipt -> Income console. Keep the 31 Oct 2025 record-day replay and its zero-payment receipt for questions.

## 19. Mentor feedback digest and the missing evidence

| Mentor | Main points | Where it lives now |
|---|---|---|
| Founder (fintech) | Know the math; month-by-month chart; heat is certain so what is insured; count employers; employer-friendly screens showing what I pay now, what this adds, what I would save; show automation | Monthly allowance chart; employer home; would-have-paid; console economics |
| Second mentor | Deductible and tiers; lock the premium for the project; average stations for simplicity; add-on to an existing policy | Three plans; rate lock; one national price with a local trigger |
| Income mentors | Differentiate trades; need business data, not only weather; premium must look like value; direct payout, little paperwork; no abuse; associations and unions, not agents | Work classes; WIC wage declaration as the loss basis; pays in half of months; no claim form; warranty and forfeiture; distribution |
| Third mentor | Size must matter to Income; a rule is not what owners do; interview real owners; AI is in the interface; end by asking Income a question | S$63M framing and WIC share; inspection facts; interview slot; slide 9; slide 10 |

Missing evidence: no SME owner has been interviewed. The plan is cold calls on Monday from BCA's public contractor register, five open questions, two minutes each. Rule for the app: the landing page has a "What owners told us" block that renders only if `data/seed/interviews.json` contains real entries. Never invent a quote or a count.
