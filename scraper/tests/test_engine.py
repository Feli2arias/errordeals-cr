from pathlib import Path

import pytest

from adapters.walmart import WalmartAdapter
from adapters.gollo import GolloAdapter
from adapters.monge import MongeAdapter

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.fixture
def walmart_html():
    return (FIXTURES / "walmart_listing.html").read_text(encoding="utf-8")


@pytest.fixture
def gollo_html():
    return (FIXTURES / "gollo_listing.html").read_text(encoding="utf-8")


@pytest.fixture
def monge_html():
    return (FIXTURES / "monge_listing.html").read_text(encoding="utf-8")


# ── Walmart ──────────────────────────────────────────────────────────────────

def test_walmart_adapter_returns_products(walmart_html):
    products = WalmartAdapter().parse_products(walmart_html, "https://www.walmart.co.cr")
    assert len(products) > 0


def test_walmart_product_has_all_fields(walmart_html):
    for p in WalmartAdapter().parse_products(walmart_html, "https://www.walmart.co.cr"):
        assert p.name, f"Sin nombre: {p}"
        assert p.price > 0, f"Precio inválido: {p}"
        assert p.url.startswith("http"), f"URL inválida: {p}"
        assert p.store == "walmart"


def test_walmart_adapter_store_id():
    assert WalmartAdapter().store_id == "walmart"


# ── Gollo ─────────────────────────────────────────────────────────────────────

def test_gollo_adapter_returns_products(gollo_html):
    products = GolloAdapter().parse_products(gollo_html, "https://www.gollo.com")
    assert len(products) > 0


def test_gollo_product_has_all_fields(gollo_html):
    for p in GolloAdapter().parse_products(gollo_html, "https://www.gollo.com"):
        assert p.name
        assert p.price > 0
        assert p.url.startswith("http")
        assert p.store == "gollo"


def test_gollo_adapter_store_id():
    assert GolloAdapter().store_id == "gollo"


# ── Monge ─────────────────────────────────────────────────────────────────────

def test_monge_adapter_returns_products(monge_html):
    products = MongeAdapter().parse_products(monge_html, "https://www.tiendamonge.com")
    assert len(products) > 0


def test_monge_product_has_all_fields(monge_html):
    for p in MongeAdapter().parse_products(monge_html, "https://www.tiendamonge.com"):
        assert p.name
        assert p.price > 0
        assert p.url.startswith("http")
        assert p.store == "monge"


def test_monge_adapter_store_id():
    assert MongeAdapter().store_id == "monge"
