"""Rebuild hourly outdoor WBGT per station from ERA5 (Liljegren), bias-correct against NEA, validate on a hold-out.

Assumptions (also in docs/model-cards/wbgt-rebuild.md):
- Hour label H covers H:00 to H:59 (same as the ledger). Open-Meteo radiation at row T is the mean over T-1h to T, so
  hour H uses radiation from row H+1 and the mean of instantaneous temperature, dew point, wind and pressure at rows H
  and H+1. Solar geometry at H:30.
- Direct-beam fraction from ERA5 direct/shortwave (clipped 0 to 0.9).
- 10 m wind to 2 m by power law, urban exponents 0.15 day, 0.30 night. Globe 0.0508 m (Liljegren default; NEA's sensor
  globe size not published in our sources).
- ERA5 is 0.25 degrees: stations in one cell share raw inputs. Station differences come only from bias correction.
- Correction: additive, per station x calendar month, plus a per-station hour-of-day term. Fitted on the training
  period only. Months without training data use the station's all-month bias.
- Hold-out: the last 3 months of NEA observations. Never used for fitting.
"""
from __future__ import annotations

import json
from dataclasses import dataclass

import numpy as np
import pandas as pd

from rehat import liljegren
from rehat.ingest.openmeteo import cell_id
from rehat.paths import DOCS, PROCESSED, WEB_DATA
from rehat.stations import wbgt_stations

BANDS = [(-np.inf, 31.5, "<31.5"), (31.5, 32.0, "31.5-31.9"), (32.0, 33.0, "32-32.9"), (33.0, np.inf, "33+")]
BAND_LABELS = [b[2] for b in BANDS]
HOLDOUT_MONTHS = 3


def band(v: np.ndarray) -> np.ndarray:
    v = np.asarray(v, float)
    return np.select([v < 31.5, v < 32.0, v < 33.0], [0, 1, 2], 3)


def rebuild_cell(era: pd.DataFrame, lat: float, lon: float) -> pd.DataFrame:
    """Raw rebuilt hourly WBGT for one ERA5 cell. `era` has ts_sgt and ERA5 hourly columns, sorted."""
    e = era.sort_values("ts_sgt").reset_index(drop=True)
    nxt = e.shift(-1)
    out = pd.DataFrame({"hour": e.ts_sgt})
    temp = (e.temperature_2m + nxt.temperature_2m) / 2
    rh = (e.relative_humidity_2m + nxt.relative_humidity_2m) / 2
    pres = (e.surface_pressure + nxt.surface_pressure) / 2
    u10 = (e.wind_speed_10m + nxt.wind_speed_10m) / 2
    solar = nxt.shortwave_radiation
    fdir = (nxt.direct_radiation / nxt.shortwave_radiation.where(nxt.shortwave_radiation > 0)).fillna(0)
    utc = (e.ts_sgt + pd.Timedelta(minutes=30) - pd.Timedelta(hours=8)).values.astype("datetime64[s]")
    ok = temp.notna() & rh.notna() & pres.notna() & u10.notna() & solar.notna()
    cz = liljegren.cos_zenith(utc, lat, lon)
    u2 = liljegren.wind_10m_to_2m(u10.fillna(1).values, cz > 0)
    res = liljegren.wbgt(utc, lat, lon, temp.fillna(28).values, rh.fillna(80).values, pres.fillna(1010).values, u2, solar.fillna(0).values, fdir.values)
    out["wbgt_raw"] = np.where(ok, res["Twbg"], np.nan)
    return out


def observed_hourly() -> pd.DataFrame:
    w = pd.read_parquet(PROCESSED / "wbgt_15min.parquet", columns=["station_id", "ts_sgt", "wbgt"]).dropna()
    w["hour"] = w.ts_sgt.dt.floor("h")
    g = w.groupby(["station_id", "hour"]).wbgt.agg(["mean", "count"]).reset_index()
    g = g[g["count"] >= 3]
    return g.rename(columns={"mean": "wbgt_obs"})[["station_id", "hour", "wbgt_obs"]]


