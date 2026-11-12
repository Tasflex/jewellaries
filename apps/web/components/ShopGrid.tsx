import Link from "next/link";
import type { Catalog, Product } from "@/lib/catalog";
import ProductCard from "./ProductCard";

const SORTS = [
  { key: "featured", label: "Featured" },
  { key: "bestsellers", label: "Bestsellers" },
  { key: "price-asc", label: "Price: low to high" },
  { key: "price-desc", label: "Price: high to low" },
];

export function filterProducts(c: Catalog, opts: { category?: string; q?: string; sort?: string; max?: number }) {
  const q = (opts.q ?? "").trim().toLowerCase();
  let list = c.products.filter(
    (p) =>
      (!opts.category || p.category === opts.category) &&
      (!opts.max || p.price <= opts.max) &&
      (!q || [p.name, p.short, p.category, p.metal, ...p.tags].join(" ").toLowerCase().includes(q))
  );
  if (opts.sort === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
  if (opts.sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
  if (opts.sort === "bestsellers") list = [...list].sort((a, b) => +b.tags.includes("bestseller") - +a.tags.includes("bestseller"));
  return list;
}

export default function ShopGrid({
  c,
  products,
  active,
  basePath,
  q,
  sort,
}: {
  c: Catalog;
  products: Product[];
  active?: string;
  basePath: string;
  q?: string;
  sort?: string;
}) {
  return (
    <>
      <div className="filters">
        <Link href="/shop" className={`chip ${!active ? "on" : ""}`}>
          All
        </Link>
        {c.categories.map((k) => (
          <Link key={k.slug} href={`/shop/${k.slug}`} className={`chip ${active === k.slug ? "on" : ""}`}>
            {k.name}
          </Link>
        ))}
        <form action="/shop" className="search" role="search">
          <label htmlFor="q" className="sr-only">
            Search jewellery
          </label>
          <input id="q" name="q" defaultValue={q} placeholder="Search: hoops, pearl, gold…" />
        </form>
      </div>
      <div className="filters" style={{ marginTop: "-1rem" }}>
        <span className="muted small">{products.length} pieces · Sort:</span>
        {SORTS.map((s) => (
          <Link
            key={s.key}
            href={`${basePath}?${new URLSearchParams({ ...(q ? { q } : {}), sort: s.key })}`}
            className={`chip ${(sort ?? "featured") === s.key ? "on" : ""}`}
            rel="nofollow"
          >
            {s.label}
          </Link>
        ))}
      </div>
      {products.length ? (
        <div className="grid">
          {products.map((p, i) => (
            <ProductCard key={p.slug} p={p} priority={i < 4} />
          ))}
        </div>
      ) : (
        <p className="muted">Nothing matches that search yet. Try &ldquo;gold&rdquo;, &ldquo;hoops&rdquo; or &ldquo;gift&rdquo;.</p>
      )}
    </>
  );
}
