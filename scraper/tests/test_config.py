from config import get_settings, get_stores


def test_settings_has_required_keys():
    s = get_settings()
    assert "min_snapshots_required" in s["detection"]
    assert "discount_threshold" in s["detection"]
    assert s["detection"]["min_snapshots_required"] == 5
    assert s["detection"]["discount_threshold"] == 0.60


def test_stores_has_three_stores():
    stores = get_stores()
    names = [st["id"] for st in stores]
    assert "walmart" in names
    assert "gollo" in names
    assert "monge" in names