@dataclass
class Correction:
    month: pd.DataFrame  # station_id, month, bias
    hod: pd.DataFrame  # station_id, hod, bias_hod
    overall: pd.Series  # station_id -> bias
    cell_month: pd.DataFrame  # cell, month, bias_cell (fallback for stations without training data)
    cell_hod: pd.DataFrame  # cell, hod, bias_cell_hod

    def apply(self, df: pd.DataFrame) -> pd.Series:
        d = df[["station_id", "hour", "wbgt_raw"]].copy()
        d["month"] = d.hour.dt.month
        d["hod"] = d.hour.dt.hour
        d["cell"] = d.station_id.map(_station_cell())
        d = d.merge(self.month, on=["station_id", "month"], how="left").merge(self.hod, on=["station_id", "hod"], how="left")
        d = d.merge(self.cell_month, on=["cell", "month"], how="left").merge(self.cell_hod, on=["cell", "hod"], how="left")
        no_station = d.station_id.map(self.overall).isna()
        d["bias"] = d["bias"].fillna(d.station_id.map(self.overall))
        d.loc[no_station, "bias"] = d.loc[no_station, "bias_cell"]
        d.loc[no_station, "bias_hod"] = d.loc[no_station, "bias_cell_hod"]
        d["bias"] = d["bias"].fillna(d["bias_cell"]).fillna(0)
        d["bias_hod"] = d["bias_hod"].fillna(0)
        return pd.Series((d.wbgt_raw + d.bias + d.bias_hod).values, index=df.index)


def _station_cell() -> dict[str, str]:
    return {s.station_id: cell_id(s.lat, s.lon) for s in wbgt_stations()}


def fit_correction(train: pd.DataFrame) -> Correction:
    t = train.assign(err=train.wbgt_obs - train.wbgt_raw, month=train.hour.dt.month, hod=train.hour.dt.hour)
    t["cell"] = t.station_id.map(_station_cell())
    overall = t.groupby("station_id").err.mean()
    month = t.groupby(["station_id", "month"]).err.mean().rename("bias").reset_index()
    cell_month = t.groupby(["cell", "month"]).err.mean().rename("bias_cell").reset_index()
    t = t.merge(month, on=["station_id", "month"]).merge(cell_month, on=["cell", "month"])
    hod = (t.err - t.bias).groupby([t.station_id, t.hod]).mean().rename("bias_hod").reset_index()
    cell_hod = (t.err - t.bias_cell).groupby([t.cell, t.hod]).mean().rename("bias_cell_hod").reset_index()
    return Correction(month, hod, overall, cell_month, cell_hod)


def metrics(obs: np.ndarray, pred: np.ndarray) -> dict:
    obs, pred = np.asarray(obs), np.asarray(pred)
    m = np.isfinite(obs) & np.isfinite(pred)
    obs, pred = obs[m], pred[m]
    near = (obs >= 31) & (obs <= 34)
    cm = pd.crosstab(pd.Categorical(band(obs), categories=range(4)), pd.Categorical(band(pred), categories=range(4)), dropna=False)
    trig_obs, trig_pred = obs >= 31.5, pred >= 31.5
    return {
        "n": int(m.sum()),
        "mae": round(float(np.mean(np.abs(pred - obs))), 3) if len(obs) else None,
        "bias": round(float(np.mean(pred - obs)), 3) if len(obs) else None,
        "band_agreement": round(float(np.mean(band(obs) == band(pred))), 3) if len(obs) else None,
        "n_31_34": int(near.sum()),
        "mae_31_34": round(float(np.mean(np.abs(pred[near] - obs[near]))), 3) if near.any() else None,
        "band_agreement_31_34": round(float(np.mean(band(obs[near]) == band(pred[near]))), 3) if near.any() else None,
        "trigger_hit_rate": round(float(np.mean(trig_pred[trig_obs])), 3) if trig_obs.any() else None,
        "false_trigger_rate": round(float(np.mean(trig_pred[~trig_obs])), 3) if (~trig_obs).any() else None,
        "confusion": cm.values.tolist(),
    }


