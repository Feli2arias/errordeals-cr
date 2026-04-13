import pytest
from unittest.mock import MagicMock, patch


@pytest.fixture
def mock_client():
    client = MagicMock()
    # Sin alertas activas por defecto
    client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = []
    return client


def test_publish_alert_inserts_new_alert(mock_client):
    with patch("publisher.get_client", return_value=mock_client):
        from publisher import publish_alert
        publish_alert(product_id="uuid-123", current_price=30_000.0, historical_avg=100_000.0)

    mock_client.table.return_value.insert.assert_called_once()
    inserted = mock_client.table.return_value.insert.call_args[0][0]
    assert inserted["product_id"] == "uuid-123"
    assert inserted["current_price"] == 30_000.0
    assert inserted["historical_avg"] == 100_000.0
    assert inserted["discount_pct"] == 70.0
    assert inserted["is_active"] is True


def test_publish_alert_no_duplicate(mock_client):
    mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
        {"id": "existing-alert"}
    ]
    with patch("publisher.get_client", return_value=mock_client):
        from publisher import publish_alert
        publish_alert(product_id="uuid-123", current_price=30_000.0, historical_avg=100_000.0)

    mock_client.table.return_value.insert.assert_not_called()


def test_resolve_alert_sets_resolved_at(mock_client):
    mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
        {"id": "alert-uuid-1", "product_id": "prod-1"}
    ]
    with patch("publisher.get_client", return_value=mock_client):
        with patch("publisher.datetime") as mock_dt:
            mock_dt.utcnow.return_value.isoformat.return_value = "2026-04-12T10:00:00"
            from publisher import resolve_alert
            resolve_alert(product_id="prod-1")

    mock_client.table.return_value.update.assert_called_once_with({
        "is_active": False,
        "resolved_at": "2026-04-12T10:00:00",
    })
