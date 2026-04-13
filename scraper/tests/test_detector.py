import pytest
from detector import detect_anomaly

NORMAL_HISTORY = [100_000, 102_000, 98_000, 101_000, 100_500, 99_500]


def test_no_alert_with_insufficient_history():
    result = detect_anomaly(current_price=10_000, snapshots=[100_000, 99_000, 101_000])
    assert result is False


def test_no_alert_with_exactly_four_snapshots():
    result = detect_anomaly(current_price=10_000, snapshots=[100_000] * 4)
    assert result is False


def test_alert_triggered_at_60pct_discount():
    result = detect_anomaly(current_price=35_000, snapshots=NORMAL_HISTORY)
    assert result is True


def test_no_alert_on_normal_sale():
    result = detect_anomaly(current_price=80_000, snapshots=NORMAL_HISTORY)
    assert result is False


def test_no_alert_at_59pct_discount():
    avg = sum(NORMAL_HISTORY) / len(NORMAL_HISTORY)
    price_at_59 = avg * 0.41
    result = detect_anomaly(current_price=price_at_59, snapshots=NORMAL_HISTORY)
    assert result is False


def test_alert_at_exactly_60pct_discount():
    avg = sum(NORMAL_HISTORY) / len(NORMAL_HISTORY)
    price_at_60 = avg * 0.40
    result = detect_anomaly(current_price=price_at_60, snapshots=NORMAL_HISTORY)
    assert result is True


def test_no_alert_when_history_is_zero():
    result = detect_anomaly(current_price=0.0, snapshots=[0.0] * 5)
    assert result is False
