# Model card: WBGT rebuild

**What it does.** Estimates hourly outdoor WBGT at each NEA heat-stress station for years before NEA published WBGT (2000 to Jan 2025), so we can back-test the product and set normals.

**What it never does.** It never settles a payout. Payouts use only NEA's observed readings (with the fallback ladder in `rules.py`).

| Item | Detail |
|---|---|
| Inputs | ERA5 hourly reanalysis from Open-Meteo (`models=era5`): 2 m temperature, relative humidity, surface pressure, 10 m wind, shortwave and direct radiation |
| Method | Liljegren et al. (2008) natural wet bulb and globe temperature, re-implemented in numpy (`engine/rehat/liljegren.py`) from Argonne's public C code. `pywbgt` 3.0.7 was tried first and segfaults on macOS arm64 in its solar routine |
| Correction | Additive bias per station x calendar month, plus a per-station hour-of-day term, then quantile mapping of each station's daytime distribution onto NEA's (so the hot tail is not smoothed away). All fitted on NEA observations in the training period only |
| Hold-out | Last 3 months of NEA observations, never used for fitting |
| Validation | `docs/wbgt-validation.md` (MAE, bias, band agreement for <31.5, 31.5-31.9, 32-32.9, 33+, confusion matrix, 31 to 34 C performance) |
| Output | `data/processed/wbgt_hourly_rebuilt.parquet`: station, hour, wbgt (observed where available, else corrected rebuild), `observed` flag, raw and corrected values. Hours 08:00 to 17:59 |

## Assumptions
- Hour label H covers H:00 to H:59. Open-Meteo radiation at row T is the mean of the hour before T, so hour H uses radiation from row H+1 and the mean of the instantaneous values at H and H+1. Solar position at H:30.
- Direct-beam fraction from ERA5 direct over shortwave, clipped to 0 to 0.9.
- 10 m wind scaled to 2 m by power law: urban exponent 0.15 by day, 0.30 by night.
- Globe diameter 0.0508 m (Liljegren default). NEA's sensor specification was not available to us.
- ERA5 is a 0.25 degree grid. The 31 stations fall in 5 cells, so stations in one cell share inputs and differ only through bias correction.

## Known limits
- Coarse grid: sea breeze, urban heat and shade at a station are not resolved. Expect larger errors at Sentosa, Jurong Island and Tuas.
- Correction is fitted on Feb 2025 onward only (under two years), so it cannot learn year-to-year shifts in bias.
- Band agreement near the 31.5 and 32.0 thresholds is the number that matters. If it is poor, the back-test is a frequency estimate, not an hour-by-hour replay.
- NEA researcher's guidance followed: validate near the threshold, no universal correction factor applied to payouts, missing data never read as no event.

## Owner and review
Back-test and forecast lead. Re-run after each month of new NEA data. Reviewed by: (to fill).
