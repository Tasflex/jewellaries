import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import AddToBag from "@/components/AddToBag";
import { TrackViewItem } from "@/components/Analytics";
import JsonLd from "@/components/JsonLd";
import ProductCard from "@/components/ProductCard";
import Reel from "@/components/Reel";
import { ShippingEstimate } from "@/components/bits";
import { Price } from "@/components/store";
import { RING_SIZES, bundleFor, bundleValue, getCatalog, getProduct, getVideos, needsSize, related, videosFor } from "@/lib/catalog";
import { FAQ } from "@/lib/content";
import { breadcrumbs, faqPage, product as productLd } from "@/lib/jsonld";
import { SITE } from "@/lib/site";

type P = Promise<{ slug: string }>;

export const revalidate = 300;

export async function generateStaticParams() {
  const c = await getCatalog();
  return c.products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const p = await getProduct((await params).slug);
  if (!p) return {};
  const title = `${p.name}: ${p.highlights[0]}`;
  const description = `${p.short} $${p.price}. Free worldwide shipping over $${SITE.freeShippingUsd}, ${SITE.returnDays}-day returns, arrives gift-boxed.`;
  return {
    title,
    description,
    alternates: { canonical: `/product/${p.slug}` },
    openGraph: {
      type: "website",
      title: p.name,
      description,
      url: `/product/${p.slug}`,
      images: [{ url: `/media/products/${p.slug}-sq.jpg`, width: 800, height: 800, alt: p.name }],
    },
    twitter: { card: "summary_large_image", title: p.name, description, images: [`/media/products/${p.slug}-sq.jpg`] },
    other: { "product:price:amount": String(p.price), "product:price:currency": "USD" },
  };
}

const PDP_FAQ = FAQ.filter((f) => /waterproof|hypoallergenic|ship worldwide|return|gift/i.test(f.q));

export default async function ProductPage({ params }: { params: P }) {
  const { slug } = await params;
  const [c, videos] = await Promise.all([getCatalog(), getVideos()]);
  const p = c.products.find((x) => x.slug === slug);
  if (!p) notFound();
  const cat = c.categories.find((k) => k.slug === p.category);
  const vids = videosFor(videos, p.slug);
  const set = bundleFor(c, p);
  const parts = (p.bundle ?? []).map((s) => c.products.find((q) => q.slug === s)).filter(Boolean) as typeof c.products;
  const value = p.bundle ? bundleValue(c, p) : 0;
  const recs = related(c, p);
  return (
    <div className="wrap">
      <TrackViewItem slug={p.slug} name={p.name} price={p.price} category={p.category} />
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link> / <Link href={`/shop/${p.category}`}>{cat?.name}</Link> / {p.name}
      </nav>
      <div className="pdp">
        <div className="gallery">
          {/* Main shot follows the theme: velvet in dark mode, ivory in light mode; the other one sits below. */}
          <div className="g-main g-img">
            <Image src={`/media/products/${p.slug}-1.webp`} alt={`${p.name}, ${p.short}`} fill priority sizes="(max-width: 900px) 100vw, 58vw" className="on-dark" />
            <Image src={`/media/products/${p.slug}-2.webp`} alt={`${p.name}, ${p.short}`} fill sizes="(max-width: 900px) 100vw, 58vw" className="on-light" />
          </div>
          <div className="g-img">
            <Image src={`/media/products/${p.slug}-2.webp`} alt={`${p.name} on an ivory background`} fill sizes="(max-width: 900px) 50vw, 29vw" className="on-dark" />
            <Image src={`/media/products/${p.slug}-1.webp`} alt={`${p.name} on black velvet`} fill sizes="(max-width: 900px) 50vw, 29vw" className="on-light" />
          </div>
          {vids[0] ? (
            <Reel src={vids[0].video} poster={vids[0].poster} label={`${p.name}: ${vids[0].hook}`} className="g-img" />
          ) : (
            <div className="g-img">
              <Image src={`/media/products/${p.slug}-sq.jpg`} alt="" fill sizes="29vw" />
            </div>
          )}
        </div>

        <div className="pdp-info">
          <span className="eyebrow">{cat?.name}</span>
          <h1>{p.name}</h1>
          <div className="pdp-price">
            <Price usd={p.price} compareAt={SITE.showCompareAt ? p.compare_at : null} />
          </div>
          <p className="pdp-short">{p.short}</p>
          {p.bundle && value > p.price && (
            <div className="bundle-note">
              Includes {parts.map((x) => x.name).join(", ")}. Bought separately: <s>${value}</s>. You save <b>${value - p.price}</b>.
            </div>
          )}
          {set && (
            <div className="bundle-note">
              Part of <Link href={`/product/${set.slug}`}>{set.name}</Link>: get the full look for less.
            </div>
          )}
          <AddToBag slug={p.slug} sizes={needsSize(p) ? RING_SIZES : null} stock={p.stock} name={p.name} />
          <ShippingEstimate />
          <div className="perks">
            <div>
              <b>Waterproof</b>Shower, swim, sweat
            </div>
            <div>
              <b>Hypoallergenic</b>Nickel-free surface
            </div>
            <div>
              <b>Red gift box</b>Included, free
            </div>
            <div>
              <b>{SITE.returnDays}-day returns</b>Unworn pieces
            </div>
          </div>
          <details className="acc" open>
            <summary>Details</summary>
            <p>{p.description}</p>
            <ul className="highlights">
              {p.highlights.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </details>
          <details className="acc">
            <summary>Care</summary>
            <p>
              Rinse off salt water and chlorine, dry with a soft cloth and store separately. <Link href="/help/care" className="gold">Full care guide</Link>
            </p>
          </details>
          {PDP_FAQ.map((f) => (
            <details className="acc" key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </div>

      {vids.length > 1 && (
        <section className="section" style={{ paddingTop: 0 }}>
          <h2>See it move</h2>
          <div className="reel-row">
            {vids.map((v) => (
              <Reel key={v.video} src={v.video} poster={v.poster} label={v.hook} />
            ))}
          </div>
        </section>
      )}

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="section-head">
          <div>
            <span className="eyebrow">Complete the look</span>
            <h2>Wear it with</h2>
          </div>
        </div>
        <div className="grid">
          {recs.map((r) => (
            <ProductCard key={r.slug} p={r} />
          ))}
        </div>
      </section>

      <JsonLd
        data={[
          productLd(p, c, vids),
          breadcrumbs([
            { name: "Home", path: "/" },
            { name: cat?.name ?? "Shop", path: `/shop/${p.category}` },
            { name: p.name, path: `/product/${p.slug}` },
          ]),
          faqPage(PDP_FAQ),
        ]}
      />
      <div style={{ height: "3rem" }} />
    </div>
  );
}
