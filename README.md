# Jewellariess: jewellery that catches the light

A worldwide dropshipping jewellery store. It has three parts:

| Part | Stack | What it does |
|---|---|---|
| `apps/web` | Next.js 15 (App Router, TypeScript) | Storefront: shop, product pages, Watch & Shop reels, stack builder, gift guide, journal, cart, checkout, order tracking. SEO: per-page metadata, JSON-LD (Product, Offer + shipping + returns, Breadcrumb, FAQ, Article, VideoObject), XML sitemap with image/video entries, robots.txt, Google Merchant feed (`/feeds/google.xml`), `llms.txt`. |
| `services/api` | Rust (axum + SQLite) | Catalogue, multi-currency pricing (11 currencies, charm rounding), worldwide shipping zones, server-side cart pricing (the browser never sends amounts), checkout, Paystack payments + signed webhooks, order tracking, newsletter, admin order queue. |
| `services/studio` | Python (Pillow + numpy + ffmpeg) | **Lumière**, our own video engine: 9:16 TikTok/Reels/Shorts videos drawn frame by frame in code, with synthesised sound (no AI, no stock footage). It also does product renders, captions/hashtags, pricing, CJ Dropshipping supplier sync and the fulfilment worker. |

## Design: colour psychology

- **Onyx black**: the luxury backdrop; makes metal and stones pop.
- **Champagne gold**: value and warmth.
- **Rosso red** (`#C8102E`): *only* on buy buttons, badges and urgency. It's the same arousal-and-appetite lever fast-food brands use, and the "passion" red of Italian sports cars. Because red appears nowhere else, the eye learns that red means "do this".
- **Ivory**: breathing room and catalogue clarity for product grids.

## Videos

```bash
cd services/studio
python -m studio videos --jobs 2                # every planned video
python -m studio videos --slug solene-teardrop-pendant --format glint
```

| Format | What happens on screen |
|---|---|
| `glint` | Macro push-in on black velvet; a beam of light sweeps across and each stone flares with a synced bell "ting"; ends on name, price and a call to action. |
| `layering` | Necklaces drop onto a neckline one at a time with labels (Layer 1 · 40 cm …); rings stack for ring sets; ends on the set price. |
| `unboxing` | The signature red box shakes, the lid lifts, light spills out and the piece rises and catches the light. |

Output: `apps/web/public/media/videos/*.mp4` + poster `.jpg`, plus `data/social/manifest.json` with each video's hook, caption, hashtags and UTM link, ready to post. All text stays inside the phone-safe zone so platform buttons never cover it.

## Run locally

```bash
cp .env.example .env
(cd services/api && cargo run --release)          # :8300
(cd apps/web && npm install && npm run dev)       # :3300
```

## Deploy (server)

The code lives at `/var/www/jewellaries`. To deploy:

```bash
bash /var/www/jewellaries/deploy/deploy.sh                 # pull, build, render, restart
SKIP_VIDEOS=1 bash /var/www/jewellaries/deploy/deploy.sh   # code-only deploy
```

Services (systemd): `aurum-api` (:8300), `aurum-web` (:3300), `aurum-fulfil`. nginx: `/etc/nginx/sites-available/jewellaries`.

## Going live checklist

1. **Domain**: point it at the server, add it to `server_name` in `deploy/nginx-jewellaries.conf`, set `SITE_URL` / `NEXT_PUBLIC_SITE_URL`, then run `certbot --nginx -d yourdomain.com`.
2. **Payments**: set `PAYSTACK_SECRET_KEY` and set the Paystack webhook URL to `https://yourdomain.com/api/webhooks/paystack`.
3. **Supplier**: set `CJ_API_KEY`, then map each product's `supplier.sku` / `vids` to real CJ variant IDs and run `python -m studio sync`.
4. **Compare-at prices**: only show a struck-through price while it's a genuine sale price (`NEXT_PUBLIC_SHOW_COMPARE_AT=0` otherwise). Reference-price rules apply in the EU, UK, US and Australia.
5. **Reviews**: ratings only appear (on the page and in Google rich results) once real reviews are added to the catalogue.
6. **Google Merchant Center / TikTok / Meta catalogues**: submit `https://yourdomain.com/feeds/google.xml`.
7. **Search Console**: submit `https://yourdomain.com/sitemap.xml`.
