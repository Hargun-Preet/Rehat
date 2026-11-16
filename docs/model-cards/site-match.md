# Model card: Site Match checker, Labs pilot rider

**Scope.** Site Match is a Labs pilot rider. It is not part of onboarding, the landing page, the main navigation, the core price or the core payment rule.

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

## Evaluation (400 simulated logs on 247 real NEA station-days)

| Log type | Flagged for review | Approved with a top-up anyway |
|---|---|---|
| flat | 100% | 0% |
| honest | 2% | Not published |
| inflated | 100% | 0% |
| pasted-from-another-day | 67% | 23% |
| threshold-bunched | 51% | 21% |

The result is deliberately treated as a Labs finding, not a core-product proof point. Threshold-bunched and pasted logs can still receive a top-up, so a person reviews anything outside the published band. The 10 h yearly cap bounds the pilot exposure.

The harder evaluation uses real curves from another day at the same station and threshold fakes that barely cross a level. It is kept outside the core flow because it adds paperwork and an abuse surface.

## Pilot pricing
The current pilot assumption is S$0.50 per worker a week. It is not part of the core product price and must be re-tested against real contractor logs before any launch decision.

## Inputs and data
CSV with columns time and wbgt. Photo or PDF reading is optional and off without an API key; the user always confirms the extracted table. No worker personal data.

## Owner and review
AI lead. Human review queue in the insurer console with audit log.
