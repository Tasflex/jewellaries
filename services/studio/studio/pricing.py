"""Retail pricing for dropshipped products.

* Charm pricing: prices end in 9 ($39, $49 …). For jewellery under $200 a round
  "9" ending reads as considered rather than discount-bin (.99 cheapens luxury).
* Anchoring: every product carries a compare-at price ~1.5–1.7× retail, which
  the storefront shows struck through next to the real price.
* Margin floor: retail always covers landed cost (item + shipping) × MIN_MULTIPLE
  so paid ads stay profitable.
"""
from __future__ import annotations

import math

MIN_MULTIPLE = 3.2   # retail ≥ landed cost × this
TARGET_MULTIPLE = 4.5


def charm(x: float) -> int:
    """Round up to the next price ending in 9 (or 5 under $40)."""
    x = max(x, 9)
    if x < 40:
        base = math.ceil(x)
        while base % 10 not in (5, 9):
            base += 1
        return base
    return int(math.ceil((x + 1) / 10.0) * 10 - 1)


def retail_for(cost: float, shipping: float = 0.0) -> dict:
    landed = cost + shipping
    price = charm(max(landed * MIN_MULTIPLE, cost * TARGET_MULTIPLE))
    compare_at = charm(price * 1.6)
    return {
        "price": price,
        "compare_at": compare_at,
        "margin": round(price - landed, 2),
        "margin_pct": round((price - landed) / price * 100, 1),
    }
