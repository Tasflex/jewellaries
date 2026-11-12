// GA4-style ecommerce events pushed to the Google Tag Manager dataLayer.
// Configure GA4 / Google Ads / Meta tags in the GTM container; the site only
// emits the events. Prices are in USD (the catalogue's base currency).

type Item = { slug: string; name: string; price: number; category?: string; qty?: number };

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || "GTM-NZC8MM3Z";

const toItem = (i: Item) => ({
  item_id: i.slug,
  item_name: i.name,
  item_brand: "Jewellariess",
  item_category: i.category,
  price: i.price,
  quantity: i.qty ?? 1,
});

export function track(event: string, items: Item[] = [], extra: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ ecommerce: null }); // clear the previous ecommerce object (GTM best practice)
  const value = items.reduce((s, i) => s + i.price * (i.qty ?? 1), 0);
  window.dataLayer.push({
    event,
    ecommerce: items.length ? { currency: "USD", value: Math.round(value * 100) / 100, items: items.map(toItem), ...extra } : extra,
  });
}

// Countries where analytics/ad cookies need opt-in consent (EEA + UK + Switzerland).
export const CONSENT_REGIONS = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE", "IS", "LI", "NO", "GB", "CH",
];
