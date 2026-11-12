import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import ProductCard from "@/components/ProductCard";
import Reel from "@/components/Reel";
import { getCatalog, getVideos } from "@/lib/catalog";
import { breadcrumbs } from "@/lib/jsonld";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Jewellery Gift Guide: Gifts Under $50, Under $100 & Gift Sets",
  description: "Jewellery gifts she'll actually wear, by budget. Every order arrives in our signature red gift box with an optional handwritten note. Ships worldwide.",
  alternates: { canonical: "/gifts" },
};

export default async function Gifts() {
  const [c, videos] = await Promise.all([getCatalog(), getVideos()]);
  const shop = c.products.filter((p) => p.category !== "gift-sets");
  const groups = [
    { id: "under-50", title: "Under $50", note: "Little luxuries: studs, huggies and chains.", items: shop.filter((p) => p.price < 50) },
    { id: "under-100", title: "Under $100", note: "The ones they'll remember: pendants, tennis pieces and cuffs.", items: shop.filter((p) => p.price >= 50 && p.price < 100) },
    { id: "sets", title: "Gift sets", note: "Pre-styled and ready to give, for less than buying the pieces separately.", items: c.products.filter((p) => p.category === "gift-sets") },
  ];
  const unbox = videos.filter((v) => v.format === "unboxing").slice(0, 4);
  return (
    <div className="wrap">
      <header className="page-head">
        <span className="eyebrow">Gift guide</span>
        <h1>Gifts they&rsquo;ll never take off</h1>
        <p className="muted">
          Every order arrives in our signature red box with a gold ribbon. Add a note at checkout and we&rsquo;ll keep prices off the
          parcel.
        </p>
        <div className="filters" style={{ marginTop: "1rem" }}>
          {groups.map((g) => (
            <Link key={g.id} href={`#${g.id}`} className="chip">
              {g.title}
            </Link>
          ))}
        </div>
      </header>
      {unbox.length > 0 && (
        <div className="reel-row" style={{ marginBottom: "3rem" }}>
          {unbox.map((v) => (
            <Reel key={v.video} src={v.video} poster={v.poster} label={v.hook} href={`/product/${v.slug}`} />
          ))}
        </div>
      )}
      {groups.map((g) => (
        <section key={g.id} id={g.id} style={{ marginBottom: "4rem", scrollMarginTop: "100px" }}>
          <h2>{g.title}</h2>
          <p className="muted">{g.note}</p>
          <div className="grid">
            {g.items.map((p) => (
              <ProductCard key={p.slug} p={p} />
            ))}
          </div>
        </section>
      ))}
      <JsonLd data={breadcrumbs([{ name: "Home", path: "/" }, { name: "Gift guide", path: "/gifts" }])} />
    </div>
  );
}
