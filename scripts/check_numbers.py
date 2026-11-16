#!/usr/bin/env python3
"""Check the versioned product source and report legacy v1 values in source code.

This intentionally scans only executable web and engine source.  It is a
migration guard, not a broad prose linter: each pattern identifies a retired
plan, launch-credit construct, obsolete economics split, or a known v1 price
or pilot figure.  Product source modules are excluded because they are the
authoritative location for product values.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


@dataclass(frozen=True)
class Finding:
    path: Path
    line: int
    rule: str
    excerpt: str


@dataclass(frozen=True)
class LegacyRule:
    name: str
    pattern: re.Pattern[str]
    guidance: str


SOURCE_SUFFIXES = {".py", ".ts", ".tsx", ".js", ".jsx"}
SOURCE_ROOTS = (Path("engine/rehat"), Path("web/src"))
ALLOWED_SOURCE_FILES = {
    Path("engine/rehat/product.py"),
    Path("web/src/lib/product.ts"),
    Path("web/src/lib/product.tsx"),
}


def _legacy_rules(product: dict[str, object]) -> tuple[LegacyRule, ...]:
    """Build narrow rules from canonical copy plus known v1-only commercial values."""
    copy = product.get("copy")
    never_say = copy.get("never_say", []) if isinstance(copy, dict) else []
    rules: list[LegacyRule] = [
        LegacyRule(
            "retired Lite plan",
            re.compile(r"\bLite\b", re.IGNORECASE),
            "Use Essential, Standard or Plus from product.json.",
        ),
        LegacyRule(
            "retired launch credit",
            re.compile(r"\blaunch[ _-]?credit\b|\bcredit[ _-]?launch\b", re.IGNORECASE),
            "Remove the launch credit. v2 has no cash launch offer.",
        ),
        LegacyRule(
            "retired 30% launch offer",
            re.compile(r"\b30\s*%[^\n]{0,36}\b(?:launch|credit)\b|\b(?:launch|credit)[^\n]{0,36}\b30\s*%", re.IGNORECASE),
            "Remove the 30% launch offer. v2 has no cash launch offer.",
        ),
        LegacyRule(
            "retired 65/12/5/18 premium split",
            re.compile(r"\b65\s*[/|,]\s*12\s*[/|,]\s*5\s*[/|,]\s*18\b"),
            "Use the v2 65/20/5/10 plan split from product.json.",
        ),
        LegacyRule(
            "retired 12% expense split input",
            re.compile(r"\b(?:variable_expenses|variable_expense_ratio)\b[^\n]{0,48}\b0\.12\b", re.IGNORECASE),
            "Use the v2 20% expenses plan split from product.json.",
        ),
        LegacyRule(
            "retired 18% margin split input",
            re.compile(r"\b(?:fixed_cost_and_margin|margin_ratio)\b[^\n]{0,48}\b0\.18\b", re.IGNORECASE),
            "Use the v2 10% profit plan split from product.json.",
        ),
        LegacyRule(
            "legacy v1 annual price",
            re.compile(r"\b(?:111\.26|120\.37|120\.98|128\.70|75\.62)\b"),
            "Read the v2 plan price from product.json instead of a v1 literal.",
        ),
        LegacyRule(
            "legacy v1 weekly price",
            re.compile(
                r"(?:S\$|\$|week(?:ly)?|price|premium)[^\n]{0,48}\b(?:1\.45|1\.55|2\.14|2\.31|2\.33)\b"
                r"|\b(?:1\.45|1\.55|2\.14|2\.31|2\.33)\b[^\n]{0,48}(?:S\$|\$|week(?:ly)?|price|premium)",
                re.IGNORECASE,
            ),
            "Read the v2 plan price from product.json instead of a v1 literal.",
        ),
        LegacyRule(
            "legacy v1 20-worker premium",
            re.compile(r"\b(?:2,420|2,637)\b"),
            "Use the selected plan's 20-worker example from product.json.",
        ),
        LegacyRule(
            "legacy 300-firm pilot",
            re.compile(r"\b300\s+(?:firms|policies)[^\n]{0,64}\b6[,]?000\s+workers\b", re.IGNORECASE),
            "Use the v2 500-firm, 10,000-worker pilot plan from product.json.",
        ),
        LegacyRule(
            "legacy 300-firm pilot input",
            re.compile(r"\bpilot_firms\b[^\n]{0,32}\b300\b", re.IGNORECASE),
            "Use the v2 500-firm pilot input from product.json.",
        ),
        LegacyRule(
            "legacy 6,000-worker pilot input",
            re.compile(r"\bpilot_workers\b[^\n]{0,32}\b6[,]?000\b", re.IGNORECASE),
            "Use the v2 10,000-worker pilot input from product.json.",
        ),
        LegacyRule(
            "old 60/45 hook",
            re.compile(r"\b60\s+minutes?[^\n]{0,64}\b(?:gets?|get)\s+45\b", re.IGNORECASE),
            "Use the verified hook: the firm pays for 60 minutes and gets 50.",
        ),
    ]
    for phrase in never_say:
        if isinstance(phrase, str) and phrase:
            rules.append(
                LegacyRule(
                    f"forbidden copy: {phrase}",
                    re.compile(re.escape(phrase), re.IGNORECASE),
                    "Use the approved wording in product.json.",
                )
            )
    return tuple(rules)


def _iter_source_files(root: Path) -> Iterable[Path]:
    for relative_root in SOURCE_ROOTS:
        directory = root / relative_root
        if not directory.exists():
            continue
        for path in sorted(directory.rglob("*")):
            relative = path.relative_to(root)
            if path.is_file() and path.suffix in SOURCE_SUFFIXES and relative not in ALLOWED_SOURCE_FILES:
                yield path


def _scan_legacy(root: Path, rules: tuple[LegacyRule, ...]) -> list[Finding]:
    findings: list[Finding] = []
    for path in _iter_source_files(root):
        relative = path.relative_to(root)
        for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
            for rule in rules:
                if rule.pattern.search(line):
                    findings.append(Finding(relative, line_number, rule.name, line.strip()))
    return findings


def _read_product(path: Path, label: str) -> tuple[dict[str, object] | None, str | None]:
    if not path.exists():
        return None, f"{label} is missing: {path}"
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        return None, f"{label} is not valid JSON: {path}: {exc.msg}"
    if not isinstance(value, dict):
        return None, f"{label} must be a JSON object: {path}"
    return value, None


def check(root: Path) -> tuple[list[str], list[Finding]]:
    """Return product-copy errors and source migration findings for a repository root."""
    source_path = root / "data/seed/product.json"
    exported_path = root / "web/public/data/product.json"
    source, source_error = _read_product(source_path, "Canonical product.json")
    exported, exported_error = _read_product(exported_path, "Exported product.json")
    errors = [error for error in (source_error, exported_error) if error]

    if source is not None and exported is not None:
        if source_path.read_bytes() != exported_path.read_bytes():
            errors.append(
                "Exported product.json differs from data/seed/product.json. "
                "Run `make export-fast` to copy the canonical source."
            )

    findings = _scan_legacy(root, _legacy_rules(source)) if source is not None else []
    return errors, findings


def _print_report(errors: list[str], findings: list[Finding], root: Path) -> None:
    for error in errors:
        print(f"ERROR: {error}")
    for finding in findings:
        print(f"LEGACY: {finding.path}:{finding.line}: {finding.rule}")
        print(f"  {finding.excerpt}")

    if errors or findings:
        print()
        print(
            f"check-numbers found {len(errors)} product-copy issue(s) and "
            f"{len(findings)} legacy v1 source reference(s) under {root}."
        )
        if findings:
            print("Move product terms and copy to the v2 product module before removing these references.")
    else:
        print("check-numbers passed: product export matches and no tracked v1 terms remain in executable source.")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1], help="Repository root")
    args = parser.parse_args(argv)
    root = args.root.resolve()
    errors, findings = check(root)
    _print_report(errors, findings, root)
    return 1 if errors or findings else 0


if __name__ == "__main__":
    raise SystemExit(main())
