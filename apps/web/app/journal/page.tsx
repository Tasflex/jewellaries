import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ARTICLES } from "@/lib/content";

export const metadata: Metadata = {
  title: "The Journal: Jewellery Styling Guides",
  description: "How to layer necklaces, stack rings and care for waterproof gold jewellery. Styling guides from Jewellariess.",
  alternates: { canonical: "/journal" },
};

export default function Journal() {
  return (
    <div className="wrap">
      <header className="page-head">
        <span className="eyebrow">The journal</span>
        <h1>Style notes</h1>
        <p className="muted">Guides to layering, stacking and caring for the pieces you love.</p>
      </header>
      <div className="articles" style={{ marginBottom: "5rem" }}>
        {ARTICLES.map((a) => (
          <Link key={a.slug} href={`/journal/${a.slug}`} className="article-card">
            <div className="media">
              <Image src={`/media/products/${a.hero}-1.webp`} alt="" fill sizes="(max-width: 860px) 100vw, 33vw" />
            </div>
            <h2 style={{ fontSize: "1.5rem" }}>{a.title}</h2>
            <p className="muted small">{a.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
