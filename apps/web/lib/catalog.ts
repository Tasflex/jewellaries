import fs from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

export type Product = {
  slug: string;
  name: string;
  category: string;
  price: number;
  compare_at: number;
  metal: "gold" | "silver" | "rose";
  stone: string;
  short: string;
  description: string;
  highlights: string[];
  stock: number;
  tags: string[];
  layer: string | null;
  bundle?: string[];
  rating?: number;
  reviews?: number;
  supplier: { name: string; sku: string };
};

export type Category = { slug: string; name: string; blurb: string; seo_title: string; seo_description: string };

export type Catalog = {
  brand: { name: string; tagline: string; free_shipping_usd: number; currency: string };
  categories: Category[];
  products: Product[];
};

export type Video = {
  slug: string;
  format: "glint" | "layering" | "unboxing";
  video: string;
  poster: string;
  duration: number;
  hook: string;
  caption: string;
  hashtags: string[];
};

const API = process.env.API_URL || "http://127.0.0.1:8300";
const DATA = process.env.DATA_DIR || path.join(process.cwd(), "..", "..", "data");

/** Live catalogue from the API (stock, prices), falling back to the repo copy at build time. */
export const getCatalog = cache(async (): Promise<Catalog> => {
  try {
    const r = await fetch(`${API}/v1/catalog`, { next: { revalidate: 300 }, signal: AbortSignal.timeout(2500) });
    if (r.ok) return (await r.json()) as Catalog;
  } catch {
    /* API not running (e.g. during `next build`): use the file */
  }
  return JSON.parse(await fs.readFile(path.join(DATA, "catalog.json"), "utf8")) as Catalog;
});

export const getVideos = cache(async (): Promise<Video[]> => {
  try {
    const m = JSON.parse(await fs.readFile(path.join(DATA, "social", "manifest.json"), "utf8"));
    return m.videos as Video[];
  } catch {
    return [];
  }
});

export async function getProduct(slug: string) {
  const c = await getCatalog();
  return c.products.find((p) => p.slug === slug) ?? null;
}

export async function getCategory(slug: string) {
  const c = await getCatalog();
  return c.categories.find((x) => x.slug === slug) ?? null;
}

export function images(p: Pick<Product, "slug">) {
  return {
    hero: `/media/products/${p.slug}-1.webp`,
    light: `/media/products/${p.slug}-2.webp`,
    square: `/media/products/${p.slug}-sq.jpg`,
  };
}

export function videosFor(videos: Video[], slug: string) {
  return videos.filter((v) => v.slug === slug);
}

/** Pieces that style with this one: same layering role family first, then same category. */
export function related(c: Catalog, p: Product, n = 4) {
  const others = c.products.filter((q) => q.slug !== p.slug && q.category !== "gift-sets");
  const score = (q: Product) =>
    (q.layer && p.layer && q.layer !== p.layer && q.category === p.category ? 3 : 0) +
    (q.metal === p.metal ? 1 : 0) +
    (q.category === p.category ? 1 : 0) +
    (q.tags.includes("bestseller") ? 0.5 : 0);
  return others.sort((a, b) => score(b) - score(a)).slice(0, n);
}

export function bundleFor(c: Catalog, p: Product) {
  return c.products.find((q) => q.bundle?.includes(p.slug)) ?? null;
}

export function bundleValue(c: Catalog, b: Product) {
  return (b.bundle ?? []).reduce((s, slug) => s + (c.products.find((q) => q.slug === slug)?.price ?? 0), 0);
}

export const RING_SIZES = ["5", "6", "7", "8", "9", "10"];
export const needsSize = (p: Product) => p.category === "rings" || p.slug === "the-stack-trio";
