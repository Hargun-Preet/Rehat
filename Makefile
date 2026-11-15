PY := engine/.venv/bin/python

.PHONY: setup engine web test export

setup:
	cd engine && python3 -m venv .venv && .venv/bin/pip install -e .
	cd web && npm install

engine:
	cd engine && .venv/bin/uvicorn rehat.api:app --reload --port 8000

web:
	cd web && npm run dev

test:
	cd engine && .venv/bin/python -m pytest -q

export:
	cd engine && .venv/bin/python -m rehat.export
