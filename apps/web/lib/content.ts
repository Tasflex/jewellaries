export type Section = { h?: string; p: string[]; list?: string[] };
export type Article = {
  slug: string;
  title: string;
  description: string;
  date: string;
  hero: string; // product slug whose render illustrates the article
  shop: string[]; // product slugs linked at the end
  sections: Section[];
};

export const ARTICLES: Article[] = [
  {
    slug: "how-to-layer-necklaces",
    title: "How to Layer Necklaces Without the Tangle",
    description: "The 2-inch rule, mixing chain textures and the three-necklace formula stylists use, plus how to stop layered chains from tangling.",
    date: "2026-11-01",
    hero: "the-layering-edit",
    shop: ["the-layering-edit", "milano-paperclip-chain", "solene-teardrop-pendant", "riviera-tennis-necklace"],
    sections: [
      {
        p: [
          "Layered necklaces look effortless when they work and messy when they don't. The difference comes down to three things: length, weight and texture.",
        ],
      },
      {
        h: "1. Space each layer about 2 inches (5 cm) apart",
        p: [
          "Start with a choker or short chain at 40 cm, add a mid layer at 42–45 cm, and finish with a pendant at 45–50 cm. Spacing them out keeps each piece visible and stops them sitting on top of each other.",
        ],
      },
      {
        h: "2. Go from fine to bold, top to bottom",
        p: [
          "Put the most delicate chain highest and the piece with the most visual weight lowest, usually a pendant. Your eye reads the stack from top to bottom, so it should build towards a focal point.",
        ],
      },
      {
        h: "3. Mix textures, keep the metal",
        p: [
          "A tennis necklace, a paperclip chain and a cable chain with a pendant are three different textures in one metal. That contrast is what makes a stack look styled rather than accidental.",
        ],
        list: ["Sparkle: a tennis necklace or crystal pendant", "Structure: a paperclip or figaro chain", "Focal point: a single drop or heart pendant"],
      },
      {
        h: "How to stop layered necklaces tangling",
        p: [
          "Use different chain weights, since heavier chains sit still and lighter ones float above them. A layering clasp (a single bar clasp with several hooks) helps, and so does fastening the longest necklace first. Store them hanging or in separate pouches. Every Jewellariess set arrives with each piece wrapped separately for exactly this reason.",
        ],
      },
    ],
  },
  {
    slug: "ring-stacking-guide",
    title: "The Ring Stacking Guide: 3 Rings, Zero Gaps",
    description: "How to build a ring stack that looks intentional: the anchor, the sparkle and the statement, plus sizing tips for stacked rings.",
    date: "2026-11-04",
    hero: "the-stack-trio",
    shop: ["the-stack-trio", "eternity-band", "halo-solitaire-ring", "scarlet-signet-ring"],
    sections: [
      { p: ["A good ring stack has a rhythm. Think of it as three roles: an anchor band, a sparkle and a statement."] },
      { h: "The anchor", p: ["A slim full-eternity band sits closest to the hand and gives the stack a base of continuous light."] },
      { h: "The sparkle", p: ["A halo or solitaire is the centrepiece. Keep it in the middle of the stack so the other rings frame it."] },
      { h: "The statement", p: ["A signet or bold band on top (or on a neighbouring finger) adds weight and personality."] },
      {
        h: "Sizing for stacks",
        p: [
          "Stacked rings feel tighter than one ring alone. If you're between sizes, size up by half for a stack of three, or choose the larger size for the widest band. Our size guide shows how to measure at home.",
        ],
      },
    ],
  },
  {
    slug: "waterproof-gold-jewellery-explained",
    title: "Waterproof Gold Jewellery, Explained: What 18k PVD Actually Means",
    description: "Gold-filled, plated, vermeil and PVD: what each means, how long each lasts, and why PVD over stainless steel survives showers, sweat and the sea.",
    date: "2026-11-08",
    hero: "milano-paperclip-chain",
    shop: ["milano-paperclip-chain", "luna-huggie-hoops", "torque-cuff", "figaro-chain-bracelet"],
    sections: [
      {
        p: [
          "\"Waterproof jewellery\" usually means gold bonded to stainless steel with PVD (physical vapour deposition). The gold is vaporised in a vacuum chamber and fused to the steel at the molecular level, giving a far harder and longer-lasting finish than ordinary electroplating.",
        ],
      },
      {
        h: "PVD vs. plated vs. vermeil vs. gold-filled",
        p: ["Here's how they compare for everyday wear:"],
        list: [
          "Standard gold plating: a thin layer over brass. Pretty, but it can fade within months if worn in water.",
          "Vermeil: thicker gold over sterling silver. Lovely, but the silver underneath can still tarnish.",
          "Gold-filled: a thick gold layer bonded with heat and pressure. Durable, and priced to match.",
          "18k PVD over 316L steel: a hard, bonded gold finish over hypoallergenic surgical-grade steel. Water-, sweat- and tarnish-resistant.",
        ],
      },
      {
        h: "Is it hypoallergenic?",
        p: [
          "316L stainless steel is the same grade used for surgical instruments and body jewellery. Our pieces are nickel-free at the surface, which is what matters for sensitive skin.",
        ],
      },
      {
        h: "How to make it last for years",
        p: [
          "Rinse off chlorine and salt water, avoid abrasive cleaners, and store pieces separately so harder stones can't scratch softer finishes. That's all it takes.",
        ],
      },
    ],
  },
];

export type HelpPage = { slug: string; title: string; description: string; sections: Section[]; faq?: { q: string; a: string }[] };

