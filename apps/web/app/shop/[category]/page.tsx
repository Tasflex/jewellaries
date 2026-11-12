import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "@/components/JsonLd";
import ShopGrid, { filterProducts } from "@/components/ShopGrid";
import { getCatalog, getCategory } from "@/lib/catalog";
import { ARTICLES } from "@/lib/content";
import { breadcrumbs, itemList } from "@/lib/jsonld";

type P = Promise<{ category: string }>;
type SP = Promise<{ sort?: string }>;

export const revalidate = 300;

export async function generateStaticParams() {
  const c = await getCatalog();
  return c.categories.map((k) => ({ category: k.slug }));
}

export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const k = await getCategory((await params).category);
  if (!k) return {};
  return {
    title: k.seo_title,
    description: k.seo_description,
    alternates: { canonical: `/shop/${k.slug}` },
    openGraph: { title: k.seo_title, description: k.seo_description, url: `/shop/${k.slug}` },
  };
}

const GUIDE: Record<string, string> = {
  necklaces: "how-to-layer-necklaces",
  rings: "ring-stacking-guide",
  earrings: "waterproof-gold-jewellery-explained",
  bracelets: "waterproof-gold-jewellery-explained",
  "gift-sets": "how-to-layer-necklaces",
};

export default async function CategoryPage({ params, searchParams }: { params: P; searchParams: SP }) {
  const { category } = await params;
  const { sort } = await searchParams;
  const [c, k] = await Promise.all([getCatalog(), getCategory(category)]);
  if (!k) notFound();
  const products = filterProducts(c, { category, sort });
  const guide = ARTICLES.find((a) => a.slug === GUIDE[category]);
  return (
    <div className="wrap">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link> / <Link href="/shop">Shop</Link> / {k.name}
      </nav>
      <header className="page-head" style={{ paddingTop: "1rem" }}>
        <h1>{k.name}</h1>
        <p className="muted">{k.blurb}</p>
      </header>
      <ShopGrid c={c} products={products} active={category} basePath={`/shop/${category}`} sort={sort} />
      <section className="seo-copy">
        <h2>{k.seo_title}</h2>
        <p>{k.seo_description}</p>
        {guide && (
          <p>
            New to styling? Read <Link href={`/journal/${guide.slug}`} className="gold">{guide.title}</Link>.
          </p>
        )}
      </section>
      <JsonLd
        data={[
          itemList(products),
          breadcrumbs([
            { name: "Home", path: "/" },
            { name: "Shop", path: "/shop" },
            { name: k.name, path: `/shop/${k.slug}` },
          ]),
        ]}
      />
      <div style={{ height: "4rem" }} />
    </div>
  );
}
