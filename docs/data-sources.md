# Data sources (verified 2026-11-15)

Every response is cached under `data/raw/` with request URL, params and fetch time (`rehat/ingest/cache.py`). A cached request is never repeated.

| Data | Endpoint (verified) | Shape | Cache |
|---|---|---|---|
| WBGT, 15 min | `GET https://api-open.data.gov.sg/v2/real-time/api/weather?api=wbgt&date=YYYY-MM-DD` | `data.records[].datetime`, `data.records[].item.readings[].{station{id,name,townCenter}, location{latitude,longitude}, wbgt, heatStress}`; 25 records a page, `data.paginationToken` for next page | `data/raw/datagov/wbgt/<date>/<page>.json` |
| Rainfall, 5 min | `GET https://api-open.data.gov.sg/v2/real-time/api/rainfall?date=YYYY-MM-DD` | `data.stations[]` (58 gauges on 31 Oct 2025), `data.readings[].{timestamp, data[].{stationId, value}}`, mm per 5 min | `data/raw/datagov/rain/<date>/` |
| Air temperature, 1 min | `GET https://api-open.data.gov.sg/v2/real-time/api/air-temperature?date=YYYY-MM-DD` | same as rainfall; 13 stations; about 58 pages a day, so only pulled for sample days | `data/raw/datagov/temp/<date>/` |
| PSI | `GET https://api-open.data.gov.sg/v2/real-time/api/psi?date=YYYY-MM-DD` | `data.items[].{timestamp, readings.psi_twenty_four_hourly{west,east,central,south,north}}`, hourly, 1 page a day | `data/raw/datagov/psi/<date>/` |
| MSS daily | `GET https://www.weather.gov.sg/files/dailydata/DAILYDATA_<CODE>_<YYYYMM>.csv` | Station, Year, Month, Day, daily rain, highest 30/60/120 min rain, mean/max/min temp, wind. latin-1 with BOM | `data/raw/mss/<CODE>/<YYYYMM>.csv` |
| ERA5 hourly | `GET https://archive-api.open-meteo.com/v1/archive?models=era5&...` | `hourly.{time, temperature_2m, relative_humidity_2m, dew_point_2m, wind_speed_10m, shortwave_radiation, direct_radiation, diffuse_radiation, surface_pressure, precipitation}` | `data/raw/openmeteo/era5/<cell>/<year>.json` |
| Archived forecasts | `GET https://historical-forecast-api.open-meteo.com/v1/forecast?...` | same hourly block | `data/raw/openmeteo/histfc/<cell>/<year>.json` |
| ACRA register (UEN) | `GET https://data.gov.sg/api/action/datastore_search?resource_id=d_3f960c10fed6145404ca7b821f263b87&filters={"uen":"<UEN>"}` | `result.records[].{uen, entity_name, entity_type_desc, uen_status_desc, uen_issue_date, reg_street_name, reg_postal_code}`; no key; updated monthly | `data/raw/acra/<UEN>.json` |
| ONI | `GET https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt` | `SEAS YR TOTAL ANOM` | `data/raw/noaa/oni.json` |

## Notes
- No `DATA_GOV_SG_API_KEY` is set. Without it data.gov.sg rate-limits: WBGT runs at about 4 days a minute, rainfall at about 30 s a day (12 pages). The client backs off on HTTP 429. A key would speed up the full pull.
- WBGT station IDs and names come from the API (`data/processed/stations_wbgt.json`): 31 stations by Nov 2026. The 15 IDs in `d1031.csv` match the names used in `engine/prototypes/ai_usecases.py` (verified).
- PSI regions: north, south, east, west, central. Haze rule reads the 12:00 value of `psi_twenty_four_hourly`.
- MSS codes discovered by reading May 2024 for S01 to S130 (`data/processed/mss_station_codes.json`). Pulled: Changi (S24) from 1980; 12 stations near WBGT stations from 2000 (list in `rehat/ingest/mss.py`).
- ERA5 is a 0.25 degree grid. Singapore's 31 WBGT stations fall in 5 cells, so ERA5 is pulled per cell (`cell_id` in `openmeteo.py`) and joined to stations. Bias correction in P4 is per station.
- ONI `enso_state` uses a single-season threshold (+/-0.5). NOAA's official episodes need 5 overlapping seasons.
- The proxy back-test in CONTEXT.md used a third-party GitHub copy of MSS Changi (chuachinhon/weather_singapore_cch). This repo pulls MSS directly instead.
