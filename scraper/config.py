import yaml
from pathlib import Path

_CONFIG_DIR = Path(__file__).parent / "config"


def get_settings() -> dict:
    with open(_CONFIG_DIR / "settings.yaml") as f:
        return yaml.safe_load(f)


def get_stores() -> list[dict]:
    with open(_CONFIG_DIR / "stores.yaml") as f:
        data = yaml.safe_load(f)
    return [s for s in data["stores"] if s.get("enabled", True)]
