"""
Entry point del scraper ErrorDeals CR.
Corre todos los adapters, guarda snapshots en Supabase,
detecta anomalías y publica/resuelve alertas.
"""
import asyncio
import logging
from datetime import datetime, timedelta

from dotenv import load_dotenv
load_dotenv()

from adapters.gollo import GolloAdapter
from adapters.monge import MongeAdapter
from adapters.walmart import WalmartAdapter
from config import get_settings
from db import get_client
from detector import detect_anomaly
from models import Product
from logger import log_run, get_consecutive_failures
from publisher import publish_alert, resolve_alert

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

ADAPTERS = [WalmartAdapter(), GolloAdapter(), MongeAdapter()]


def upsert_product(client, product: Product) -> str:
    """Inserta o actualiza el producto y retorna su UUID."""
    result = client.table("products").upsert(
        {
            "store": product.store,
            "name": product.name,
            "url": product.url,
            "image_url": product.image_url,
        },
        on_conflict="url",
    ).execute()
    return result.data[0]["id"]


def save_snapshot(client, product_id: str, price: float) -> None:
    client.table("price_snapshots").insert({
        "product_id": product_id,
        "price": price,
    }).execute()


def get_recent_snapshots(client, product_id: str, days: int) -> list[float]:
    since = (datetime.utcnow() - timedelta(days=days)).isoformat()
    result = (
        client.table("price_snapshots")
        .select("price")
        .eq("product_id", product_id)
        .gte("scraped_at", since)
        .order("scraped_at", desc=True)
        .execute()
    )
    return [row["price"] for row in result.data]


async def process_store(adapter) -> None:
    from engine import scrape_adapter

    logger.info(f"Scrapeando {adapter.store_id}...")
    try:
        products = await scrape_adapter(adapter)

        if not products:
            logger.warning(f"[{adapter.store_id}] No se encontraron productos")
            return

        client = get_client()
        settings = get_settings()
        history_days: int = settings["detection"]["history_days"]

        for product in products:
            try:
                product_id = upsert_product(client, product)
                save_snapshot(client, product_id, product.price)

                snapshots = get_recent_snapshots(client, product_id, history_days)
                historical = snapshots[1:] if len(snapshots) > 1 else []

                if detect_anomaly(product.price, historical):
                    avg = sum(historical) / len(historical)
                    logger.info(f"ALERTA: {product.name} @ ₡{product.price:,.0f} (normal: ₡{avg:,.0f})")
                    publish_alert(product_id, product.price, avg)
                else:
                    resolve_alert(product_id)

            except Exception as e:
                logger.error(f"Error procesando {product.url}: {e}")

        log_run(adapter.store_id, "success", len(products))
        logger.info(f"[{adapter.store_id}] {len(products)} productos procesados")

    except Exception as e:
        logger.error(f"[{adapter.store_id}] Scraping fallido: {e}")
        log_run(adapter.store_id, "error", 0, str(e))

        failures = get_consecutive_failures(adapter.store_id)
        if failures >= 3:
            logger.critical(
                f"[{adapter.store_id}] ALERTA: {failures} fallos consecutivos. "
                f"Revisar si la tienda cambió su HTML o está bloqueando el scraper."
            )


async def main() -> None:
    logger.info("=== ErrorDeals CR Scraper iniciado ===")
    for adapter in ADAPTERS:
        await process_store(adapter)
    logger.info("=== Scraper finalizado ===")


if __name__ == "__main__":
    asyncio.run(main())
