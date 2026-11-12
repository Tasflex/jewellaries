import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "@/components/JsonLd";
import { HELP } from "@/lib/content";
import { breadcrumbs, faqPage } from "@/lib/jsonld";

type P = Promise<{ topic: string }>;

export function generateStaticParams() {
  return HELP.map((h) => ({ topic: h.slug }));
}

export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const h = HELP.find((x) => x.slug === (await params).topic);
  if (!h) return {};
  return { title: h.title, description: h.description, alternates: { canonical: `/help/${h.slug}` } };
}

export default async function Help({ params }: { params: P }) {
  const { topic } = await params;
  const h = HELP.find((x) => x.slug === topic);
  if (!h) notFound();
  return (
    <div className="wrap">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link> / Help / {h.title}
      </nav>
      <div className="prose" style={{ paddingBottom: "5rem" }}>
        <h1>{h.title}</h1>
        <p className="muted">{h.description}</p>
        {h.sections.map((s, i) => (
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
        {h.faq?.map((f) => (
          <details className="acc" key={f.q}>
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
        <p style={{ marginTop: "2rem" }}>
          Still need help? <Link href="/about#contact" className="gold">Contact us</Link>.
        </p>
      </div>
      <JsonLd data={[breadcrumbs([{ name: "Home", path: "/" }, { name: h.title, path: `/help/${h.slug}` }]), ...(h.faq ? [faqPage(h.faq)] : [])]} />
    </div>
  );
}
