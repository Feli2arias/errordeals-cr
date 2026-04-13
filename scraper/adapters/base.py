from abc import ABC, abstractmethod
from typing import List

from models import Product


class BaseAdapter(ABC):
    """Interface que todo adaptador de tienda debe implementar."""

    @property
    @abstractmethod
    def store_id(self) -> str:
        """Identificador único de la tienda (ej: 'walmart')."""
        ...

    @abstractmethod
    def get_category_urls(self) -> List[str]:
        """Lista de URLs de categorías a scrapear."""
        ...

    @abstractmethod
    def parse_products(self, html: str, base_url: str) -> List[Product]:
        """
        Parsea el HTML de una página de categoría y retorna productos.
        Recibe HTML estático (string) para facilitar testing sin Playwright.
        """
        ...