export const FAQ: { q: string; a: string }[] = [
  { q: "Do you ship worldwide?", a: "Yes. We ship to over 190 countries with tracked shipping. Standard delivery takes 6–18 business days depending on your region, and express takes 4–7 business days." },
  { q: "Is shipping free?", a: "Shipping is free on orders over $59 (or the equivalent in your currency). Below that, standard shipping is a flat rate shown at checkout." },
  { q: "Will I pay import duties?", a: "Some countries charge import duty or VAT on arrival. Our prices don't include these, and any charges are set by your country's customs." },
  { q: "Is the jewellery waterproof?", a: "Our 18k PVD-plated stainless steel pieces are water-, sweat- and tarnish-resistant, so you can shower and swim in them. Pearls are the exception: keep them dry." },
  { q: "Is it hypoallergenic?", a: "Yes. Our steel pieces are 316L surgical-grade stainless steel and nickel-free at the surface." },
  { q: "Does it come gift-wrapped?", a: "Every order arrives in our signature red gift box at no extra cost. Add a gift note at checkout and we'll leave prices off the parcel." },
  { q: "What is your return policy?", a: "You can return unworn pieces within 30 days of delivery for a refund. Earrings can only be returned unopened, for hygiene reasons." },
  { q: "How do I track my order?", a: "You'll get a tracking number by email once your order ships. You can also check it any time on our Track Order page with your order number and email." },
];

export const HELP: HelpPage[] = [
  {
    slug: "shipping",
    title: "Worldwide Shipping",
    description: "Delivery times, shipping costs and duties for every region we ship to.",
    sections: [
      { p: ["We ship to over 190 countries. Every order is tracked, and shipping is free on orders over $59."] },
      {
        h: "Delivery times (business days, after dispatch)",
        p: ["Orders are prepared and dispatched within 1–3 business days."],
        list: [
          "North America: 6–10 days · $4.99",
          "Europe & UK: 7–12 days · $5.99",
          "Gulf: 7–12 days · $5.99",
          "Oceania: 8–14 days · $6.99",
          "Africa: 9–16 days · $6.99",
          "Rest of world: 10–18 days · $7.99",
          "Express (most countries): 4–7 days · standard rate + $12",
        ],
      },
      { h: "Duties & taxes", p: ["Prices don't include import duty or VAT, which some countries charge on arrival. These are set by your local customs office."] },
    ],
  },
  {
    slug: "returns",
    title: "Returns & Refunds",
    description: "30-day returns on unworn jewellery.",
    sections: [
      { p: ["Changed your mind? Return unworn pieces in their original packaging within 30 days of delivery for a full refund of the item price."] },
      { h: "How to return", list: ["Email us with your order number.", "We'll send you the return address and instructions.", "Your refund is issued to your original payment method within 5 business days of the return arriving."], p: [] },
      { h: "Exceptions", p: ["Earrings can only be returned unopened, for hygiene reasons. If something arrives damaged or wrong, email us a photo within 7 days and we'll replace it free of charge."] },
    ],
  },
  {
    slug: "sizing",
    title: "Ring Size Guide",
    description: "Find your ring size at home in two minutes.",
    sections: [
      { h: "Measure a ring you already own", p: ["Measure the inside diameter of a ring that fits the finger you plan to wear it on, then match it below."], list: ["Size 5 · 15.7 mm", "Size 6 · 16.5 mm", "Size 7 · 17.3 mm", "Size 8 · 18.1 mm", "Size 9 · 18.9 mm", "Size 10 · 19.8 mm"] },
      { h: "Or measure your finger", p: ["Wrap a strip of paper around the base of your finger, mark where it overlaps, and measure the length in mm. Divide by 3.14 to get the diameter, then use the chart above."] },
      { h: "Stacking?", p: ["Stacks of three or more feel snugger. If you're between sizes, choose the larger one."] },
    ],
  },
  {
    slug: "care",
    title: "Jewellery Care",
    description: "Keep your pieces shining for years.",
    sections: [
      { p: ["Our PVD pieces are made for real life, but a little care keeps them looking new."], list: ["Rinse off chlorine and salt water with fresh water.", "Dry with a soft cloth; never use abrasive polish.", "Put perfume and lotion on before your jewellery.", "Store each piece separately (the gift box works perfectly).", "Keep pearls away from water and perfume."] },
    ],
  },
  { slug: "faq", title: "Frequently Asked Questions", description: "Shipping, materials, returns and gifting, answered.", sections: [], faq: FAQ },
  {
    slug: "privacy",
    title: "Privacy Policy",
    description: "How we handle your personal data.",
    sections: [
      { p: ["We collect only what we need to fulfil your order and, if you opt in, to email you: your name, email, shipping address and phone number. Payments are processed by our payment provider; we never see or store your full card details."] },
      { h: "Who we share data with", p: ["Your shipping details are shared with our fulfilment partner and the delivery carrier, only to deliver your order."] },
      { h: "Your rights", p: ["You can ask us to see, correct or delete your data at any time by emailing us. You can unsubscribe from emails using the link in any message."] },
      { h: "Cookies", p: ["We use essential cookies to remember your bag, country and currency. We don't sell your data."] },
    ],
  },
  {
    slug: "terms",
    title: "Terms of Sale",
    description: "The terms that apply when you buy from us.",
    sections: [
      { p: ["Prices are shown in your selected currency for convenience and charged in the currency displayed at checkout. Orders are confirmed once payment is received. We may cancel and refund an order if an item becomes unavailable."] },
      { h: "Delivery", p: ["Delivery estimates are guides, not guarantees. Risk passes to you on delivery."] },
      { h: "Returns", p: ["See our Returns page. These terms don't affect your statutory rights."] },
    ],
  },
];
