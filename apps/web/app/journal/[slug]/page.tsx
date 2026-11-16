import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "@/components/JsonLd";
import ProductCard from "@/components/ProductCard";
import Rich from "@/components/Rich";
import { getCatalog } from "@/lib/catalog";
import { ARTICLES, anchor, heroImage, plain, readingMinutes, topicName, wordCount } from "@/lib/journal";
import { breadcrumbs, faqPage } from "@/lib/jsonld";
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
    openGraph: {
      type: "article",
      title: art.title,
      description: art.description,
      publishedTime: art.date,
      section: topicName(art.topic),
      images: [`/media/products/${art.hero}-sq.jpg`],
    },
  };
}

const longDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

export default async function ArticlePage({ params }: { params: P }) {
  const { slug } = await params;
  const a = ARTICLES.find((x) => x.slug === slug);
  if (!a) notFound();
  const c = await getCatalog();
  const shop = a.shop.map((s) => c.products.find((p) => p.slug === s)).filter(Boolean) as typeof c.products;
  const related = a.related.map((s) => ARTICLES.find((x) => x.slug === s)).filter(Boolean) as typeof ARTICLES;
  const headings = a.sections.filter((s) => s.h).map((s) => s.h as string);

  return (
    <article className="wrap journal-article">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link> / <Link href="/journal">Journal</Link> / {a.title}
      </nav>
      <div className="prose">
        <p className="article-meta">
          <Link href={`/journal?topic=${a.topic}`} className="eyebrow">
            {topicName(a.topic)}
          </Link>
          <span className="muted small">
            {longDate(a.date)} · {readingMinutes(a)} min read
          </span>
        </p>
        <h1 style={{ fontSize: "clamp(2.1rem, 5vw, 3.4rem)" }}>{a.title}</h1>
        <p className="muted lede">{a.description}</p>
        <div className="article-hero">
          <Image src={heroImage(a)} alt={a.title} fill priority sizes="(max-width: 760px) 100vw, 736px" style={{ objectFit: "cover" }} />
        </div>

        {a.answer && (
          <aside className="quick-answer" aria-label="Quick answer">
            <span className="eyebrow">The short answer</span>
            <p>
              <Rich text={a.answer} />
            </p>
          </aside>
        )}

        {headings.length >= 4 && (
          <nav className="toc" aria-label="In this guide">
            <span className="eyebrow">In this guide</span>
            <ol>
              {headings.map((h) => (
                <li key={h}>
                  <a href={`#${anchor(h)}`}>{plain(h)}</a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        {a.sections.map((s, i) => (
          <section key={i}>
            {s.h && (
              <h2 id={anchor(s.h)}>
                <Rich text={s.h} />
              </h2>
            )}
            {s.p?.map((t, j) => (
              <p key={j}>
                <Rich text={t} />
              </p>
            ))}
            {s.list && (
              <ul>
                {s.list.map((t) => (
                  <li key={t}>
                    <Rich text={t} />
                  </li>
                ))}
              </ul>
            )}
            {s.steps && (
              <ol className="steps">
                {s.steps.map((t) => (
                  <li key={t}>
                    <Rich text={t} />
                  </li>
                ))}
              </ol>
            )}
            {s.table && (
              <div className="article-table">
                <table>
                  {s.table.caption && <caption>{s.table.caption}</caption>}
                  <thead>
                    <tr>
                      {s.table.head.map((h, k) => (
                        <th key={k} scope="col">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {s.table.rows.map((r, k) => (
                      <tr key={k}>
                        {r.map((cell, m) =>
                          m === 0 ? (
                            <th key={m} scope="row">
                              <Rich text={cell} />
                            </th>
                          ) : (
                            <td key={m}>
                              <Rich text={cell} />
                            </td>
                          ),
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {s.figure && (
              <figure className="article-figure">
                {/* eslint-disable-next-line @next/next/no-img-element -- SVG diagrams are served as-is */}
                <img src={s.figure.src} alt={s.figure.alt} width={s.figure.width ?? 1200} height={s.figure.height ?? 675} loading="lazy" decoding="async" />
                {s.figure.caption && (
                  <figcaption>
                    <Rich text={s.figure.caption} />
                  </figcaption>
                )}
              </figure>
            )}
            {s.after?.map((t, j) => (
              <p key={`a${j}`}>
                <Rich text={t} />
              </p>
            ))}
            {s.tip && (
              <aside className="article-tip">
                <strong>Tip</strong>
                <span>
                  <Rich text={s.tip} />
                </span>
              </aside>
            )}
          </section>
        ))}

        {a.faq && a.faq.length > 0 && (
          <section className="article-faq" aria-labelledby="faq-title">
            <h2 id="faq-title">Quick questions</h2>
            {a.faq.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>
                  <Rich text={f.a} />
                </p>
              </details>
            ))}
          </section>
        )}
      </div>

      {related.length > 0 && (
        <section className="section" aria-labelledby="keep-reading">
          <h2 id="keep-reading">Keep reading</h2>
          <div className="articles">
            {related.map((r) => (
              <Link key={r.slug} href={`/journal/${r.slug}`} className="article-card">
                <div className="media">
                  <Image src={heroImage(r)} alt="" fill sizes="(max-width: 860px) 100vw, 33vw" />
                </div>
                <span className="eyebrow">{topicName(r.topic)}</span>
                <h3>{r.title}</h3>
                <p className="muted small">{r.description}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {shop.length > 0 && (
        <section className="section">
          <h2>Shop the guide</h2>
          <div className="grid">
            {shop.map((p) => (
              <ProductCard key={p.slug} p={p} />
            ))}
          </div>
        </section>
      )}

      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: a.title,
            description: a.description,
            datePublished: a.date,
            dateModified: a.date,
            articleSection: topicName(a.topic),
            wordCount: wordCount(a),
            image: [abs(heroImage(a)), abs(`/media/products/${a.hero}-sq.jpg`)],
            author: { "@type": "Organization", name: SITE.name, url: SITE.url },
            publisher: { "@id": abs("/#org") },
            mainEntityOfPage: abs(`/journal/${a.slug}`),
          },
          breadcrumbs([
            { name: "Home", path: "/" },
            { name: "Journal", path: "/journal" },
            { name: a.title, path: `/journal/${a.slug}` },
          ]),
          ...(a.faq?.length ? [faqPage(a.faq.map((f) => ({ q: f.q, a: plain(f.a) })))] : []),
        ]}
      />
    </article>
  );
}
