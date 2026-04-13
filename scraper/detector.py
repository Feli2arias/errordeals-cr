from typing import List

from config import get_settings


def detect_anomaly(current_price: float, snapshots: List[float]) -> bool:
    """
    Retorna True si current_price representa un error de precio.

    Reglas (configurables en settings.yaml):
    - Requiere al menos `min_snapshots_required` snapshots previos.
    - Si el descuento respecto al promedio histórico supera `discount_threshold`, es anomalía.
    """
    settings = get_settings()
    min_required: int = settings["detection"]["min_snapshots_required"]
    threshold: float = settings["detection"]["discount_threshold"]

    if len(snapshots) < min_required:
        return False

    avg = sum(snapshots) / len(snapshots)
    if avg <= 0:
        return False

    discount = (avg - current_price) / avg
    return discount >= threshold
