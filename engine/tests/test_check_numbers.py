import importlib.util
import json
import sys
from pathlib import Path


def _checker_module():
    root = Path(__file__).resolve().parents[2]
    path = root / "scripts" / "check_numbers.py"
    spec = importlib.util.spec_from_file_location("check_numbers", path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def test_check_numbers_accepts_matching_export_and_reports_legacy_source(tmp_path) -> None:
    product = {"copy": {"never_say": ["Work must stop at 33"]}}
    source = tmp_path / "data" / "seed" / "product.json"
    exported = tmp_path / "web" / "public" / "data" / "product.json"
    source.parent.mkdir(parents=True)
    exported.parent.mkdir(parents=True)
    payload = json.dumps(product)
    source.write_text(payload, encoding="utf-8")
    exported.write_text(payload, encoding="utf-8")

    engine_source = tmp_path / "engine" / "rehat" / "rules.py"
    engine_source.parent.mkdir(parents=True)
    engine_source.write_text('PLAN = "Lite"\n', encoding="utf-8")

    errors, findings = _checker_module().check(tmp_path)

    assert errors == []
    assert [(finding.rule, finding.line) for finding in findings] == [("retired Lite plan", 1)]


def test_check_numbers_reports_a_stale_offline_product_copy(tmp_path) -> None:
    source = tmp_path / "data" / "seed" / "product.json"
    exported = tmp_path / "web" / "public" / "data" / "product.json"
    source.parent.mkdir(parents=True)
    exported.parent.mkdir(parents=True)
    source.write_text(json.dumps({"copy": {"never_say": []}}), encoding="utf-8")
    exported.write_text(json.dumps({"copy": {"never_say": ["changed"]}}), encoding="utf-8")

    errors, findings = _checker_module().check(tmp_path)

    assert findings == []
    assert errors == [
        "Exported product.json differs from data/seed/product.json. "
        "Run `make export-fast` to copy the canonical source."
    ]