def run(first_year: int = 2000) -> dict:
    era = pd.read_parquet(PROCESSED / "era5_hourly.parquet")
    stations = wbgt_stations()
    cells = {cell_id(s.lat, s.lon) for s in stations}
    raw_by_cell = {}
    for cid in sorted(cells):
        e = era[(era.cell_id == cid) & (era.ts_sgt.dt.year >= first_year)]
        lat, lon = (float(x) for x in cid[1:].split("_"))
        raw_by_cell[cid] = rebuild_cell(e, lat, lon)
    frames = []
    for s in stations:
        r = raw_by_cell[cell_id(s.lat, s.lon)].copy()
        r.insert(0, "station_id", s.station_id)
        frames.append(r)
    raw = pd.concat(frames, ignore_index=True)

    obs = observed_hourly()
    both = obs.merge(raw, on=["station_id", "hour"], how="inner").dropna(subset=["wbgt_raw"])
    cutoff = both.hour.max().normalize() - pd.DateOffset(months=HOLDOUT_MONTHS)
    train, test = both[both.hour < cutoff], both[both.hour >= cutoff]
    corr = fit_correction(train)
    test = test.assign(wbgt_corr=corr.apply(test))
    win = test[(test.hour.dt.hour >= 8) & (test.hour.dt.hour < 18) & (test.hour.dt.weekday < 6)]

    per_station = []
    for sid, g in win.groupby("station_id"):
        per_station.append({"station_id": sid, "raw": metrics(g.wbgt_obs, g.wbgt_raw), "corrected": metrics(g.wbgt_obs, g.wbgt_corr)})
    report = {
        "train_period": [str(train.hour.min()), str(train.hour.max())],
        "test_period": [str(test.hour.min()), str(test.hour.max())],
        "train_hours": int(len(train)),
        "test_hours_window": int(len(win)),
        "bands": BAND_LABELS,
        "overall_window_raw": metrics(win.wbgt_obs, win.wbgt_raw),
        "overall_window_corrected": metrics(win.wbgt_obs, win.wbgt_corr),
        "per_station": per_station,
    }

    # full series: observed where valid, corrected rebuild elsewhere; hours 08 to 17 only (back-test window)
    raw = raw[(raw.hour.dt.hour >= 8) & (raw.hour.dt.hour < 18)].copy()
    raw["wbgt_rebuilt"] = corr.apply(raw).astype("float32")
    full = raw.merge(obs, on=["station_id", "hour"], how="left")
    full["observed"] = full.wbgt_obs.notna()
    full["wbgt"] = np.where(full.observed, full.wbgt_obs, full.wbgt_rebuilt).astype("float32")
    full = full[["station_id", "hour", "wbgt", "observed", "wbgt_raw", "wbgt_rebuilt"]]
    full["wbgt_raw"] = full.wbgt_raw.astype("float32")
    full.to_parquet(PROCESSED / "wbgt_hourly_rebuilt.parquet", index=False)

    # sample for the UI: observed vs rebuilt near the threshold, held-out window hours
    near = win[(win.wbgt_obs >= 30) & (win.wbgt_obs <= 35)]
    sample = near.sample(min(600, len(near)), random_state=1)
    ui = {
        "report": {k: v for k, v in report.items() if k != "per_station"},
        "per_station": [{"station_id": p["station_id"], **{f"corr_{k}": p["corrected"][k] for k in ("mae", "bias", "band_agreement", "mae_31_34", "band_agreement_31_34")}} for p in per_station],
        "scatter": [{"obs": round(float(a), 2), "rebuilt": round(float(b), 2)} for a, b in zip(sample.wbgt_obs, sample.wbgt_corr)],
    }
    WEB_DATA.mkdir(parents=True, exist_ok=True)
    (WEB_DATA / "wbgt_validation.json").write_text(json.dumps(ui))
    (PROCESSED / "wbgt_validation.json").write_text(json.dumps(report, indent=1))
    write_report(report)
    return report


