from datetime import datetime

from db import get_client


def publish_alert(product_id: str, current_price: float, historical_avg: float) -> None:
    """Inserta una alerta si no existe una activa para el mismo producto."""
    client = get_client()

    existing = (
        client.table("alerts")
        .select("id")
        .eq("product_id", product_id)
        .eq("is_active", True)
        .execute()
    )
    if existing.data:
        return

    discount_pct = round((historical_avg - current_price) / historical_avg * 100, 2)

    client.table("alerts").insert({
        "product_id": product_id,
        "current_price": current_price,
        "historical_avg": historical_avg,
        "discount_pct": discount_pct,
        "is_active": True,
    }).execute()


def resolve_alert(product_id: str) -> None:
    """Marca como resuelta la alerta activa de un producto."""
    client = get_client()

    active = (
        client.table("alerts")
        .select("id")
        .eq("product_id", product_id)
        .eq("is_active", True)
        .execute()
    )
    if not active.data:
        return

    client.table("alerts").update({
        "is_active": False,
        "resolved_at": datetime.utcnow().isoformat(),
    }).eq("product_id", product_id).eq("is_active", True).execute()
