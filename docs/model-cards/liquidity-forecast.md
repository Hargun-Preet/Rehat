# Model card: liquidity forecast

**What it does.** Tells Income's finance team how much cash the next monthly settlement (5th working day) needs, as P50, P90 and P99, and how that band narrows through the month. Also season (El Nino, neutral, La Nina) and annual loss-ratio views for reinsurance timing.

**What it never does.** It never changes a customer's payout or price. Payouts come only from `rules.py` and `ledger.py`; a test checks they do not import the forecast.

| Item | Detail |
|---|---|
| Method | Daily counted hours per station group (heat from NEA WBGT or corrected ERA5 rebuild, rain from MSS daily via estimator). Known days are actual. Next 1 to 3 days from the archived Open-Meteo forecast, converted to WBGT with the same Liljegren code and station bias. Remaining days: one historical year per path (same calendar month), shared by all stations to keep spatial correlation. 2,000 paths. Allowance, monthly and yearly caps applied per group; summed over the book |
| Output | `web/public/data/liquidity.json`, `GET /liquidity?asof=YYYY-MM-DD` |
| Validation | Every complete month from Jan 2022, forecasts as of day 1, 10, 20 using only earlier years. P90 coverage and P50 error in `docs/liquidity-validation.md` |
| Season | Years classified by mean ONI over Aug to Oct (single-season thresholds) |
| Alerts | Employer and worker alerts when the forecast shows hot hours; planning advice only |

## Limits
- Pre-2025 actuals use the rebuild, not NEA observations.
- Open-Meteo's historical forecast stitches first hours of model runs, so days 2 and 3 are optimistic.
- Haze is not forecast; rain at gauge level is estimated from daily records.
- Alert threshold uses the raw rebuild at 32.5 C as a stand-in for 32 C corrected (assumption).
