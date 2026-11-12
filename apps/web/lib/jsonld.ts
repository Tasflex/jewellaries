import type { Catalog, Product, Video } from "./catalog";
import { SITE, abs } from "./site";

export const organization = () => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": abs("/#org"),
  name: SITE.name,
  url: SITE.url,
  logo: abs("/icon.svg"),
  email: SITE.email,
  sameAs: [SITE.social.tiktok, SITE.social.instagram, SITE.social.youtube],
});

export const website = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": abs("/#website"),
  name: SITE.name,
  url: SITE.url,
  publisher: { "@id": abs("/#org") },
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${SITE.url}/shop?q={search_term_string}` },
    "query-input": "required name=search_term_string",
  },
});

export const breadcrumbs = (items: { name: string; path: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: abs(it.path) })),
});

const shippingDetails = [
  { country: "US", rate: 4.99, min: 6, max: 10 },
  { country: "GB", rate: 5.99, min: 7, max: 12 },
  { country: "AU", rate: 6.99, min: 8, max: 14 },
  { country: "KE", rate: 6.99, min: 9, max: 16 },
].map((z) => ({
  "@type": "OfferShippingDetails",
  shippingRate: { "@type": "MonetaryAmount", value: z.rate, currency: "USD" },
  shippingDestination: { "@type": "DefinedRegion", addressCountry: z.country },
  deliveryTime: {
    "@type": "ShippingDeliveryTime",
    handlingTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 3, unitCode: "DAY" },
    transitTime: { "@type": "QuantitativeValue", minValue: z.min, maxValue: z.max, unitCode: "DAY" },
  },
}));

const returnPolicy = {
  "@type": "MerchantReturnPolicy",
  applicableCountry: ["US", "GB", "CA", "AU", "DE", "FR", "KE", "AE"],
  returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
  merchantReturnDays: SITE.returnDays,
  returnMethod: "https://schema.org/ReturnByMail",
  returnFees: "https://schema.org/ReturnShippingFees",
};

export function product(p: Product, cat: Catalog, videos: Video[]) {
  const category = cat.categories.find((c) => c.slug === p.category);
  const priceValidUntil = new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString().slice(0, 10);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": abs(`/product/${p.slug}#product`),
    name: p.name,
    description: p.description,
    sku: p.supplier.sku,
    brand: { "@type": "Brand", name: SITE.name },
    category: category?.name,
    material: p.highlights[0],
    color: p.metal === "gold" ? "Gold" : p.metal === "silver" ? "Silver" : "Rose gold",
    image: [abs(`/media/products/${p.slug}-1.webp`), abs(`/media/products/${p.slug}-2.webp`), abs(`/media/products/${p.slug}-sq.jpg`)],
    // Ratings are only emitted when real, verified reviews exist in the catalogue.
    ...(p.rating && p.reviews
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: p.rating, reviewCount: p.reviews } }
      : {}),
    subjectOf: videos.map((v) => videoObject(v, p)),
    offers: {
      "@type": "Offer",
      url: abs(`/product/${p.slug}`),
      priceCurrency: "USD",
      price: p.price.toFixed(2),
      priceValidUntil,
      itemCondition: "https://schema.org/NewCondition",
      availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: { "@id": abs("/#org") },
      shippingDetails,
      hasMerchantReturnPolicy: returnPolicy,
    },
  };
}

export function videoObject(v: Video, p?: Product) {
  return {
    "@type": "VideoObject",
    name: p ? `${p.name}: ${v.hook}` : v.hook,
    description: v.caption.split("\n").slice(0, 2).join(" "),
    thumbnailUrl: abs(v.poster),
    contentUrl: abs(v.video),
    uploadDate: "2026-11-12",
    duration: `PT${Math.round(v.duration)}S`,
  };
}

export const faqPage = (faq: { q: string; a: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
});

export const itemList = (products: Product[]) => ({
  "@context": "https://schema.org",
  "@type": "ItemList",
  itemListElement: products.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: abs(`/product/${p.slug}`), name: p.name })),
});
