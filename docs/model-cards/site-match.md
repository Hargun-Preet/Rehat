# Model card: Site Match checker

**What it does.** Checks a firm's own site WBGT log (the main contractor's hourly meter log) against NEA's named station for the same day. If every check passes, it approves a top-up: the extra MOM rest minutes the site log implies over the station, capped at 10 h a worker a year. If any check fails, the claim goes to a person with the reasons.

**What it never does.** It never rejects a claim. Status is APPROVED or REVIEW; only a person can decline. It never changes the base payout.

| Check | Rule | Why |
|---|---|---|
| TIMESTAMPS | 95% of readings on the claimed day, 08:00 to 18:00 | Logs from other days or off-hours |
| ADDRESS | Site on the log matches a declared site | Claims for undeclared sites |
| COVERAGE | At least 6 hours match station hours | Too little data to compare |
| UPLIFT | Median site minus station within -1 to +2 C | Inflated logs |
| SHAPE | Correlation with the station's daily curve at least 0.7 | Logs from another day or made up |
| NOT_FLAT | Spread of hour-to-hour change at least 0.05 C | Copied or typed values |
| NOT_BUNCHED | At most 35% of all readings, and 60% of readings at 31.5+, within 0.15 C above 32.0 or 33.0 | Values nudged over a threshold |
| SAME_DAY | Hour-to-hour changes correlate with the station's that day (r at least 0.3) | Pasted logs (added check) |

## Evaluation (400 simulated logs on 163 real NEA station-days: 31 Oct 2025 plus the 10 hottest complete days pulled)

| Log type | Flagged for review | Approved with a top-up anyway |
|---|---|---|
| flat | 100% | 0% |
| honest | 2% | 58% |
| inflated | 100% | 0% |
| pasted_day | 60% | 28% |
| threshold | 54% | 16% |

Honest logs are approved with a top-up 58% of the time (the rest show no extra rest minutes that day). When a fake slips through, the mean top-up is 23.3 min (threshold) and 23.4 min (pasted) a worker; the 10 h yearly cap bounds the loss.

Compared with the kit prototype (0% honest flagged; 100% inflated and flat; 84% threshold; 77% pasted): the evaluation is now harder. Pasted logs use a real curve from another day at the same station (the prototype reversed the curve), and threshold fakes on cooler days barely cross a threshold.

## Rider price
Expected top-up 7.21 h a worker a year -> S$88.76 a year (S$1.71 a week) at the 0.65 target loss ratio. Assumptions: honest site uplift N(0.8, 0.5) C per firm-year (the simulation prior), firms file on 50% of eligible days, 10 h cap. 49% of simulated firm-years hit the cap. This replaces the S$0.50 a week placeholder and must be re-tested on real contractor logs.

## Inputs and data
CSV with columns time and wbgt. Photo or PDF reading is optional and off without an API key; the user always confirms the extracted table. No worker personal data.

## Owner and review
AI lead. Human review queue in the insurer console with audit log.
