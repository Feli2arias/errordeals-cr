from dataclasses import dataclass
from typing import Optional


@dataclass
class Product:
    store: str
    name: str
    url: str
    price: float
    image_url: Optional[str] = None
    original_price: Optional[float] = None
