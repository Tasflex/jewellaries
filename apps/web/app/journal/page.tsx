import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import { ARTICLES, TOPICS, heroImage, readingMinutes, topicName, type Topic } from "@/lib/journal";
import { breadcrumbs } from "@/lib/jsonld";
import { abs } from "@/lib/site";

type SP = Promise<{ topic?: string }>;

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const { topic } = await searchParams;
  const t = TOPICS.find((x) => x.slug === topic);
  return {
    title: t ? `${t.name}: Jewellery Guides` : "The Journal: Jewellery Care, Sizing & Styling Guides",
    description: t
      ? `${t.blurb} Guides from the Jewellariess journal.`
      : "Honest answers to the questions people ask most about jewellery: care, sensitive skin, ring and necklace sizing, stones, styling, delivery and gifting.",
    // Topic views are filters of the same page, so they all point search engines at /journal.
    alternates: { canonical: "/journal" },
  };
}

export default async function Journal({ searchParams }: { searchParams: SP }) {
  const { topic } = await searchParams;
  const active = TOPICS.find((t) => t.slug === topic)?.slug as Topic | undefined;
  const list = active ? ARTICLES.filter((a) => a.topic === active) : ARTICLES;
  const [lead, ...rest] = list;
  const count = (t: Topic) => ARTICLES.filter((a) => a.topic === t).length;

  return (
    <div className="wrap">
      <header className="page-head">
        <span className="eyebrow">The journal</span>
        <h1>Jewellery, answered</h1>
        <p className="muted">
          Straight answers to the questions we&apos;re asked most: care, sensitive skin, sizing, stones, styling, delivery and gifting.
        </p>
      </header>

      <nav className="filters" aria-label="Journal topics">
        <Link href="/journal" className={`chip ${active ? "" : "on"}`} aria-current={active ? undefined : "page"}>
          All ({ARTICLES.length})
        </Link>
        {TOPICS.map((t) => (
          <Link key={t.slug} href={`/journal?topic=${t.slug}`} className={`chip ${active === t.slug ? "on" : ""}`} aria-current={active === t.slug ? "page" : undefined}>
            {t.name} ({count(t.slug)})
          </Link>
        ))}
      </nav>

      {lead && (
        <Link href={`/journal/${lead.slug}`} className="article-lead">
          <div className="media">
            <Image src={heroImage(lead)} alt="" fill priority sizes="(max-width: 860px) 100vw, 60vw" />
          </div>
          <div>
            <span className="eyebrow">{topicName(lead.topic)}</span>
            <h2>{lead.title}</h2>
            <p className="muted">{lead.description}</p>
            <span className="small muted">{readingMinutes(lead)} min read</span>
          </div>
        </Link>
      )}

      <div className="articles" style={{ marginBottom: "5rem" }}>
        {rest.map((a) => (
          <Link key={a.slug} href={`/journal/${a.slug}`} className="article-card">
            <div className="media">
              <Image src={heroImage(a)} alt="" fill sizes="(max-width: 860px) 100vw, 33vw" />
            </div>
            <span className="eyebrow">
              {topicName(a.topic)} · {readingMinutes(a)} min
            </span>
            <h2 style={{ fontSize: "1.45rem" }}>{a.title}</h2>
            <p className="muted small">{a.description}</p>
          </Link>
        ))}
      </div>

      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Blog",
            name: "The Jewellariess Journal",
            url: abs("/journal"),
            blogPost: ARTICLES.map((a) => ({ "@type": "BlogPosting", headline: a.title, url: abs(`/journal/${a.slug}`), datePublished: a.date })),
          },
          breadcrumbs([
            { name: "Home", path: "/" },
            { name: "Journal", path: "/journal" },
          ]),
        ]}
      />
    </div>
  );
}
