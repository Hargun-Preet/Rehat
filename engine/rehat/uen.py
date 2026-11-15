"""UEN check: format, then ACRA's public register on data.gov.sg.

Verified 2026-11-15:
  GET https://data.gov.sg/api/action/datastore_search
      ?resource_id=d_3f960c10fed6145404ca7b821f263b87   ("Entities Registered with ACRA", updated monthly)
      &filters={"uen":"<UEN>"}
  result.records[].{uen, entity_name, entity_type_desc, uen_status_desc, uen_issue_date, reg_street_name, reg_postal_code}
No key needed. The register has no headcount, wages or activity code.

Formats (uen.gov.sg, via third-party summaries; the check letter algorithm is not published by ACRA, so only the shape
is checked here):
  business (ROB)      8 digits + letter          e.g. 53xxxxxxxA
  local company (ROC) 4-digit year + 5 digits + letter
  other entities      T/S/R + 2-digit year + 2-letter entity type + 4 digits + letter

The production route is Corppass sign-in plus Myinfo Business, which needs Income to be onboarded with GovTech.
Fictional demo UENs start with T99DM and are never sent to ACRA.
"""
from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from typing import Any

import requests

from rehat.ingest.cache import read_cached, write_cached
from rehat.paths import RAW

ACRA_URL = "https://data.gov.sg/api/action/datastore_search"
ACRA_RESOURCE = "d_3f960c10fed6145404ca7b821f263b87"
CACHE = RAW / "acra"
DEMO_PREFIX = "T99DM"

PATTERNS = [
    ("business", re.compile(r"^\d{8}[A-Z]$")),
    ("local_company", re.compile(r"^(19|20)\d{2}\d{5}[A-Z]$")),
    ("other_entity", re.compile(r"^[TSR]\d{2}[A-Z]{2}\d{4}[A-Z]$")),
]
KIND_TEXT = {"business": "business (ROB)", "local_company": "local company", "other_entity": "other entity"}


def normalise(uen: str) -> str:
    return re.sub(r"\s+", "", uen or "").upper()


def format_check(uen: str) -> dict[str, Any]:
    u = normalise(uen)
    if u.startswith(DEMO_PREFIX):
        return {"uen": u, "format_ok": True, "kind": "demo", "message": "Fictional demo UEN. Not looked up."}
    for kind, pat in PATTERNS:
        if pat.match(u):
            if kind == "local_company" and int(u[:4]) > datetime.now().year:
                break
            return {"uen": u, "format_ok": True, "kind": kind, "message": f"Looks like a {KIND_TEXT[kind]} UEN."}
    return {"uen": u, "format_ok": False, "kind": None,
            "message": "That does not look like a Singapore UEN. A company UEN is 9 digits and a letter, for example 201912345K."}


def acra_lookup(uen: str, timeout: float = 8.0) -> dict[str, Any]:
    """Look up one UEN on ACRA's public register. Cached in data/raw/acra/<UEN>.json (never fetched twice)."""
    u = normalise(uen)
    cache = CACHE / f"{u}.json"
    hit = read_cached(cache)
    if hit is None:
        params = {"resource_id": ACRA_RESOURCE, "filters": json.dumps({"uen": u}), "limit": 1}
        r = requests.get(ACRA_URL, params=params, timeout=timeout)
        r.raise_for_status()
        body = r.json()
        if not body.get("success"):
            raise RuntimeError(f"ACRA register error: {str(body)[:200]}")
        hit = {"records": body["result"].get("records", []), "fetched_at_utc": datetime.now(timezone.utc).isoformat()}
        write_cached(cache, ACRA_URL, params, hit)
    recs = hit["records"]
    if not recs:
        return {"found": False, "checked_at": hit["fetched_at_utc"], "source": "ACRA register on data.gov.sg"}
    x = recs[0]
    return {
        "found": True,
        "name": x.get("entity_name"),
        "status": x.get("uen_status_desc"),
        "live": (x.get("uen_status_desc") or "").lower().startswith(("registered", "live")),
        "entity_type": x.get("entity_type_desc"),
        "issue_date": x.get("uen_issue_date"),
        "checked_at": hit["fetched_at_utc"],
        "source": "ACRA register on data.gov.sg (updated monthly)",
    }


def check(uen: str) -> dict[str, Any]:
    """Format first, then the register. Never raises: a network problem returns acra.offline = True."""
    out = format_check(uen)
    if not out["format_ok"]:
        out["acra"] = None
        return out
    if out["kind"] == "demo":
        out["acra"] = {"found": False, "demo": True, "source": "not looked up (fictional)"}
        return out
    try:
        out["acra"] = acra_lookup(out["uen"])
    except Exception as e:  # noqa: BLE001
        out["acra"] = {"offline": True, "error": str(e)[:160], "source": "ACRA register on data.gov.sg"}
    return out
