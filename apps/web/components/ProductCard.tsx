import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/catalog";
import { SITE } from "@/lib/site";
import { Price } from "./store";
import QuickAdd from "./QuickAdd";

export default function ProductCard({ p, priority = false }: { p: Product; priority?: boolean }) {
  const badge = p.tags.includes("bestseller") ? "Bestseller" : p.category === "gift-sets" ? "Gift set" : p.tags.includes("statement") ? "Statement" : null;
  return (
    <article className="card">
      <Link href={`/product/${p.slug}`} className="card-media" aria-label={p.name}>
        <Image
          src={`/media/products/${p.slug}-1.webp`}
          alt={`${p.name}: ${p.short}`}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1080px) 33vw, 25vw"
          priority={priority}
          className="img-a"
        />
        <Image src={`/media/products/${p.slug}-2.webp`} alt="" fill sizes="(max-width: 640px) 50vw, 25vw" className="img-b" />
        {badge && <span className="badge">{badge}</span>}
      </Link>
      <div className="card-body">
        <h3>
          <Link href={`/product/${p.slug}`}>{p.name}</Link>
        </h3>
        <p className="card-meta">{p.highlights[0]}</p>
        <div className="card-row">
          <Price usd={p.price} compareAt={SITE.showCompareAt ? p.compare_at : null} />
          <QuickAdd slug={p.slug} needsSize={p.category === "rings" || p.slug === "the-stack-trio"} />
        </div>
      </div>
    </article>
  );
}