def _cm_table(cm: list[list[int]]) -> list[str]:
    lines = ["| observed \\ rebuilt | " + " | ".join(BAND_LABELS) + " |", "|---|" + "---|" * 4]
    for lab, row in zip(BAND_LABELS, cm):
        lines.append(f"| {lab} | " + " | ".join(str(x) for x in row) + " |")
    return lines


def write_report(r: dict) -> None:
    o, c = r["overall_window_raw"], r["overall_window_corrected"]
    poor = (c["band_agreement_31_34"] or 0) < 0.6
    lines = [
        "# WBGT rebuild validation",
        "",
        "Generated by `python -m rehat.wbgt_rebuild`. ERA5 (Open-Meteo, models=era5) -> Liljegren WBGT (`rehat/liljegren.py`) -> additive bias correction per station x month plus hour-of-day.",
        "",
        f"- Training period: {r['train_period'][0]} to {r['train_period'][1]} ({r['train_hours']:,} station-hours).",
        f"- Held-out test period (last {HOLDOUT_MONTHS} months, never used for fitting): {r['test_period'][0]} to {r['test_period'][1]}.",
        f"- Test hours scored: {r['test_hours_window']:,} station-hours inside the insured window (Mon to Sat, 08:00 to 18:00).",
        "",
        "## Overall, held-out, insured window",
        "",
        "| | raw | corrected |",
        "|---|---|---|",
        f"| MAE (C) | {o['mae']} | {c['mae']} |",
        f"| Bias (C) | {o['bias']} | {c['bias']} |",
        f"| Band agreement, all hours | {o['band_agreement']} | {c['band_agreement']} |",
        f"| MAE when observed is 31 to 34 C | {o['mae_31_34']} | {c['mae_31_34']} |",
        f"| Band agreement when observed is 31 to 34 C | {o['band_agreement_31_34']} | {c['band_agreement_31_34']} |",
        f"| Hit rate: observed 31.5+ and rebuilt 31.5+ | {o['trigger_hit_rate']} | {c['trigger_hit_rate']} |",
        f"| False trigger rate: observed below 31.5, rebuilt 31.5+ | {o['false_trigger_rate']} | {c['false_trigger_rate']} |",
        "",
        "Confusion matrix, corrected (rows observed band, columns rebuilt band):",
        "",
        *_cm_table(c["confusion"]),
        "",
        "## What this means",
        "",
        (
            "Band agreement near the payout threshold is poor. The rebuild is good enough to estimate how often a station "
            "crosses the thresholds over many years (the back-test), but NOT good enough to settle a single hour. Payouts "
            "always use NEA's observed readings; the rebuild is used only for normals, pricing and forecasting."
            if poor
            else "Band agreement near the threshold is acceptable for back-testing frequencies. Payouts still use only NEA's "
            "observed readings; the rebuild is used for normals, pricing and forecasting."
        ),
        "",
        "## Per station, held-out, insured window, corrected",
        "",
        "| station | n | MAE | bias | band agreement | MAE 31-34 | band agreement 31-34 |",
        "|---|---|---|---|---|---|---|",
    ]
    for p in r["per_station"]:
        k = p["corrected"]
        lines.append(f"| {p['station_id']} | {k['n']} | {k['mae']} | {k['bias']} | {k['band_agreement']} | {k['mae_31_34']} | {k['band_agreement_31_34']} |")
    (DOCS / "wbgt-validation.md").write_text("\n".join(lines) + "\n")


if __name__ == "__main__":
    rep = run()
    print(json.dumps({k: rep[k] for k in ("train_period", "test_period", "overall_window_raw", "overall_window_corrected")}, indent=1)[:2500])
