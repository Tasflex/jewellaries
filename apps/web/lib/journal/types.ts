// Journal article model. Text fields accept two bits of inline markup:
// [label](/path) for links (internal paths become Next links) and **bold**.

export type Topic = "care" | "skin" | "fit" | "stones" | "style" | "buying" | "gifting";

export type Figure = {
  /** Path under /public, e.g. /media/journal/necklace-lengths.svg */
  src: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
};

export type Block = {
  h?: string;
  p?: string[];
  list?: string[];
  /** Numbered steps. */
  steps?: string[];
  figure?: Figure;
  table?: { head: string[]; rows: string[][]; caption?: string };
  /** Paragraphs shown after the list, steps, table and figure. */
  after?: string[];
  /** A highlighted tip shown after the block's text. */
  tip?: string;
};

export type Article = {
  slug: string;
  title: string;
  description: string;
  topic: Topic;
  /** ISO date first published. */
  date: string;
  /** The short, direct answer shown at the top of the article. */
  answer?: string;
  /** Product slug whose photo is the hero image. */
  hero: string;
  /** Which of the product's photos to use (1 or 2). */
  heroVariant?: 1 | 2;
  /** Product slugs shown under "Shop the guide". */
  shop: string[];
  /** Article slugs shown under "Keep reading". */
  related: string[];
  sections: Block[];
  faq?: { q: string; a: string }[];
};
