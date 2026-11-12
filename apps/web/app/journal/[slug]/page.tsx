import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "@/components/JsonLd";
import ProductCard from "@/components/ProductCard";
import { getCatalog } from "@/lib/catalog";
import { ARTICLES } from "@/lib/content";
import { breadcrumbs } from "@/lib/jsonld";
import { SITE, abs } from "@/lib/site";

type P = Promise<{ slug: string }>;

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const { slug } = await params;
  const art = ARTICLES.find((x) => x.slug === slug);
  if (!art) return {};
  return {
    title: art.title,
    description: art.description,
    alternates: { canonical: `/journal/${art.slug}` },
    openGraph: { type: "article", title: art.title, description: art.description, publishedTime: art.date, images: [`/media/products/${art.hero}-sq.jpg`] },
  };
}

export default async function ArticlePage({ params }: { params: P }) {
  const { slug } = await params;
  const a = ARTICLES.find((x) => x.slug === slug);
  if (!a) notFound();
  const c = await getCatalog();
  const shop = a.shop.map((s) => c.products.find((p) => p.slug === s)).filter(Boolean) as typeof c.products;
  return (
    <article className="wrap">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link> / <Link href="/journal">Journal</Link> / {a.title}
      </nav>
      <div className="prose">
        <span className="eyebrow">
          {new Date(a.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
        </span>
        <h1 style={{ fontSize: "clamp(2.2rem, 5vw, 3.6rem)" }}>{a.title}</h1>
        <p className="muted" style={{ fontSize: "1.15rem" }}>
          {a.description}
        </p>
        <div style={{ position: "relative", aspectRatio: "16 / 10", borderRadius: 14, overflow: "hidden", margin: "2rem 0" }}>
          <Image src={`/media/products/${a.hero}-1.webp`} alt={a.title} fill priority sizes="(max-width: 760px) 100vw, 736px" style={{ objectFit: "cover" }} />
        </div>
        {a.sections.map((s, i) => (
          <section key={i}>
            {s.h && <h2>{s.h}</h2>}
            {s.p.map((t, j) => (
              <p key={j}>{t}</p>
            ))}
            {s.list && (
              <ul>
                {s.list.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
      <section className="section">
        <h2>Shop the guide</h2>
        <div className="grid">
          {shop.map((p) => (
            <ProductCard key={p.slug} p={p} />
          ))}
        </div>
      </section>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: a.title,
            description: a.description,
            datePublished: a.date,
            image: abs(`/media/products/${a.hero}-1.webp`),
            author: { "@type": "Organization", name: SITE.name },
            publisher: { "@id": abs("/#org") },
            mainEntityOfPage: abs(`/journal/${a.slug}`),
          },
          breadcrumbs([
            { name: "Home", path: "/" },
            { name: "Journal", path: "/journal" },
            { name: a.title, path: `/journal/${a.slug}` },
          ]),
        ]}
      />
    </article>
  );
}
