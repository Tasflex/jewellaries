import type { MetadataRoute } from "next";
import { getCatalog, getVideos } from "@/lib/catalog";
import { ARTICLES, HELP } from "@/lib/content";
import { abs } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [c, videos] = await Promise.all([getCatalog(), getVideos()]);
  // Last deploy, not "now": a lastmod that changes on every request teaches Google to ignore it.
  const now = new Date(process.env.BUILD_DATE || Date.now());
  const page = (path: string, priority: number, changeFrequency: "daily" | "weekly" | "monthly" = "weekly") => ({
    url: abs(path),
    lastModified: now,
    changeFrequency,
    priority,
  });
  return [
    page("/", 1, "daily"),
    page("/shop", 0.9, "daily"),
    page("/gifts", 0.8),
    page("/watch", 0.7),
    page("/journal", 0.6),
    page("/about", 0.4, "monthly"),
    ...c.categories.map((k) => page(`/shop/${k.slug}`, 0.85, "daily")),
    ...c.products.map((p) => ({
      ...page(`/product/${p.slug}`, 0.8, "daily"),
      images: [abs(`/media/products/${p.slug}-1.webp`), abs(`/media/products/${p.slug}-2.webp`)],
      videos: videos
        .filter((v) => v.slug === p.slug)
        .map((v) => ({ title: `${p.name}: ${v.hook}`, thumbnail_loc: abs(v.poster), description: p.short, content_loc: abs(v.video) })),
    })),
    ...ARTICLES.map((a) => ({ ...page(`/journal/${a.slug}`, 0.6, "monthly"), lastModified: new Date(a.date) })),
    ...HELP.map((h) => page(`/help/${h.slug}`, 0.3, "monthly")),
  ];
}
