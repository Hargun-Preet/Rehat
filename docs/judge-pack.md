# Rehat judge pack

Concept prototype for Income Insurance, Singapore-India Hackathon 2026. Not an Income product. Fictional data. Generated 15 Nov 2026 15:50 by `python -m rehat.judgepack` from the same engine outputs the app shows.

**Rehat** is weather downtime cover for small Singapore firms with outdoor crews, sold as a tick box at the Work Injury Compensation (WIC) renewal they already do with Income. MOM's rules make heat rest paid time and idle days paid for work permit holders, so heat, heavy rain and haze cost wages without any damage. When NEA's readings at the firm's named station are worse than that station's normal month, Rehat pays S$8 a worker for each extra hour by PayNow before payroll. No claim form.

## The eight strong-outcome items

### 1. Concept and design
A parametric section on WIC with three meters (heat WBGT tiers that mirror MOM, clock-hour rain at a named gauge, 24-hour PSI for haze), a monthly allowance of each station's normal plus 25%, caps of 20 h a month and 60 h a year, and a fallback ladder where missing data is pending, never no event. A Site Match rider lets firms on hotter sites submit their site heat log for a checked top-up. Screens: [/](/), [/onboard](/onboard), [/employer/receipt](/employer/receipt).

### 2. Target group
Small and medium firms with outdoor manual crews: construction subcontractors, landscapers, outdoor cleaners. About 185,400 in-scope workers (110,700 to 261,800; assumptions) in about 12,400 firms. Chosen because the payer (the employer), the channel (WIC, which Income sells) and the trigger (MOM's heat rule) already exist. Hawkers, riders and households were assessed and moved to the roadmap with reasons (CONTEXT.md section 3).

### 3. Simple pricing logic and unit economics
Premium = expected insured hours x benefit / 0.65. Expected insured hours 9.04 a worker a year (back-test 8.04 h + haze load 1.0 h (assumption)). Standard S$111.26 a year, S$2.14 a week before GST (S$121.28 with 9% GST); Lite S$69.54 a year. A 20-worker firm pays S$2,225 a year (S$2,425 with GST; S$1,698 after the 30% year-one credit), about 0.43% of its labour bill, against an expected payout of S$1,447 and weather downtime costing it about S$13,248 a year. Break-even 749 policies of 20 workers at S$300k fixed cost (assumption). Price depends only on plan, benefit and headcount. Screens: [/onboard](/onboard), [/backtest](/backtest).

### 4. Clear claim parameters and exclusions
Heat: hourly mean of four 15-minute WBGT readings (3 of 4 needed): 31.5 to 31.9 = 5 min, 32.0 to 32.9 = 10 min, 33.0+ = 15 min. Rain: 2.5 to 9.9 mm in a clock hour = 0.5 h, 10 mm+ = 1 h. Haze: noon 24-hour PSI 101 to 200 = 1 h from the 3rd consecutive day, 201 to 300 = 3 h, above 300 = 6 h, 20 h a year. Window Mon to Sat 08:00 to 18:00 minus the meal hour. Exclusions: indoor or undeclared workers, lapsed WIC, shipyards and process plants, firms above SME size, the heat payout in any month with an MOM heat enforcement action, a 14-day wait if added mid-term. The may-not-pay sentence is shown before purchase. Every rule has a test (`engine/tests/test_rules.py`).

### 5. Expected impact on financial protection and affordability
Back-test 2000 to 2025: 0 of 26 years with no payout for the book; 46.1% of firm-months pay something; expected payout S$64.30 a worker a year; 1-in-10 year S$118.80. The payout arrives by the 5th working day, before payroll. It also makes MOM's rest rule cheaper to obey: rest that is paid for gets taken. Screens: [/replay](/replay), [/backtest](/backtest).

### 6. Market competitiveness
No product in Singapore pays for weather downtime without damage. Rehat rides an existing compulsory purchase (WIC), so acquisition cost is a tick box. Total market about S$20.6M premium a year (S$12.3M to S$29.1M); Income's WIC slice S$2.5M; year-3 obtainable S$1.66M. Income has run parametric cover before (Droplet, 2018).

### 7. Distribution proposal
Offered at WIC renewal in Income's business account and by brokers who place WIC, plus trade associations and NTUC's U SME network. 60-second onboarding pulls headcount from the WIC policy. Workers get notices by QR in their language through the Migrant Workers' Centre network. Roadmap: riders via platform WIC (Platform Workers Act), hawkers via Stallholder Insurance. Screens: [/income](/income), [/onboard](/onboard), [/worker](/worker).

### 8. How AI and data are integrated
Data: NEA WBGT, rain and PSI from data.gov.sg, MSS daily records, ERA5 reanalysis, NOAA ONI, all cached with URL and time. AI and models stay upstream of the payout and are auditable: (a) Site Match checker on 400 simulated logs over 247 real station-days flags 2% of honest logs and catches 100% of inflated and 100% of flat logs; it never rejects. (b) Liquidity forecast: P90 covered the actual month 90% of the time over 2022-01 to 2026-10. (c) Receipt explainer in six languages with numbers locked. (d) Gap-fill proposes values for pending hours for human review only. (e) Declaration flags (12 of 300 demo firms). Model cards in `docs/model-cards/`.

## Must-haves

| Must-have | How |
|---|---|
| Offered by or with Income as the licensed insurer | Every page footer and the onboarding say 'Underwritten by Income Insurance Limited (proposed)' and 'Concept prototype'. Sold as an add-on to Income's WIC. (/income, every page footer) |
| Triggers and pricing use independent, verifiable data | Triggers read NEA WBGT, rain gauge and PSI from data.gov.sg; every call cached with URL and time; pricing from a back-test on the same data plus MSS records. (/live, /replay, /backtest) |
| Customer understands what they pay for and when they get paid in under a minute | Onboarding shows plan, weekly price, GST, the may-not-pay sentence and a teach-back question; a timer shows elapsed seconds. (/onboard) |
| Collect only the personal data needed; AI decisions explainable | Only UEN, WIC policy number, outdoor headcount, wage band, site addresses, PayNow (UEN) and one contact. No worker data. Every AI check outputs a reason. (/onboard (Your data step), /employer/site-match) |
| No new hardware for the core product | Core product uses NEA's public stations. Site Match uses logs the main contractor already keeps. (/live, /employer/site-match) |

## Legal map

Full table in [/compliance](/compliance) and `web/public/data/compliance.json`.

| Rule | Source | Product |
|---|---|---|
| WIC compulsory for manual workers and non-manual earning S$2,600 or less | Work Injury Compensation Act, MOM | Rehat needs an active WIC policy; headcount comes from the WIC declaration; lapsed WIC excludes the month. |
| Heat-stress rest: WBGT 32+ 10 min/h, 33+ 15 min/h; paid working time; hourly monitoring | MOM heat stress framework and FAQs | Heat tiers mirror MOM (plus a 5 min near-miss tier at 31.5); hourly mean of four NEA readings; worker notices state the rule. |
| Four measures mandatory from 1 Dec 2026: heat-stress training, cool water, cooling supplies, suitable clothing | MOM, 28 Aug 2026 | Listed for employers at renewal; renewal reward for compliance (concept). |
| Declared salary owed on idle days | MOM Work Permit FAQ | Basis of insurable interest for rain and haze hours. |
| Haze guidance for outdoor work | MOM haze guidelines (Oct 2026) | Haze tiers on NEA 24-hour PSI at 12:00; PSI chips on the live map. |
| Fair dealing and disclosure | MAS Guidelines on Fair Dealing (revised May 2024) | May-not-pay sentence shown verbatim before purchase; teach-back answer recorded with explanation; plain-language receipts. |
| Fair, explainable AI | MAS FEAT principles; Veritas | Price uses plan, benefit and headcount only; every AI check gives a reason; humans review flags; model cards; explainer cannot change numbers. |
| Climate risk management | MAS Guidelines on Environmental Risk Management for Insurers (2020) and transition addendum (Mar 2026) | Back-test with stress cases, season view by ENSO, annual repricing from normals, climate assumptions disclosed. |
| Personal data | PDPA | Consent and purpose screen; workers opt in to notices by QR without personal data; delete at policy end. |
| Insurable interest | Income brief constraint | Benefit (S$8) below the idle-hour cost (about S$10.20, assumption); only firms with declared outdoor workers; one policy per UEN. |
| GST 9% on premiums | IRAS | Premium shown before and after GST everywhere it appears. |
| Disputes | FIDReC | Receipt explains how to dispute; disputes are data checks; FIDReC link. |
| Platform Workers Act (from 1 Jan 2025) | MOM | Roadmap only: riders via platform WIC. |
| No law change needed | Brief | Everything above uses existing rules. |
| Missing data is never 'no event' | NEA researcher guidance; AGENTS.md | Fewer than 3 of 4 readings is PENDING; fallback ladder; model estimate never pays alone. |
| Forecasts never change payouts or prices | AGENTS.md | Liquidity module is separate; a test checks payout code does not import it. |

## Model cards

- [WBGT rebuild](model-cards/wbgt-rebuild.md)
- [Site Match checker](model-cards/site-match.md)
- [Liquidity forecast](model-cards/liquidity-forecast.md)
- [Receipt explainer](model-cards/explainer.md)
- [Gap-fill](model-cards/gapfill.md)
- [Station suggestion](model-cards/station-suggestion.md)
- [Declaration flags](model-cards/declaration-anomaly.md)

## Limits, stated plainly

- Heat history before Feb 2025 is a rebuild from ERA5. Held-out band agreement when NEA reads 31 to 34 C is 48% (MAE 1.124 C overall). Good enough for frequencies, not for single hours; payouts never use it.
- Rain history comes from MSS daily records through an estimator (window share 0.55, assumption: 55% (only 228 overlapping station-days)).
- Haze before 2025 is not in the back-test; pricing adds a 1.0 h haze load (assumption) and a 2015-like stress test.
- Basis risk: the named station is below 31.5 C while a nearest neighbour is above in 3.6% of work hours. The may-not-pay sentence says so before purchase; Site Match narrows it for big sites.
- Gap-fill near the thresholds agrees on the rest band only 55% of the time, so it never pays alone.
- The Site Match rider price (S$88.13 a year) rests on two assumptions (site uplift and filing rate) and must be tested on real contractor logs.
- Stop-loss at 150% (team decision, 2026-11-15): the back-test never reaches it, so it is cheap catastrophe protection for years worse than history, such as a severe haze year. The lowest attachment inside the 5% budget would be 100%; it was considered and not chosen.
- Translations are drafts for native-speaker review.

## What the pilot must prove (300 firms, 6,000 workers, from April 2027)

1. Attach rate at WIC renewal and the share of firms that understand the cover (teach-back right first time). 2. Payout timing: every month settled by the 5th working day, pending hours resolved within 14 days. 3. Real loss ratio against the 65% expected. 4. Site Match on real contractor logs: honest approval rate and fraud catch. 5. Whether rest is actually taken (worker survey through the Migrant Workers' Centre). 6. Cash forecast coverage on live months. Pilot premium S$667,560, expected claims S$434,003, hard cap S$2,880,000; Income retains all in year one.

## Ten hardest questions

1. **Isn't this a bet on the weather?** No. MOM's rules make heat rest paid time and idle days paid, so the firm has a real wage loss. The benefit (S$8) sits below the idle-hour cost (about S$10.20, assumption), only declared outdoor workers count, and one policy per UEN.
2. **My site is hotter than the station. Why would I buy?** The sentence before purchase says you can lose time and get nothing. Basis risk is 3.6% of work hours on NEA data. Big sites already keep WBGT logs, and Site Match turns them into a checked top-up.
3. **Can firms game it by stopping work?** No. The payout depends only on NEA readings, not on whether work stopped. Headcount is capped at the WIC declaration, which also raises the WIC premium.
4. **Will employers pocket the money and not give rest?** Workers get the rule in their language, wages may not be cut, and the heat payout is forfeited in any month with an MOM heat enforcement action.
5. **What if a station goes down?** The hour is pending, never no event. Backup station, regional median, then after 14 days the published regional advisory level. A model estimate is only proposed for human review.
6. **Is the price right with so little WBGT history?** It is a back-test of 26 years using NEA where it exists and a validated rebuild before that, plus a haze load. The price is reviewed every year as normals reset. The pilot is sized so Income can retain the risk.
7. **What does Income's finance team need on day one?** The cash call for each settlement: next one 2026-12-07, P50 S$2,924, P90 S$16,103, P99 S$26,510. P90 coverage 90% on past months.
8. **How bad can a year get?** Worst back-test year 2013 at 127% loss ratio; a 2015-like haze year added on top gives 271%. The hard cap is 60 h a worker (431%).
9. **Where is the AI, and can it hurt a customer?** Upstream only. The payout is fixed arithmetic. AI reads site logs (and sends doubts to a person), explains receipts (numbers locked), proposes gap values (reviewed), flags declarations (flag only) and forecasts cash (never touches payouts). Every check gives a reason.
10. **Does this need a change in the law or new hardware?** No. It sits on WIC, uses NEA's public stations and existing MOM rules, and is filed by Income as the licensed insurer.

Concept prototype for Income Insurance, Singapore-India Hackathon 2026. Not an Income product. Fictional data.
