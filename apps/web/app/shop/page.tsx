import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import ShopGrid, { filterProducts } from "@/components/ShopGrid";
import { getCatalog } from "@/lib/catalog";
import { breadcrumbs, itemList } from "@/lib/jsonld";

type SP = Promise<{ q?: string; sort?: string }>;

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const { q } = await searchParams;
  return {
    title: q ? `Search: ${q}` : "Shop All Jewellery: Necklaces, Earrings, Rings & Bracelets",
    description: "Shop waterproof 18k gold-plated necklaces, huggie earrings, stackable rings, tennis bracelets and gift sets. Free worldwide shipping over $59.",
    alternates: { canonical: "/shop" },
    // Search result pages shouldn't compete with category pages in Google.
    robots: q ? { index: false, follow: true } : undefined,
  };
}

export default async function Shop({ searchParams }: { searchParams: SP }) {
  const { q, sort } = await searchParams;
  const c = await getCatalog();
  const products = filterProducts(c, { q, sort });
  return (
    <div className="wrap">
      <header className="page-head">
        <span className="eyebrow">The collection</span>
        <h1>{q ? <>Results for &ldquo;{q}&rdquo;</> : "All jewellery"}</h1>
        <p className="muted">Waterproof 18k gold and rhodium pieces, designed to layer, stack and gift.</p>
      </header>
      <ShopGrid c={c} products={products} basePath="/shop" q={q} sort={sort} />
      <section className="seo-copy">
        <h2>Everyday gold jewellery, shipped worldwide</h2>
        <p>
          Jewellariess makes demi-fine jewellery for real life: 18k gold PVD over 316L surgical-grade steel that resists water,
          sweat and tarnish. Build a necklace layer with paperclip chains and pendants, stack eternity bands with a signet, or
          pick a ready-made gift set that arrives in our signature red box. We ship to more than 190 countries, with free
          shipping on orders over $59.
        </p>
      </section>
      <JsonLd data={[itemList(products), breadcrumbs([{ name: "Home", path: "/" }, { name: "Shop", path: "/shop" }])]} />
      <div style={{ height: "4rem" }} />
    </div>
  );
}
