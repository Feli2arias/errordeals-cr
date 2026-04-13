# scraper/tests/test_models.py
from models import Product

def test_product_has_required_fields():
    p = Product(store="walmart", name='TV 55"', url="https://walmart.co.cr/tv", price=299999.0)
    assert p.store == "walmart"
    assert p.price == 299999.0
    assert p.image_url is None  # opcional

def test_product_with_image():
    p = Product(store="gollo", name="Nevera", url="https://gollo.co.cr/nevera", price=150000.0, image_url="https://img.gollo.co.cr/1.jpg")
    assert p.image_url is not None
