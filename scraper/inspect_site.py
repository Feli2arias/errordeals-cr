"""
Herramienta de desarrollo: captura el HTML real de una categoría de cada tienda.
Corre una vez, guarda los archivos en tests/fixtures/, y se usa para actualizar
los selectores en config/stores.yaml.

Uso: python inspect_site.py
"""
import asyncio
import random
from pathlib import Path

from playwright.async_api import async_playwright

URLS = {
    "walmart": "https://www.walmart.co.cr/electronica",
    "gollo": "https://www.gollo.co.cr/television",
    "monge": "https://www.monge.co.cr/television",
}

USER_AGENTS = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
]


async def capture(name: str, url: str) -> None:
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(user_agent=random.choice(USER_AGENTS))
        page = await context.new_page()
        try:
            await page.goto(url, timeout=30_000, wait_until="networkidle")
            # Scroll para activar lazy loading
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await page.wait_for_timeout(2000)
            html = await page.content()
            out = Path(__file__).parent / "tests" / "fixtures" / f"{name}_listing.html"
            out.write_text(html, encoding="utf-8")
            print(f"[{name}] OK → {out} ({len(html):,} bytes)")
        except Exception as e:
            print(f"[{name}] ERROR: {e}")
        finally:
            await browser.close()


async def main() -> None:
    for name, url in URLS.items():
        await capture(name, url)
        await asyncio.sleep(1)


if __name__ == "__main__":
    asyncio.run(main())
