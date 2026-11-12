export const SITE = {
  name: "Aurum Rosso",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3300").replace(/\/$/, ""),
  tagline: "Jewellery that catches the light.",
  description:
    "Waterproof 18k gold-plated necklaces, earrings, rings and bracelets, made to layer and to gift. Every order arrives in our signature red box. Free worldwide shipping over $59.",
  freeShippingUsd: 59,
  returnDays: 30,
  email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "hello@aurumrosso.com",
  social: {
    tiktok: process.env.NEXT_PUBLIC_TIKTOK_URL || "https://www.tiktok.com/@aurumrosso",
    instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://www.instagram.com/aurumrosso",
    youtube: process.env.NEXT_PUBLIC_YOUTUBE_URL || "https://www.youtube.com/@aurumrosso",
  },
  // Show the struck-through "compare at" price. Only switch this on while it is
  // a genuine launch/sale price; reference-price rules apply in the EU, UK, US and AU.
  showCompareAt: process.env.NEXT_PUBLIC_SHOW_COMPARE_AT !== "0",
};

export const abs = (path: string) => `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
