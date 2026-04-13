import re
from typing import List

from bs4 import BeautifulSoup

from adapters.base import BaseAdapter
from config import get_stores
from models import Product


def _get_config() -> dict:
    return next(s for s in get_stores() if s["id"] == "monge")


class MongeAdapter(BaseAdapter):
    @property
    def store_id(self) -> str:
        return "monge"

    def get_category_urls(self) -> List[str]:
        return _get_config()["category_urls"]

    def parse_products(self, html: str, base_url: str) -> List[Product]:
        cfg = _get_config()["selectors"]
        soup = BeautifulSoup(html, "html.parser")
        products = []

        for card in soup.select(cfg["product_container"]):
            name_el = card.select_one(cfg["name"])
            price_el = card.select_one(cfg["price"])
            img_el = card.select_one(cfg["image"])
            link_el = card.select_one(cfg["link"])

            if not name_el or not price_el or not link_el:
                continue

            raw = re.sub(r"[^\d]", "", price_el.get_text())
            try:
                price = float(raw)
            except ValueError:
                continue

            href = link_el.get("href", "")
            url = href if href.startswith("http") else base_url.rstrip("/") + href

            products.append(Product(
                store=self.store_id,
                name=name_el.get_text(strip=True),
                url=url,
                price=price,
                image_url=img_el.get("src") or img_el.get("data-src") if img_el else None,
            ))

        return products
