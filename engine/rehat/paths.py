"""Repository paths used across the engine."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data"
RAW = DATA / "raw"
PROCESSED = DATA / "processed"
SEED = DATA / "seed"
WEB_DATA = ROOT / "web" / "public" / "data"
DOCS = ROOT / "docs"
