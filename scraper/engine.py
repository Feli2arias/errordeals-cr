"""
Scraper engine: usa Playwright para renderizar cada URL de categoría
y pasa el HTML al adaptador correspondiente para extraer productos.
"""
import asyncio
import logging
import random
from typing import List

from playwright.async_api import async_playwright, Page

from adapters.base import BaseAdapter
from config import get_settings
from models import Product

logger = logging.getLogger(__name__)


async def _fetch_page_html(page: Page, url: str, timeout_ms: int) -> str:
    """Navega a la URL y retorna el HTML renderizado."""
    await page.goto(url, timeout=timeout_ms, wait_until="domcontentloaded")
    await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    await page.wait_for_timeout(2000)
    return await page.content()


async def scrape_adapter(adapter: BaseAdapter) -> List[Product]:
    """
    Scrapea todas las URLs de categoría del adaptador.
    Retorna lista plana de productos únicos (dedup por URL).
    """
    settings = get_settings()
    scraper_cfg = settings["scraper"]
    user_agents: List[str] = settings["user_agents"]
    seen_urls: set[str] = set()
    all_products: List[Product] = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)

        for url in adapter.get_category_urls():
            ua = random.choice(user_agents)
            context = await browser.new_context(user_agent=ua)
            page = await context.new_page()

            for attempt in range(1, scraper_cfg["max_retries"] + 1):
                try:
                    html = await _fetch_page_html(page, url, scraper_cfg["page_load_timeout_ms"])
                    base_url = "/".join(url.split("/")[:3])
                    products = adapter.parse_products(html, base_url)

                    new_products = [p for p in products if p.url not in seen_urls]
                    seen_urls.update(p.url for p in new_products)
                    all_products.extend(new_products)

                    logger.info(f"[{adapter.store_id}] {url} → {len(products)} productos ({len(new_products)} nuevos)")
                    break
                except Exception as e:
                    logger.warning(f"[{adapter.store_id}] Intento {attempt}/{scraper_cfg['max_retries']} fallido en {url}: {e}")
                    if attempt < scraper_cfg["max_retries"]:
                        await asyncio.sleep(scraper_cfg["retry_delay_seconds"] * (2 ** (attempt - 1)))
                    else:
                        logger.error(f"[{adapter.store_id}] URL fallida tras {scraper_cfg['max_retries']} intentos: {url}")

            await context.close()

        await browser.close()

    return all_products
