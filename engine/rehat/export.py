"""Write every JSON file the web app needs to web/public/data."""
import json
from datetime import datetime, timezone

from rehat.paths import WEB_DATA


def main() -> None:
    WEB_DATA.mkdir(parents=True, exist_ok=True)
    meta = {"generated_at": datetime.now(timezone.utc).isoformat(), "files": []}
    (WEB_DATA / "meta.json").write_text(json.dumps(meta, indent=2))
    print(f"wrote {WEB_DATA / 'meta.json'}")


if __name__ == "__main__":
    main()
