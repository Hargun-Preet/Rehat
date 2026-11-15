from datetime import date

import pytest
from fastapi.testclient import TestClient

from rehat import sitematch
from rehat.api import app
from rehat.paths import SEED

UEN = "T99DM0001B"
DAY = "2025-10-31"


@pytest.fixture(scope="module", autouse=True)
def samples():
    sitematch.write_sample_logs()


def _post(name: str) -> dict:
    csv = (SEED / "site_logs" / name).read_text()
    r = TestClient(app).post("/sitematch/check", json={"uen": UEN, "day": DAY, "csv": csv})
    assert r.status_code == 200
    return r.json()


@pytest.mark.parametrize("name", ["01_honest_contractor_log.csv", "02_honest_shaded_side.csv", "03_honest_open_slab.csv", "04_honest_quarter_hourly.csv"])
def test_honest_logs_approved_with_topup(name: str) -> None:
    c = _post(name)
    assert c["status"] == "APPROVED"
    assert c["topup_minutes_per_worker"] >= 0
    assert all(ch["passed"] for ch in c["checks"])


@pytest.mark.parametrize("name,code", [("05_inflated_plus3.csv", "UPLIFT"), ("06_inflated_plus2_5.csv", "UPLIFT"), ("07_flat_copied.csv", "NOT_FLAT"),
                                       ("08_threshold_bunched.csv", "NOT_BUNCHED"), ("09_pasted_other_day.csv", "SHAPE"), ("10_wrong_day_timestamps.csv", "TIMESTAMPS")])
def test_fakes_sent_for_review_with_reason(name: str, code: str) -> None:
    c = _post(name)
    assert c["status"] == "REVIEW"
    assert c["topup_sgd"] == 0.0
    assert code in [ch["code"] for ch in c["checks"] if not ch["passed"]]
    assert all(ch["text"] for ch in c["checks"])


def test_model_never_rejects() -> None:
    for f in (SEED / "site_logs").glob("*.csv"):
        assert _post(f.name)["status"] in ("APPROVED", "REVIEW")


def test_yearly_cap_on_topup() -> None:
    csv = (SEED / "site_logs" / "03_honest_open_slab.csv").read_text()
    c = sitematch.check_claim(UEN, date(2025, 10, 31), csv, ytd_topup_h=9.9)
    assert c.topup_hours_per_worker <= 0.1 + 1e-9


def test_only_a_person_declines(tmp_path, monkeypatch) -> None:
    monkeypatch.setattr(sitematch, "QUEUE", tmp_path / "q.json")
    csv = (SEED / "site_logs" / "05_inflated_plus3.csv").read_text()
    c = sitematch.check_claim(UEN, date(2025, 10, 31), csv)
    sitematch.enqueue(c)
    out = sitematch.decide(c.claim_id, "decline", "Reviewer A (Income claims)", "Log uplift not explained by site conditions")
    assert out["human_decision"] == "decline"
    assert out["audit"][-1]["by"] == "Reviewer A (Income claims)"


def test_bad_csv_is_a_clear_error() -> None:
    r = TestClient(app).post("/sitematch/check", json={"uen": UEN, "day": DAY, "csv": "a,b\n1,2"})
    assert r.status_code == 422 and "time and wbgt" in r.json()["detail"]
