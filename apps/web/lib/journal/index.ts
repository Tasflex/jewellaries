import { BUYING } from "./buying";
import { CARE } from "./care";
import { SKIN_AND_FIT } from "./fit";
import { STYLE } from "./style";
import type { Article, Block, Topic } from "./types";

export type { Article, Block, Figure, Topic } from "./types";

export const TOPICS: { slug: Topic; name: string; blurb: string }[] = [
  { slug: "care", name: "Care & materials", blurb: "What your jewellery is made of and how to keep it bright." },
  { slug: "skin", name: "Sensitive skin", blurb: "Metals and earrings for skin that reacts." },
  { slug: "fit", name: "Size & fit", blurb: "Ring sizes, necklace lengths and getting the fit right." },
  { slug: "stones", name: "Stones & pearls", blurb: "Cubic zirconia, pearls and how they compare." },
  { slug: "style", name: "Styling", blurb: "Layering, stacking and mixing metals." },
  { slug: "buying", name: "Buying & delivery", blurb: "Quality, shipping, customs and returns." },
  { slug: "gifting", name: "Gifting", blurb: "Choosing jewellery for someone else." },
];

/** Every article, newest first (original order kept within a date). */
export const ARTICLES: Article[] = [...CARE, ...SKIN_AND_FIT, ...STYLE, ...BUYING]
  .map((a, i) => ({ a, i }))
  .sort((x, y) => y.a.date.localeCompare(x.a.date) || x.i - y.i)
  .map(({ a }) => a);

export const topicName = (t: Topic) => TOPICS.find((x) => x.slug === t)?.name ?? t;

/** Text with the inline link and bold markup removed, for metadata and structured data. */
export const plain = (s: string) => s.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1");

function blockText(b: Block): string[] {
  return [b.h ?? "", ...(b.p ?? []), ...(b.list ?? []), ...(b.steps ?? []), ...(b.after ?? []), b.tip ?? "", ...(b.table?.rows.flat() ?? [])];
}

export function wordCount(a: Article): number {
  const text = [a.answer ?? "", ...a.sections.flatMap(blockText), ...(a.faq ?? []).flatMap((f) => [f.q, f.a])].map(plain).join(" ");
  return text.split(/\s+/).filter(Boolean).length;
}

export const readingMinutes = (a: Article) => Math.max(2, Math.round(wordCount(a) / 220));

export const heroImage = (a: Article) => `/media/products/${a.hero}-${a.heroVariant ?? 1}.webp`;

/** URL-safe id for a section heading, used by the table of contents. */
export const anchor = (h: string) =>
  plain(h)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
