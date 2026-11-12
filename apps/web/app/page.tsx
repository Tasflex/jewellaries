import Image from "next/image";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import Reel from "@/components/Reel";
import StackBuilder from "@/components/StackBuilder";
import { Newsletter } from "@/components/bits";
import { Price } from "@/components/store";
import { getCatalog, getVideos } from "@/lib/catalog";
import { ARTICLES } from "@/lib/content";
import { SITE } from "@/lib/site";

export const revalidate = 300;

export default async function Home() {
  const [c, videos] = await Promise.all([getCatalog(), getVideos()]);
  const by = Object.fromEntries(c.products.map((p) => [p.slug, p]));
  const heroVid = videos.find((v) => v.slug === "solene-teardrop-pendant" && v.format === "glint") ?? videos.find((v) => v.format === "glint");
  const heroProduct = heroVid ? by[heroVid.slug] : c.products[0];
  const bestsellers = c.products.filter((p) => p.tags.includes("bestseller")).slice(0, 8);
  const reels = videos.slice(0, 10);
  const giftVid = videos.find((v) => v.slug === "midnight-gift-box" && v.format === "unboxing") ?? videos.find((v) => v.format === "unboxing");
  const edit = by["the-layering-edit"];
  const layerPieces = (edit?.bundle ?? []).map((s) => by[s]).filter(Boolean);
  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <span className="eyebrow">Waterproof · 18k gold PVD · Ships worldwide</span>
            <h1>
              Jewellery that <em>catches the light</em>.
            </h1>
            <p className="hero-sub">
              Pieces made to layer, stack and gift, in 18k gold that survives showers, sweat and summer. Every order arrives in
              our signature red box.
            </p>
            <div className="hero-ctas">
              <Link href="/shop" className="btn btn-red btn-xl">
                Shop bestsellers
              </Link>
              <Link href="/watch" className="btn btn-ghost btn-xl">
                ▶ Watch &amp; shop
              </Link>
            </div>
            <div className="hero-proof">
              <span>
                <b>Free</b> shipping over ${SITE.freeShippingUsd}
              </span>
              <span>
                <b>{SITE.returnDays} days</b> easy returns
              </span>
              <span>
                <b>190+</b> countries
              </span>
            </div>
          </div>
          <div className="hero-media">
            {heroVid ? (
              <Reel src={heroVid.video} poster={heroVid.poster} label={heroVid.hook} priority />
            ) : (
              <Image src={`/media/products/${heroProduct.slug}-1.webp`} alt={heroProduct.name} width={760} height={950} priority />
            )}
            <Link href={`/product/${heroProduct.slug}`} className="hero-tag">
              <b>{heroProduct.name}</b>
              <Price usd={heroProduct.price} />
            </Link>
          </div>
        </div>
      </section>

      <section className="trust" aria-label="Why shop with us">
        <div className="wrap">
          <ul>
            <li>Waterproof &amp; tarnish-resistant</li>
            <li>Hypoallergenic 316L steel</li>
            <li>{SITE.returnDays}-day returns</li>
            <li>Gift box with every order</li>
          </ul>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <div>
              <span className="eyebrow">Shop by category</span>
              <h2>Find your piece</h2>
            </div>
            <Link href="/shop" className="link-arrow">
              View all jewellery →
            </Link>
          </div>
          <div className="cats">
            {c.categories.map((k) => {
              const hero = c.products.find((p) => p.category === k.slug && p.tags.includes("bestseller")) ?? c.products.find((p) => p.category === k.slug);
              return (
                <Link key={k.slug} href={`/shop/${k.slug}`} className="cat">
                  {hero && <Image src={`/media/products/${hero.slug}-1.webp`} alt="" fill sizes="(max-width: 560px) 50vw, 20vw" />}
                  <span>{k.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {reels.length > 0 && (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <div className="section-head">
              <div>
                <span className="eyebrow">As seen on TikTok &amp; Reels</span>
                <h2>Caught on camera</h2>
                <p className="muted">Close-ups, layering demos and unboxings. Tap to shop exactly what you see.</p>
              </div>
              <Link href="/watch" className="link-arrow">
                Watch them all →
              </Link>
            </div>
            <div className="reel-row">
              {reels.map((v) => (
                <Reel key={v.video} src={v.video} poster={v.poster} label={by[v.slug]?.name ?? v.hook} href={`/product/${v.slug}`} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section light">
        <div className="wrap">
          <div className="section-head">
            <div>
              <span className="eyebrow">Most loved</span>
              <h2>Bestsellers</h2>
            </div>
            <Link href="/shop?sort=bestsellers" className="link-arrow">
              Shop all bestsellers →
            </Link>
          </div>
          <div className="grid">
            {bestsellers.map((p, i) => (
              <ProductCard key={p.slug} p={p} priority={i < 4} />
            ))}
          </div>
        </div>
      </section>

      {edit && layerPieces.length > 0 && (
        <section className="section light" style={{ background: "var(--ivory-2)" }}>
          <div className="wrap">
            <div className="section-head">
              <div>
                <span className="eyebrow">Build your stack</span>
                <h2>Layer it your way</h2>
                <p className="muted">Pick up to three necklaces and see how they sit together. Choose all three for the full look in one gift box, for less.</p>
              </div>
              <Link href="/journal/how-to-layer-necklaces" className="link-arrow">
                Layering guide →
              </Link>
            </div>
            <StackBuilder
              pieces={layerPieces.map((p) => ({ slug: p.slug, name: p.name, price: p.price, layer: p.layer }))}
              set={{ slug: edit.slug, name: edit.name, price: edit.price, bundle: edit.bundle ?? [] }}
            />
          </div>
        </section>
      )}

      <section className="section red">
        <div className="wrap gift-grid">
          {giftVid ? (
            <Reel src={giftVid.video} poster={giftVid.poster} label={giftVid.hook} href={`/product/${giftVid.slug}`} cta="Shop the box" />
          ) : (
            <div />
          )}
          <div>
            <span className="eyebrow" style={{ color: "var(--champagne)" }}>
              The red box
            </span>
            <h2>The gift is already wrapped.</h2>
            <p style={{ color: "#f1dcdc", fontSize: "1.1rem", maxWidth: "34rem" }}>
              Every piece arrives in our signature red box with a gold ribbon. Add a handwritten note at checkout and we&rsquo;ll
              keep prices off the parcel. All that&rsquo;s left is the moment they open it.
            </p>
            <div className="budget">
              <Link href="/gifts#under-50">
                Under $50<small>Studs, huggies, chains</small>
              </Link>
              <Link href="/gifts#under-100">
                Under $100<small>Pendants, tennis, cuffs</small>
              </Link>
              <Link href="/shop/gift-sets">
                Gift sets<small>Pre-styled, ready to give</small>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <div>
              <span className="eyebrow">The journal</span>
              <h2>Style notes</h2>
            </div>
            <Link href="/journal" className="link-arrow">
              Read the journal →
            </Link>
          </div>
          <div className="articles">
            {ARTICLES.map((a) => (
              <Link key={a.slug} href={`/journal/${a.slug}`} className="article-card">
                <div className="media">
                  <Image src={`/media/products/${a.hero}-1.webp`} alt="" fill sizes="(max-width: 860px) 100vw, 33vw" />
                </div>
                <h3>{a.title}</h3>
                <p className="muted small">{a.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section light" style={{ textAlign: "center" }}>
        <div className="wrap" style={{ display: "grid", justifyItems: "center" }}>
          <span className="eyebrow">Join the list</span>
          <h2>10% off your first order</h2>
          <p className="muted">New drops, restocks and styling notes. No spam, unsubscribe any time.</p>
          <Newsletter />
        </div>
      </section>
    </>
  );
}
