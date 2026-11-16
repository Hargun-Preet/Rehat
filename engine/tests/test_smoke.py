from fastapi.testclient import TestClient

from rehat.api import app


def test_health() -> None:
    assert TestClient(app).get("/health").json() == {"status": "ok"}


def test_ledger_and_receipt_endpoints() -> None:
    c = TestClient(app)
    r = c.get("/receipt/T99DM0001B/2025-10")
    assert r.status_code == 200
    body = r.json()
    assert body["firm"]["name"] == "Tanjong Greenworks Pte Ltd"
    assert body["receipt_lines"] and "settlement_date" in body
    led = c.get("/ledger/T99DM0001B/2025-10").json()
    assert led["hours"]
    assert c.get("/receipt/NOPE/2025-10").status_code == 404


def test_quote_uses_only_plan_and_headcount() -> None:
    c = TestClient(app)
    r = c.post("/quote", json={"workers": 20, "plan": "standard"}).json()
    assert r["inputs_used"] == ["plan", "headcount"]
    assert r["premium_before_gst"] == 2575.0
    assert r["premium_with_gst"] == 2806.75
    assert c.post("/quote", json={"workers": 20, "plan": "standard", "nationality": "x"}).status_code == 200  # extra fields ignored
