"""Supplier adapters for dropshipping.

CJ Dropshipping is the default (good jewellery range, ships worldwide from
CN/US/EU warehouses, has an order API). Without CJ_API_KEY every call runs
in dry-run mode and returns realistic fake data, so the pipeline can be
exercised end to end before the supplier account exists.
"""
from __future__ import annotations

import os
import time
import uuid
from dataclasses import dataclass

import httpx

CJ_BASE = "https://developers.cjdropshipping.com/api2.0/v1"


@dataclass
class SupplierOrder:
    supplier: str
    supplier_order_id: str
    status: str
    dry_run: bool


class CJ:
    name = "cj"

    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or os.getenv("CJ_API_KEY")
        self.dry_run = not self.api_key
        self._token: str | None = None
        self._token_exp = 0.0
        self.http = httpx.Client(timeout=30)

    # --- auth ---
    def token(self) -> str:
        if self._token and time.time() < self._token_exp:
            return self._token
        r = self.http.post(f"{CJ_BASE}/authentication/getAccessToken", json={"apiKey": self.api_key})
        r.raise_for_status()
        data = r.json()
        if not data.get("result"):
            raise RuntimeError(f"CJ auth failed: {data.get('message')}")
        self._token = data["data"]["accessToken"]
        self._token_exp = time.time() + 60 * 60 * 24 * 10  # tokens last ~15 days
        return self._token

    def _get(self, path: str, **params):
        r = self.http.get(f"{CJ_BASE}{path}", params=params, headers={"CJ-Access-Token": self.token()})
        r.raise_for_status()
        return r.json()

    def _post(self, path: str, body: dict):
        r = self.http.post(f"{CJ_BASE}{path}", json=body, headers={"CJ-Access-Token": self.token()})
        r.raise_for_status()
        return r.json()

    # --- catalogue ---
    def search(self, keyword: str, page: int = 1, size: int = 20) -> list[dict]:
        if self.dry_run:
            return [{"pid": f"DRY-{keyword[:4].upper()}-{i}", "productNameEn": f"{keyword.title()} #{i}",
                     "sellPrice": 6.5 + i, "productImage": None} for i in range(1, 4)]
        data = self._get("/product/list", productNameEn=keyword, pageNum=page, pageSize=size)
        return data.get("data", {}).get("list", [])

    def product(self, pid: str) -> dict:
        if self.dry_run:
            return {"pid": pid, "sellPrice": 7.0, "variants": [{"vid": f"{pid}-V1", "variantSellPrice": 7.0}]}
        return self._get("/product/query", pid=pid).get("data", {})

    def stock(self, vid: str) -> int:
        if self.dry_run:
            return 50
        data = self._get("/product/stock/queryByVid", vid=vid).get("data") or []
        return sum(int(w.get("storageNum", 0)) for w in data)

    def freight(self, vid: str, country: str, qty: int = 1) -> list[dict]:
        if self.dry_run:
            return [{"logisticName": "CJPacket Ordinary", "logisticPrice": 3.1, "logisticAging": "7-12"}]
        body = {"startCountryCode": "CN", "endCountryCode": country, "products": [{"quantity": qty, "vid": vid}]}
        return self._post("/logistic/freightCalculate", body).get("data") or []

    # --- orders ---
    def create_order(self, order: dict) -> SupplierOrder:
        """order: the API's order record (id, items, address)."""
        if self.dry_run:
            return SupplierOrder(self.name, f"DRY-{uuid.uuid4().hex[:10].upper()}", "created", True)
        a = order["address"]
        products = []
        for it in order["items"]:
            for vid in it.get("supplier_vids") or [it.get("supplier_sku")]:
                products.append({"vid": vid, "quantity": it["qty"]})
        body = {
            "orderNumber": order["id"],
            "shippingCountryCode": a["country"],
            "shippingCountry": a.get("country_name", a["country"]),
            "shippingProvince": a.get("region", ""),
            "shippingCity": a["city"],
            "shippingAddress": a["line1"] + (" " + a["line2"] if a.get("line2") else ""),
            "shippingZip": a.get("postal_code", ""),
            "shippingCustomerName": a["name"],
            "shippingPhone": a.get("phone", ""),
            "remark": "Gift order: no invoice in parcel, please." if order.get("gift") else "",
            "fromCountryCode": "CN",
            "logisticName": os.getenv("CJ_LOGISTIC", "CJPacket Ordinary"),
            "products": products,
        }
        data = self._post("/shopping/order/createOrderV2", body)
        if not data.get("result"):
            raise RuntimeError(f"CJ order failed: {data.get('message')}")
        return SupplierOrder(self.name, data["data"]["orderId"], "created", False)

    def tracking(self, supplier_order_id: str) -> dict | None:
        if self.dry_run:
            return None
        data = self._get("/shopping/order/getOrderDetail", orderId=supplier_order_id).get("data") or {}
        if data.get("trackNumber"):
            return {"tracking_number": data["trackNumber"], "carrier": data.get("logisticName"), "status": "shipped"}
        return None


SUPPLIERS = {"cj": CJ}


def get(name: str):
    return SUPPLIERS[name]()
