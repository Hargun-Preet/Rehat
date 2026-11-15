"""Generate the fictional demo book: data/seed/firms.json (300 firms). Deterministic (seed 7).

All firms, UENs, policy numbers and addresses are fictional. UENs use the "T99DM" prefix, which no real entity has.
"""
from __future__ import annotations

import json

import numpy as np

from rehat.paths import SEED
from rehat.stations import assign

TOWNS = [
    ("Jurong West", 1.3404, 103.7090), ("Tuas", 1.3000, 103.6400), ("Woodlands", 1.4382, 103.7890),
    ("Bishan", 1.3526, 103.8352), ("Bedok", 1.3236, 103.9273), ("Tampines", 1.3496, 103.9568),
    ("Punggol", 1.4043, 103.9020), ("Yishun", 1.4304, 103.8354), ("Sengkang", 1.3868, 103.8914),
    ("Choa Chu Kang", 1.3840, 103.7470), ("Clementi", 1.3162, 103.7649), ("Kallang", 1.3100, 103.8650),
    ("Ang Mo Kio", 1.3691, 103.8454), ("Hougang", 1.3612, 103.8863), ("Pasir Ris", 1.3721, 103.9474),
    ("Bukit Batok", 1.3590, 103.7637), ("Toa Payoh", 1.3343, 103.8563), ("Queenstown", 1.2942, 103.7861),
    ("Changi", 1.3570, 103.9870), ("Sembawang", 1.4491, 103.8185), ("Bukit Timah", 1.3294, 103.8021),
    ("Geylang", 1.3201, 103.8918), ("Marina South", 1.2750, 103.8650), ("Mandai", 1.4100, 103.7900),
]
WORDS_A = ["Tanjong", "Sentosa", "Merlion", "Kampong", "Lion City", "Temasek", "Straits", "Harbour", "Orchid", "Banyan",
           "Rain Tree", "Bukit", "Pulau", "Garden City", "Equator", "Sunrise", "Evergreen", "Red Dot", "Pioneer", "Seletar",
           "Kranji", "Jalan", "Raffles Green", "Marina", "Riverside"]
TRADES = {
    "construction": ["Builders", "Construction", "Engineering Works", "Scaffolding", "Formwork", "Civil Works", "Steelworks", "Roofing"],
    "landscaping": ["Greenworks", "Landscape", "Horticulture", "Arbor Services", "Turf Care"],
    "cleaning": ["Outdoor Cleaning", "Environmental Services", "Facility Care", "Estate Services"],
}
WAGE_BANDS = ["S$1,600 to S$2,000", "S$2,000 to S$2,400", "S$2,400 to S$2,600"]


def make_firm(i: int, rng: np.random.Generator, name: str | None = None, town: str | None = None, workers: int | None = None,
              plan: str | None = None, sector: str | None = None, site_match: bool | None = None,
              at: tuple[float, float] | None = None) -> dict:
    sector = sector or rng.choice(["construction"] * 6 + ["landscaping"] * 2 + ["cleaning"] * 2)
    if town:
        t = next(x for x in TOWNS if x[0] == town)
    else:
        t = TOWNS[rng.integers(len(TOWNS))]
    lat = float(t[1] + rng.normal(0, 0.008)) if not town else t[1]
    lon = float(t[2] + rng.normal(0, 0.008)) if not town else t[2]
    if at:
        lat, lon = at
    if name is None:
        name = f"{WORDS_A[rng.integers(len(WORDS_A))]} {TRADES[sector][rng.integers(len(TRADES[sector]))]} Pte Ltd"
    if plan is None:
        u = rng.random()
        plan, site_match = ("Standard", False) if u < 0.6 else (("Lite", False) if u < 0.9 else ("Standard", True))
    workers = workers or int(np.clip(round(rng.lognormal(2.7, 0.55)), 5, 60))
    a = assign(lat, lon)
    return {
        "uen": f"T99DM{i:04d}{'ABCDEFGHJKLMNPQRSTUVWXYZ'[i % 24]}",
        "name": name,
        "trade": sector,
        "sector": sector,
        "outdoor_workers": workers,
        "wage_band": WAGE_BANDS[int(rng.integers(len(WAGE_BANDS)))],
        "sites": [{"address": f"Work site, {t[0]} (fictional)", "lat": round(lat, 5), "lon": round(lon, 5)}],
        "primary_station": a["primary_station"],
        "backup_station": a["backup_station"],
        "rain_gauge": a["rain_gauge"],
        "rain_backup": a["rain_backup"],
        "psi_region": a["psi_region"],
        "station_reason": a["reason"],
        "plan": plan,
        "site_match": bool(site_match),
        "meal_hour": 12,
        "wic_policy_no": f"WIC-DEMO-{100000 + i}",
        "wic_active": True,
        "is_sme": True,
        "cover_start": "2025-01-01",
        "added_midterm": False,
        "mom_heat_action_months": [],
    }


def main() -> None:
    rng = np.random.default_rng(7)
    firms = [
        make_firm(1, rng, "Tanjong Greenworks Pte Ltd", "Jurong West", 20, "Standard", "landscaping", False, at=(1.3366, 103.6972)),
        make_firm(2, rng, "Lim Landscaping Pte Ltd", "Bishan", 20, "Standard", "landscaping", False, at=(1.3560, 103.8505)),
        make_firm(3, rng, "Straits Scaffolding Pte Ltd", "Tuas", 35, "Standard", "construction", True),
    ]
    seen = {f["name"] for f in firms}
    i = 4
    while len(firms) < 300:
        f = make_firm(i, rng)
        if f["name"] in seen:
            f["name"] = f["name"].replace(" Pte Ltd", f" ({f['sites'][0]['address'].split(', ')[1].split(' (')[0]}) Pte Ltd")
        if f["name"] in seen:
            continue
        seen.add(f["name"])
        firms.append(f)
        i += 1
    (SEED / "firms.json").write_text(json.dumps(firms, indent=1))
    plans = {p: sum(1 for f in firms if f["plan"] == p and not f["site_match"]) for p in ("Standard", "Lite")}
    print(f"{len(firms)} firms, {sum(f['outdoor_workers'] for f in firms)} workers, plans {plans}, site match {sum(f['site_match'] for f in firms)}")
    print(firms[0]["station_reason"])


if __name__ == "__main__":
    main()
