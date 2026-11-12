"""Jewellariess studio: product renders, short-form videos, social copy, supplier sync, fulfilment.

    python -m studio render                 # product images  -> apps/web/public/media/products
    python -m studio videos --jobs 4        # 9:16 videos     -> apps/web/public/media/videos
    python -m studio videos --slug solene-teardrop-pendant --format glint
    python -m studio social                 # captions/hashtags manifest only
    python -m studio price 8.5 --ship 3.1   # retail price for a supplier cost
    python -m studio sync                   # stock from supplier, push catalogue to the API
    python -m studio fulfil --loop          # forward paid orders to the supplier
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
CATALOG = ROOT / "data" / "catalog.json"
MEDIA = ROOT / "apps" / "web" / "public" / "media"
MANIFEST = ROOT / "data" / "social" / "manifest.json"
SITE_URL = os.getenv("SITE_URL", "https://jewellariess.com").rstrip("/")
API_URL = os.getenv("API_URL", "http://127.0.0.1:8300").rstrip("/")


def load_catalog() -> dict:
    return json.loads(CATALOG.read_text(encoding="utf-8"))


def video_plan(c: dict) -> list[tuple[str, str]]:
    """Which formats each product gets."""
    plan = []
    for p in c["products"]:
        if p["category"] != "gift-sets":
            plan.append((p["slug"], "glint"))
        if p.get("bundle"):
            plan.append((p["slug"], "layering"))
        if p["category"] == "gift-sets" or "gift" in p.get("tags", []):
            plan.append((p["slug"], "unboxing"))
    return plan


def _render_video(slug: str, fmt: str) -> dict:
    from . import social, video
    c = load_catalog()
    p = next(q for q in c["products"] if q["slug"] == slug)
    hook = social.hook_for(p, fmt)
    clip = {"glint": video.glint, "layering": video.layering, "unboxing": video.unboxing}[fmt](p, c, hook)
    t = time.time()
    meta = video.encode(clip, MEDIA / "videos")
    meta.update(slug=slug, seconds_to_render=round(time.time() - t, 1))
    return meta


def write_manifest(entries: list[dict]):
    from . import social
    c = load_catalog()
    by = {p["slug"]: p for p in c["products"]}
    existing = {}
    if MANIFEST.exists():
        for v in json.loads(MANIFEST.read_text(encoding="utf-8")).get("videos", []):
            if v["slug"] in by:  # drop videos of products that no longer exist
                existing[(v["slug"], v["format"])] = v
    for e in entries:
        p = by[e["slug"]]
        copy = social.caption_for(p, e["format"], e["hook"], SITE_URL)
        existing[(e["slug"], e["format"])] = {
            "slug": e["slug"], "format": e["format"],
            "video": f"/media/videos/{e['video']}", "poster": f"/media/videos/{e['poster']}",
            "duration": e["duration"], **copy,
        }
    order = {"unboxing": 0, "layering": 1, "glint": 2}
    vids = sorted(existing.values(), key=lambda v: (order[v["format"]], v["slug"]))
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps({"generated_at": int(time.time()), "videos": vids}, indent=2, ensure_ascii=False), encoding="utf-8")


def cmd_render(a):
    from .render import render_product
    c = load_catalog()
    for p in c["products"]:
        if a.slug and p["slug"] != a.slug:
            continue
        render_product(p, c, MEDIA / "products")
        print("rendered", p["slug"])


def cmd_videos(a):
    c = load_catalog()
    plan = [(s, f) for s, f in video_plan(c) if (not a.slug or s == a.slug) and (not a.format or f == a.format)]
    print(f"rendering {len(plan)} videos with {a.jobs} workers")
    done = []
    with ProcessPoolExecutor(max_workers=a.jobs) as ex:
        futs = {ex.submit(_render_video, s, f): (s, f) for s, f in plan}
        for fut in as_completed(futs):
            s, f = futs[fut]
            try:
                m = fut.result()
                done.append(m)
                print(f"  ✓ {s} [{f}] {m['seconds_to_render']}s")
            except Exception as e:  # keep going; report at the end
                print(f"  ✗ {s} [{f}]: {e}", file=sys.stderr)
    write_manifest(done)
    print("manifest:", MANIFEST)


def cmd_social(a):
    if not MANIFEST.exists():
        sys.exit("no manifest yet: run `videos` first")
    m = json.loads(MANIFEST.read_text(encoding="utf-8"))
    write_manifest([{**v, "video": Path(v["video"]).name, "poster": Path(v["poster"]).name} for v in m["videos"]])
    print("captions refreshed")


def cmd_price(a):
    from .pricing import retail_for
    print(json.dumps(retail_for(a.cost, a.ship), indent=2))


def _admin_headers():
    tok = os.getenv("ADMIN_TOKEN")
    if not tok:
        sys.exit("ADMIN_TOKEN is not set")
    return {"Authorization": f"Bearer {tok}"}


def cmd_sync(a):
    import httpx
    from . import suppliers
    c = load_catalog()
    sup = suppliers.get("cj")
    for p in c["products"]:
        vid = p["supplier"].get("vid") or p["supplier"]["sku"]
        try:
            p["stock"] = min(sup.stock(vid), 999)
        except Exception as e:
            print("stock check failed", p["slug"], e, file=sys.stderr)
    CATALOG.write_text(json.dumps(c, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    r = httpx.post(f"{API_URL}/v1/admin/catalog", json=c, headers=_admin_headers(), timeout=30)
    print("pushed catalogue:", r.status_code, r.text[:200], "(dry run)" if sup.dry_run else "")


def fulfil_once() -> int:
    import httpx
    from . import suppliers
    h = _admin_headers()
    orders = httpx.get(f"{API_URL}/v1/admin/orders", params={"status": "paid"}, headers=h, timeout=30).json()
    sup = suppliers.get("cj")
    n = 0
    for o in orders.get("orders", []):
        try:
            so = sup.create_order(o)
            body = {"supplier": so.supplier, "supplier_order_id": so.supplier_order_id, "status": "processing"}
        except Exception as e:
            body = {"supplier": "cj", "status": "paid", "note": f"supplier error: {e}"}
        httpx.post(f"{API_URL}/v1/admin/orders/{o['id']}/fulfilment", json=body, headers=h, timeout=30)
        n += 1
        print("forwarded", o["id"], body.get("supplier_order_id", body.get("note")))
    # tracking for orders already with the supplier
    for o in httpx.get(f"{API_URL}/v1/admin/orders", params={"status": "processing"}, headers=h, timeout=30).json().get("orders", []):
        if o.get("supplier_order_id"):
            tr = sup.tracking(o["supplier_order_id"])
            if tr:
                httpx.post(f"{API_URL}/v1/admin/orders/{o['id']}/fulfilment", json={"supplier": "cj", "supplier_order_id": o["supplier_order_id"], **tr}, headers=h, timeout=30)
                print("shipped", o["id"], tr["tracking_number"])
    return n


def cmd_fulfil(a):
    while True:
        try:
            fulfil_once()
        except Exception as e:
            print("fulfil error:", e, file=sys.stderr)
        if not a.loop:
            break
        time.sleep(a.every)


def main(argv=None):
    ap = argparse.ArgumentParser(prog="studio", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("render"); r.add_argument("--slug"); r.set_defaults(fn=cmd_render)
    v = sub.add_parser("videos"); v.add_argument("--slug"); v.add_argument("--format", choices=["glint", "layering", "unboxing"])
    v.add_argument("--jobs", type=int, default=max(1, (os.cpu_count() or 2) - 1)); v.set_defaults(fn=cmd_videos)
    s = sub.add_parser("social"); s.set_defaults(fn=cmd_social)
    p = sub.add_parser("price"); p.add_argument("cost", type=float); p.add_argument("--ship", type=float, default=0); p.set_defaults(fn=cmd_price)
    y = sub.add_parser("sync"); y.set_defaults(fn=cmd_sync)
    f = sub.add_parser("fulfil"); f.add_argument("--loop", action="store_true"); f.add_argument("--every", type=int, default=300); f.set_defaults(fn=cmd_fulfil)
    a = ap.parse_args(argv)
    a.fn(a)


if __name__ == "__main__":
    main()
