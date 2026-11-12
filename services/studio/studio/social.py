"""Hooks, captions and hashtags for TikTok, Instagram Reels and YouTube Shorts.

Hooks are short, curiosity-led first lines that open the video (the first
1.5 s decide whether people keep watching). Captions follow a simple pattern:
hook → one concrete benefit → price anchor → call to action → hashtags.
"""
from __future__ import annotations

import random

HOOKS = {
    "glint": [
        "Watch it catch the light",
        "The necklace everyone asks about",
        "Turn your sound on for this sparkle",
        "This is what ${price} looks like",
        "POV: you found your everyday piece",
        "Waterproof. Tarnish-free. Obsessed.",
    ],
    "layering": [
        "How to layer necklaces without the tangle",
        "The 3-chain stack that goes with everything",
        "Stacking rings the right way",
        "Build the stack with me",
    ],
    "unboxing": [
        "Unboxing the gift she will never take off",
        "The box is half the gift",
        "What ${price} of sparkle looks like unboxed",
        "Gift idea they will actually wear",
    ],
}

BASE_TAGS = ["#jewelrytok", "#jewellery", "#goldjewelry", "#aurumrosso"]
FORMAT_TAGS = {
    "glint": ["#sparkle", "#everydayjewelry", "#waterproofjewelry", "#asmr"],
    "layering": ["#layeringnecklaces", "#necklacestack", "#ringstack", "#stylingtips"],
    "unboxing": ["#unboxing", "#giftideas", "#giftforher", "#jewelrygift"],
}
CATEGORY_TAGS = {
    "necklaces": ["#necklace", "#pendantnecklace"],
    "earrings": ["#earrings", "#huggiehoops"],
    "rings": ["#rings", "#stackablerings"],
    "bracelets": ["#tennisbracelet", "#braceletstack"],
    "gift-sets": ["#giftset", "#giftbox"],
}


def hook_for(p: dict, fmt: str, seed: int = 0) -> str:
    rnd = random.Random(f"{p['slug']}:{fmt}:{seed}")
    options = HOOKS[fmt]
    if fmt == "layering" and p.get("category") == "gift-sets" and any("ring" in s or "band" in s for s in p.get("bundle", [])):
        options = ["Stacking rings the right way", "Build the stack with me"]
    elif fmt == "layering":
        options = [h for h in options if "ring" not in h.lower()]
    return rnd.choice(options).replace("${price}", f"${p['price']:.0f}")


def caption_for(p: dict, fmt: str, hook: str, site_url: str) -> dict:
    benefit = p.get("highlights", [""])[0]
    save = p["compare_at"] - p["price"]
    lines = [
        hook + " ✨",
        f"{p['name']}: {p['short']}",
        f"✔ {benefit}" if benefit else "",
        f"${p['price']:.0f} (was ${p['compare_at']:.0f}, you save ${save:.0f}) · Free worldwide shipping over $59",
        "Tap the link in bio to shop 🔗",
    ]
    tags = BASE_TAGS + FORMAT_TAGS[fmt] + CATEGORY_TAGS.get(p["category"], [])
    url = f"{site_url}/product/{p['slug']}?utm_source=social&utm_medium=video&utm_campaign={fmt}"
    return {
        "hook": hook,
        "caption": "\n".join(x for x in lines if x),
        "hashtags": tags,
        "link": url,
        "best_times_utc": ["12:00", "17:00", "20:00"],
        "platforms": {
            "tiktok": {"max_len": 2200, "tip": "Post with a trending sound at low volume under the synth track."},
            "instagram": {"max_len": 2200, "tip": "Use the poster frame as the Reel cover; add product tag."},
            "youtube_shorts": {"title": f"{hook} | {p['name']} #shorts"[:100]},
        },
    }
