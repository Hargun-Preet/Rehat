# Model card: gap-fill for pending hours

**What it does.** When a station-hour is missing, it estimates the value from the other stations (network median, median plus station offset, ridge regression).

**What it never does.** It never pays on its own. Under `rules.fallback` a missing hour first waits up to 48 h for the backup station and the regional median. After that, the model estimate is shown as "model estimate" and sent to a person. The hour stays PENDING. After 14 days it settles at the published regional advisory level.

**Validation** (leave one station out, insured-window hours, test from 2025-10-31, 15 stations):

| Method | MAE (C) | Band agreement | MAE when observed 31 to 34 C | Band agreement 31 to 34 C |
|---|---|---|---|---|
| median | 0.688 | 95% | 1.03 | 56% |
| median+offset | 0.664 | 95% | 0.947 | 57% |
| ridge | 0.501 | 95% | 0.8 | 57% |

Band agreement looks high overall because most hours are far below the thresholds. Near the thresholds it is about 57%, so the estimate is not good enough to pay on. Earlier 31 Oct 2025 baseline (afternoon only): median MAE 0.87 C, 83%.
