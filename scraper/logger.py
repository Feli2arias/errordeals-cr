"""Guarda resultados de cada run del scraper en Supabase para monitoreo."""
from db import get_client


def log_run(store_id: str, status: str, products_found: int = 0, error_message: str = None) -> None:
    """
    Registra el resultado de un run de scraping.

    Args:
        store_id: Identificador de la tienda ('walmart', 'gollo', 'monge')
        status: 'success' o 'error'
        products_found: Cantidad de productos encontrados (0 en caso de error)
        error_message: Mensaje de error si status == 'error'
    """
    client = get_client()
    client.table("scraper_logs").insert({
        "store_id": store_id,
        "status": status,
        "products_found": products_found,
        "error_message": error_message,
    }).execute()


def get_consecutive_failures(store_id: str) -> int:
    """Retorna cuántos runs consecutivos fallaron para una tienda."""
    client = get_client()
    result = (
        client.table("scraper_logs")
        .select("status")
        .eq("store_id", store_id)
        .order("ran_at", desc=True)
        .limit(10)
        .execute()
    )
    count = 0
    for row in result.data:
        if row["status"] == "error":
            count += 1
        else:
            break
    return count
