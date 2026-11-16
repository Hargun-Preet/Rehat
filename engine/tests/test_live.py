from __future__ import annotations

from rehat import api


def _wbgt_page(values: list[float]) -> dict:
    return {
        "records": [
            {
                "datetime": f"2026-11-16T13:{minute:02d}:00+08:00",
                "item": {
                    "readings": [
                        {
                            "station": {"id": "S132", "townCenter": "Jurong West Stadium"},
                            "location": {"latitude": "1.337859", "longitude": "103.695383"},
                            "wbgt": value,
                        }
                    ]
                },
            }
            for minute, value in zip((0, 15, 30, 45), values, strict=True)
        ]
    }


def _psi_page() -> dict:
    return {
        "items": [
            {
                "timestamp": "2026-11-16T13:00:00+08:00",
                "readings": {"psi_twenty_four_hourly": {"west": 44}},
            }
        ]
    }


def _configure_live(monkeypatch, tmp_path, wbgt: dict, psi: dict) -> list[tuple[str, dict[str, str]]]:
    now = api._singapore_now()
    calls: list[tuple[str, dict[str, str]]] = []
    monkeypatch.setattr(api, "LIVE_CACHE_ROOT", tmp_path)
    monkeypatch.setattr(api, "_singapore_now", lambda: now)

    def fake_request(url: str, params: dict[str, str]) -> dict:
        calls.append((url, params))
        return wbgt if url.endswith("/weather") else psi

    monkeypatch.setattr(api, "_request_live_data", fake_request)
    return calls


def test_live_uses_singapore_day_and_a_completed_hour(monkeypatch, tmp_path) -> None:
    calls = _configure_live(monkeypatch, tmp_path, _wbgt_page([31.9, 32.0, 32.2, 32.1]), _psi_page())

    body = api.get_live()

    assert api.SINGAPORE_TZ.key == "Asia/Singapore"
    assert body["day"] == api._singapore_now().date().isoformat()
    assert body["timezone"] == "Asia/Singapore"
    assert body["availability"] == "available"
    assert body["cache"]["status"] == "refreshed"
    assert all(params["date"] == body["day"] for _, params in calls)
    station = body["stations"][0]
    assert station["name"] == "Jurong West Stadium"
    assert station["sample_count"] == 4
    assert station["wbgt"] == 32.05
    assert station["state"] == "TRIGGERED"
    assert station["rest_minutes"] == station["rest_if_hour_mean"] == 10
    assert body["psi"] == {"ts": "2026-11-16T13:00:00+08:00", "regions": {"west": 44}, "state": "AVAILABLE"}


def test_live_marks_an_incomplete_hour_pending(monkeypatch, tmp_path) -> None:
    incomplete = _wbgt_page([32.1, 32.0, 31.9, 31.8])
    incomplete["records"] = incomplete["records"][:2]
    calls = _configure_live(monkeypatch, tmp_path, incomplete, _psi_page())

    body = api.get_live()

    assert len(calls) == 2
    station = body["stations"][0]
    assert station["sample_count"] == 2
    assert station["wbgt"] is None
    assert station["state"] == "PENDING"
    assert station["rest_minutes"] is None


def test_live_reuses_the_short_lived_disk_cache(monkeypatch, tmp_path) -> None:
    calls = _configure_live(monkeypatch, tmp_path, _wbgt_page([30.0, 30.1, 30.2, 30.3]), _psi_page())

    first = api.get_live()
    second = api.get_live()

    assert first["cache"]["status"] == "refreshed"
    assert second["cache"]["status"] == "cached"
    assert len(calls) == 2  # One WBGT request and one PSI request, despite two API calls.


def test_live_returns_pending_when_neas_current_day_is_empty(monkeypatch, tmp_path) -> None:
    _configure_live(monkeypatch, tmp_path, {"records": []}, {"items": []})

    body = api.get_live()

    assert body["availability"] == "pending"
    assert body["stations"] == []
    assert body["message"] == "NEA has not published WBGT readings for this Singapore date yet. They remain pending."


def test_live_keeps_a_valid_heat_reading_when_psi_is_unavailable(monkeypatch, tmp_path) -> None:
    _configure_live(monkeypatch, tmp_path, _wbgt_page([30.0, 30.1, 30.2, 30.3]), _psi_page())
    original_request = api._request_live_data

    def fail_psi(url: str, params: dict[str, str]) -> dict:
        if url.endswith("/psi"):
            raise OSError("offline")
        return original_request(url, params)

    monkeypatch.setattr(api, "_request_live_data", fail_psi)
    body = api.get_live()

    assert body["availability"] == "available"
    assert body["stations"][0]["state"] == "NOT_TRIGGERED"
    assert body["psi"] == {"ts": None, "regions": {}, "state": "PENDING"}
    assert body["cache"]["status"] == "partial"
