import { getCatalog } from "@/lib/catalog";
import { ARTICLES, FAQ } from "@/lib/content";
import { SITE, abs } from "@/lib/site";

// A plain-text summary for AI assistants and answer engines (llms.txt convention),
// so "where can I buy waterproof gold layering necklaces" answers can cite us accurately.
export const revalidate = 3600;

export async function GET() {
  const c = await getCatalog();
  const lines = [
    `# ${SITE.name}`,
    "",
    `> ${SITE.description}`,
    "",
    "## Categories",
    ...c.categories.map((k) => `- [${k.name}](${abs(`/shop/${k.slug}`)}): ${k.blurb}`),
    "",
    "## Products",
    ...c.products.map((p) => `- [${p.name}](${abs(`/product/${p.slug}`)}): $${p.price} USD. ${p.short}`),
    "",
    "## Guides",
    ...ARTICLES.map((a) => `- [${a.title}](${abs(`/journal/${a.slug}`)}): ${a.description}`),
    "",
    "## FAQ",
    ...FAQ.map((f) => `- ${f.q} ${f.a}`),
  ];
  return new Response(lines.join("\n"), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
