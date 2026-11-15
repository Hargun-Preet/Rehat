PY := engine/.venv/bin/python

.PHONY: setup engine web test export export-fast normalise demo

setup:
	cd engine && python3 -m venv .venv && .venv/bin/pip install -e .
	cd web && npm install

engine:
	cd engine && .venv/bin/uvicorn rehat.api:app --reload --port 8000

web:
	cd web && npm run dev

test:
	cd engine && .venv/bin/python -m pytest -q

# Re-normalise cached raw pulls into parquet (no network).
normalise:
	cd engine && .venv/bin/python -m rehat.ingest --what wbgt,rain,psi --normalise-only

# Full chain from cached data to every JSON the web app reads (no network except nothing; all inputs cached).
export: normalise
	cd engine && .venv/bin/python -m rehat.wbgt_rebuild > /dev/null
	cd engine && .venv/bin/python -m rehat.backtest > /dev/null
	cd engine && .venv/bin/python -m rehat.sitematch > /dev/null
	cd engine && .venv/bin/python -m rehat.pricing > /dev/null
	cd engine && .venv/bin/python -m rehat.liquidity > /dev/null
	cd engine && .venv/bin/python -m rehat.gapfill > /dev/null
	cd engine && .venv/bin/python -m rehat.anomaly > /dev/null
	cd engine && .venv/bin/python -m rehat.export

# Only rewrite web JSON from existing engine outputs.
export-fast:
	cd engine && .venv/bin/python -m rehat.export

# Production build served on :3000; runs with the engine stopped and Wi-Fi off.
demo:
	cd web && npm run build && npm run start
