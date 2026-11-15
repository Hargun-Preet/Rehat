import pytest
from fastapi.testclient import TestClient

from rehat import uen
from rehat.api import app


@pytest.mark.parametrize("u,kind", [("201912345K", "local_company"), ("53123456A", "business"), ("T08LL1234A", "other_entity"), (" 201912345k ", "local_company")])
def test_valid_formats(u: str, kind: str) -> None:
    r = uen.format_check(u)
    assert r["format_ok"] and r["kind"] == kind


@pytest.mark.parametrize("u", ["", "12345", "2019123456K", "ABCDEFGHIJ", "299912345K"])
def test_invalid_formats(u: str) -> None:
    assert not uen.format_check(u)["format_ok"]


def test_demo_uen_never_sent(monkeypatch) -> None:
    def boom(*a, **k):
        raise AssertionError("network called for a demo UEN")

    monkeypatch.setattr(uen.requests, "get", boom)
    r = uen.check("T99DM0001B")
    assert r["kind"] == "demo" and r["acra"]["demo"]


class _Resp:
    def __init__(self, records):
        self._r = records

    def raise_for_status(self):
        pass

    def json(self):
        return {"success": True, "result": {"records": self._r}}


def test_lookup_found_and_cached(monkeypatch, tmp_path) -> None:
    monkeypatch.setattr(uen, "CACHE", tmp_path)
    calls = []

    def fake(url, params, timeout):
        calls.append(params)
        return _Resp([{"uen": "201912345K", "entity_name": "EXAMPLE PTE. LTD.", "uen_status_desc": "Registered", "entity_type_desc": "Local Company", "uen_issue_date": "2019-04-01"}])

    monkeypatch.setattr(uen.requests, "get", fake)
    a = uen.check("201912345K")
    b = uen.check("201912345K")
    assert a["acra"]["found"] and a["acra"]["live"] and a["acra"]["name"] == "EXAMPLE PTE. LTD."
    assert b["acra"] == a["acra"]
    assert len(calls) == 1  # cached: never hit the API twice


def test_lookup_not_found(monkeypatch, tmp_path) -> None:
    monkeypatch.setattr(uen, "CACHE", tmp_path)
    monkeypatch.setattr(uen.requests, "get", lambda url, params, timeout: _Resp([]))
    assert uen.check("201999999Z")["acra"]["found"] is False


def test_network_failure_is_offline_not_error(monkeypatch, tmp_path) -> None:
    monkeypatch.setattr(uen, "CACHE", tmp_path)

    def fail(*a, **k):
        raise uen.requests.ConnectionError("no wifi")

    monkeypatch.setattr(uen.requests, "get", fail)
    assert uen.check("201912345K")["acra"]["offline"] is True


def test_endpoint_demo() -> None:
    r = TestClient(app).get("/uen/T99DM0001B").json()
    assert r["kind"] == "demo"
    assert TestClient(app).get("/uen/hello").json()["format_ok"] is False
