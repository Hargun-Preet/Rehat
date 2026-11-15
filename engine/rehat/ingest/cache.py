"""Disk cache for external API responses.

Every response is stored with the request URL, params and a UTC fetch timestamp.
AGENTS.md: never hit an API twice for the same request.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def read_cached(path: Path) -> Any | None:
    if path.exists():
        return json.loads(path.read_text())["response"]
    return None


def write_cached(path: Path, url: str, params: dict[str, Any], response: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    envelope = {
        "url": url,
        "params": params,
        "fetched_at_utc": datetime.now(timezone.utc).isoformat(),
        "response": response,
    }
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(envelope))
    tmp.replace(path)
