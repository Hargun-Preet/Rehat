import json

import pytest
from fastapi.testclient import TestClient

from rehat import export, product
from rehat.api import app


def test_product_loader_exposes_v2_terms_and_copy() -> None:
    spec = product.load_product()

    assert spec.product.name == "Rehat"
    assert spec.default_plan.id == "standard"
    assert spec.plan_by_id("essential").allowance_multiple == 1.5
    assert spec.demo_firm.name == "Tanjong Greenworks Pte Ltd"
    assert spec.copy_text("may_not_pay").startswith("Rehat pays only when NEA's published readings")
    stress = product.product_dict()["reinsurance"]["haze_stress_scenario"]
    assert stress["loss_ratio"] == 2.61
    assert stress["source"] == "simulation"


def test_product_loader_rejects_an_invalid_plan_multiple(tmp_path) -> None:
    raw = json.loads(product.product_path().read_text(encoding="utf-8"))
    raw["plans"][1]["allowance_multiple"] = 1.4
    invalid = tmp_path / "product.json"
    invalid.write_text(json.dumps(raw), encoding="utf-8")

    with pytest.raises(product.ProductValidationError, match="deductible multiple"):
        product.load_product(invalid)


def test_product_endpoint_returns_the_canonical_export_shape() -> None:
    response = TestClient(app).get("/product")

    assert response.status_code == 200
    body = response.json()
    assert body["version"] == "2.0"
    assert body["demo_firm"]["uen"] == "202012345K"
    assert [plan["id"] for plan in body["plans"]] == ["essential", "standard", "plus"]
    assert body["copy"]["footer"].startswith("Concept prototype")


def test_export_copies_the_product_file_without_reformatting(tmp_path, monkeypatch) -> None:
    monkeypatch.setattr(export, "WEB_DATA", tmp_path)

    export.product_data()

    assert (tmp_path / "product.json").read_bytes() == product.product_path().read_bytes()
