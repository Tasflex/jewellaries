import type { Article } from "./types";

export const BUYING: Article[] = [
  {
    slug: "is-affordable-jewellery-worth-it",
    title: "Is Affordable Jewellery Worth It? Fine, Demi-Fine and Fashion Jewellery Explained",
    description:
      "What separates a $15 necklace from a $50 one and a $500 one, which kind of jewellery suits which job, and how to judge value by cost per wear.",
    topic: "buying",
    date: "2026-11-16",
    answer:
      "It depends on the job. Fashion jewellery suits trends and occasional wear. Demi-fine, such as gold PVD over stainless steel or vermeil over silver, is built for everyday wear at an accessible price. Fine jewellery makes sense for heirlooms, pieces you want to repair or resell, and very sensitive skin. Judge value by cost per wear, not by price alone.",
    hero: "ember-ruby-heart-necklace",
    shop: ["ember-ruby-heart-necklace", "solene-teardrop-pendant", "luna-huggie-hoops", "torque-cuff"],
    related: ["how-long-does-gold-plated-jewellery-last", "how-to-judge-jewellery-quality-online", "cubic-zirconia-vs-diamond-vs-moissanite"],
    sections: [
      {
        p: [
          "Most of us have bought a bargain necklace that looked great for a fortnight and then faded. That experience makes people wary of anything that isn't solid gold. But between costume jewellery and fine jewellery there's a whole category built for exactly the way most people wear jewellery: every day, without fuss.",
        ],
        figure: {
          src: "/media/journal/jewellery-tiers.svg",
          alt: "Comparison of fashion, demi-fine and fine jewellery by base metal, gold layer, daily wear, price and resale value.",
        },
      },
      {
        h: "Fashion (costume) jewellery",
        p: [
          "Usually brass or zinc alloy with a thin plating. Cheap, fun and perfect for a trend or an outfit you'll wear twice. Expect the plating to wear quickly with daily use, and be aware that a copper-rich base can [turn your skin green](/journal/why-jewellery-turns-skin-green) once it does.",
        ],
      },
      {
        h: "Demi-fine jewellery",
        p: [
          "The middle ground: a better base metal (stainless steel or sterling silver) with a more durable gold layer (PVD or vermeil), and often real or lab-made stones of decent quality. It's designed to be worn daily and priced so you can build a collection. This is where Jewellariess sits: 18k gold PVD over 316L stainless steel, with AAA cubic zirconia and freshwater pearls. For how each gold finish holds up, read [How Long Does Gold-Plated Jewellery Last?](/journal/how-long-does-gold-plated-jewellery-last)",
        ],
      },
      {
        h: "Fine jewellery",
        p: [
          "Solid gold, platinum and precious stones. It costs much more, but it can be repaired, resized and passed down, and it holds some resale value. It's the right choice for engagement rings, heirlooms and anyone whose skin only tolerates high-karat gold.",
        ],
      },
      {
        h: "Think in cost per wear",
        p: [
          "Price divided by the number of times you wear something is a better measure of value than the price tag. A $49 pendant worn three times a week for two years costs about 16 cents a wear. A $15 necklace that fades after a month and gets worn eight times costs nearly $2 a wear. A $900 gold chain worn daily for twenty years works out cheapest of all, if you can make the upfront spend.",
        ],
        table: {
          head: ["Piece", "Price", "Times worn", "Cost per wear"],
          rows: [
            ["Fashion necklace, fades in a month", "$15", "8", "$1.88"],
            ["Demi-fine pendant, worn 3× a week for 2 years", "$49", "312", "$0.16"],
            ["Solid gold chain, worn daily for 20 years", "$900", "7,300", "$0.12"],
          ],
          caption: "Illustrative examples, not a guarantee of how long any particular piece will last.",
        },
      },
      {
        h: "How to spend well",
        list: [
          "Put your money into the pieces you wear most: everyday studs, a necklace, a ring.",
          "Buy trend pieces at fashion prices, and don't expect them to last.",
          "Read what the base metal and finish actually are. Our [quality checklist](/journal/how-to-judge-jewellery-quality-online) shows what to look for.",
          "Choose stones for how you'll wear them; our [CZ vs diamond vs moissanite guide](/journal/cubic-zirconia-vs-diamond-vs-moissanite) compares the options honestly.",
        ],
      },
    ],
    faq: [
      { q: "What is demi-fine jewellery?", a: "Jewellery between costume and fine: a quality base metal such as stainless steel or sterling silver with a durable gold layer such as PVD or vermeil, made for everyday wear at an accessible price." },
      { q: "Does demi-fine jewellery hold its value?", a: "Not as an investment. Its value is in how much you'll wear it. Fine jewellery in solid gold or platinum is the category that keeps some resale value." },
    ],
  },
  {
    slug: "how-to-judge-jewellery-quality-online",
    title: "How to Tell If Jewellery Is Good Quality Before You Buy Online",
    description:
      "You can't hold it, weigh it or see it in daylight. The eight things a trustworthy jewellery listing should tell you, and the red flags that should make you pause.",
    topic: "buying",
    date: "2026-11-16",
    answer:
      "A good listing names the base metal, the gold finish and the stone type, gives real measurements (length, width, sizes and ideally weight), describes the clasp or closure, shows the piece from several angles, and states delivery times and a clear returns policy. Vague words such as 'gold tone' or 'premium alloy' with no details are a warning sign.",
    hero: "celeste-tennis-bracelet",
    heroVariant: 2,
    shop: ["celeste-tennis-bracelet", "riviera-tennis-necklace", "figaro-chain-bracelet"],
    related: ["is-affordable-jewellery-worth-it", "international-jewellery-delivery-times", "jewellery-returns-and-damaged-orders"],
    sections: [
      {
        p: [
          "Buying jewellery in a shop, you'd pick it up, feel its weight, look at the clasp and see it in daylight. Online, the listing has to do all of that for you. The good news is that honest sellers make it easy to check quality, and the gaps in a weak listing tell you a lot.",
        ],
        figure: {
          src: "/media/journal/quality-checklist.svg",
          alt: "Checklist of eight things a good jewellery listing tells you, from base metal and finish to returns and delivery.",
        },
      },
      {
        h: "1. The metal, named precisely",
        p: [
          "\"Gold\" isn't a description. Look for the base metal (316L stainless steel, sterling silver, brass) and the finish (PVD, vermeil, gold-plated, gold-filled, rhodium-plated). If you only see \"gold tone\", \"premium alloy\" or \"fashion metal\", assume the cheapest option. Our [guide to gold finishes](/journal/how-long-does-gold-plated-jewellery-last) explains what each one means for durability.",
        ],
      },
      {
        h: "2. The stones, named honestly",
        p: [
          "Cubic zirconia, crystal, freshwater pearl, lab-created: these are all fine, as long as they're called what they are. Be wary of \"diamond-like\" or \"simulated diamond\" with no stone named. See [Is Cubic Zirconia \"Fake\"?](/journal/cubic-zirconia-vs-diamond-vs-moissanite) for what the common stones are.",
        ],
      },
      {
        h: "3. Measurements you can picture",
        p: [
          "Chain length in centimetres or inches, link or band width in millimetres, ring sizes, earring drop length, and ideally weight. Measurements stop the most common disappointment: a piece that looks much bigger in the photo. Hold a ruler up to your neck or wrist to picture it, or use our [necklace length guide](/journal/necklace-length-guide).",
        ],
      },
      {
        h: "4. The clasp and closure",
        p: [
          "A lobster clasp is more secure than a spring ring; a tennis bracelet should have a safety catch; earrings should say whether they use butterfly backs, screw backs or a hinge. Clasps are where cheap jewellery fails first.",
        ],
      },
      {
        h: "5. Photos from more than one angle",
        p: [
          "Look for the back of the piece, the clasp, and a photo or video on a person for scale. A single heavily edited image on white is a reason to ask questions.",
        ],
      },
      {
        h: "6. Delivery and returns in writing",
        p: [
          "You should be able to find delivery times for your country, whether there's tracking, how long you have to return something, and what happens if it arrives damaged, before you pay. Ours are laid out in [How Long Does International Jewellery Delivery Take?](/journal/international-jewellery-delivery-times) and [What Happens If My Jewellery Arrives Damaged?](/journal/jewellery-returns-and-damaged-orders)",
        ],
      },
      {
        h: "Red flags",
        list: [
          "No base metal or finish named anywhere.",
          "Prices that look too good to be true for \"solid gold\" or \"real diamonds\".",
          "No returns policy, or returns only for store credit.",
          "No delivery estimate, or a vague \"ships in 2–8 weeks\".",
          "No way to contact a person.",
        ],
      },
    ],
    faq: [
      { q: "How can I tell if gold jewellery is real online?", a: "Solid gold is sold with a karat stamp (such as 14k or 18k) and is priced accordingly. Anything described as plated, PVD, vermeil or gold-filled has a gold layer over another metal, which is fine, as long as the listing says so." },
      { q: "Is heavier jewellery better quality?", a: "Not always, but weight is a useful clue. Very light chains are often hollow or thin. A listing that gives the weight lets you compare." },
    ],
  },
  {
    slug: "international-jewellery-delivery-times",
    title: "How Long Does International Jewellery Delivery Take?",
    description:
      "Why a parcel takes 6 to 18 business days depending on where you live, what 'dispatch' and 'transit' mean, how tracking works, and how to plan around a deadline.",
    topic: "buying",
    date: "2026-11-16",
    answer:
      "We prepare and dispatch orders within 1–3 business days. Standard tracked delivery then takes 6–10 business days to North America, 7–12 to Europe, the UK and the Gulf, 8–14 to Oceania, 9–16 to Africa and 10–18 elsewhere. Express (4–7 business days) is available to most countries. Customs and public holidays can add time.",
    hero: "midnight-gift-box",
    heroVariant: 2,
    shop: ["midnight-gift-box", "the-layering-edit", "the-stack-trio"],
    related: ["customs-duties-on-jewellery-orders", "jewellery-returns-and-damaged-orders", "jewellery-gift-without-knowing-size"],
    sections: [
      {
        p: [
          "\"Where's my order?\" is the most common question any online jewellery shop gets. Delivery happens in stages, and knowing what each stage means makes the wait far less mysterious.",
        ],
        figure: {
          src: "/media/journal/delivery-timeline.svg",
          alt: "Order timeline from order placed to dispatch in 1–3 business days to tracked transit and delivery, with transit times by region.",
        },
      },
      {
        h: "Stage 1: preparing and dispatching (1–3 business days)",
        p: [
          "Your pieces are picked, checked, wrapped individually and packed in our signature red gift box. Dispatch happens within 1–3 business days of your order; business days exclude weekends and public holidays, so an order placed on a Friday evening starts on Monday.",
        ],
      },
      {
        h: "Stage 2: in transit (depends on where you live)",
        table: {
          head: ["Region", "Standard (business days after dispatch)", "Cost"],
          rows: [
            ["North America", "6–10", "$4.99"],
            ["Europe & UK", "7–12", "$5.99"],
            ["Gulf", "7–12", "$5.99"],
            ["Oceania", "8–14", "$6.99"],
            ["Africa", "9–16", "$6.99"],
            ["Rest of world", "10–18", "$7.99"],
            ["Express (most countries)", "4–7", "Standard rate + $12"],
          ],
          caption: "Shipping is free on orders over $59.",
        },
        after: [
          "International parcels travel by air to your country, clear customs, and are handed to a local carrier for the last stretch. Distance and the number of handovers are why some regions take longer.",
        ],
      },
      {
        h: "Tracking your parcel",
        p: [
          "You'll get a tracking number by email when your order ships, and you can check progress any time on our Track Order page with your order number and email. Tracking can go quiet for a few days while a parcel is in the air or waiting at customs. That's normal, and it usually updates again once the local carrier scans it.",
        ],
      },
      {
        h: "What can slow things down",
        list: [
          "**Customs checks**, especially around holiday peaks. Here's [how customs and import fees work](/journal/customs-duties-on-jewellery-orders).",
          "**Public holidays** in the sending or receiving country.",
          "**Incomplete addresses**: include flat numbers, building names and a phone number.",
          "**Peak seasons** such as late November and December.",
        ],
      },
      {
        h: "Ordering for a deadline",
        p: [
          "Add the dispatch time to the top of your region's range and a few days' buffer, or choose express. For a birthday on the 20th in Europe, for example, ordering standard delivery by the start of the month is sensible. Buying a gift? Our [gift guide for when you don't know their size](/journal/jewellery-gift-without-knowing-size) helps you choose a safe piece in time.",
        ],
      },
    ],
    faq: [
      { q: "Do you ship worldwide?", a: "Yes, we ship to over 190 countries with tracking. Delivery times depend on the region, from 6–10 business days in North America to 10–18 for the rest of the world, plus 1–3 days to dispatch." },
      { q: "My tracking hasn't updated for days. Is my parcel lost?", a: "Usually not: tracking often pauses while a parcel is in the air or at customs. If it hasn't moved for over a week, email us with your order number and we'll look into it." },
    ],
  },
  {
    slug: "customs-duties-on-jewellery-orders",
    title: "Will I Pay Customs Duties or VAT on My Jewellery Order?",
    description:
      "Why some international orders arrive with a customs charge and others don't, who sets the fees, who you pay, and how to estimate them before you order.",
    topic: "buying",
    date: "2026-11-16",
    answer:
      "You might. Many countries charge import VAT or sales tax, and sometimes duty, on parcels from abroad. Our prices don't include these. The amount is set by your country's customs, and it's usually collected by the delivery company before or at delivery. Your national customs website or the carrier's calculator gives you an estimate.",
    hero: "figaro-chain-bracelet",
    heroVariant: 2,
    shop: ["figaro-chain-bracelet", "eternity-band", "luna-huggie-hoops"],
    related: ["international-jewellery-delivery-times", "jewellery-returns-and-damaged-orders", "how-to-judge-jewellery-quality-online"],
    sections: [
      {
        p: [
          "There's nothing worse than a surprise fee on the doorstep. Import charges aren't set by the shop you buy from; they're set by the country you live in. Here's how they work, so you can plan for them.",
        ],
        figure: {
          src: "/media/journal/customs.svg",
          alt: "Four steps: the parcel lands in your country, duty and VAT are assessed, the carrier collects any fees, then the parcel is delivered.",
        },
      },
      {
        h: "Duty vs VAT: two different charges",
        list: [
          "**Import VAT, GST or sales tax**: the same tax you'd pay buying locally, charged on imports too.",
          "**Customs duty**: a tariff on certain goods from certain countries. Jewellery often has its own duty rate.",
          "**Handling fee**: some carriers add an admin fee for paying the charges on your behalf.",
        ],
      },
      {
        h: "When are charges likely?",
        p: [
          "Rules change, so always check your own country's customs website, but some general patterns hold:",
        ],
        list: [
          "**EU**: since July 2021, VAT applies to imported goods of any value, so even small parcels can carry VAT.",
          "**UK**: VAT applies to imported goods, and duty can apply on top above certain values.",
          "**United States**: in 2025 the US suspended its long-standing $800 duty-free allowance for imported parcels, so duties can now apply to small orders too.",
          "**Elsewhere**: many countries have a threshold below which no charges apply. Above it, VAT or GST and sometimes duty are added.",
        ],
      },
      {
        h: "Who you pay, and when",
        p: [
          "Charges are paid to your country's customs, usually through the delivery company, which may text or email you a payment link before delivery or collect the fee at the door. They aren't paid to us, and we can't waive them. If you refuse to pay, the parcel is usually returned to the sender.",
        ],
        tip: "Watch out for fake 'customs fee' texts. A genuine request comes from the carrier named in your tracking. If in doubt, go to the carrier's website directly rather than tapping a link.",
      },
      {
        h: "How to estimate the charges before ordering",
        steps: [
          "Look up your country's customs or tax authority website and search \"import VAT\" or \"de minimis\".",
          "Find the rate for jewellery, or use the carrier's online duty calculator.",
          "Apply it to your order total. Some countries include the shipping cost in the value.",
        ],
        after: [
          "Then add the delivery time for your region, covered in [How Long Does International Jewellery Delivery Take?](/journal/international-jewellery-delivery-times)",
        ],
      },
      {
        h: "What happens to charges if I return something?",
        p: [
          "Returns follow our 30-day policy, explained in [What Happens If My Jewellery Arrives Damaged or Doesn't Suit Me?](/journal/jewellery-returns-and-damaged-orders) Import taxes are collected by your country's authorities rather than by us. Some countries let you reclaim them on returned goods, so check with your customs office or the carrier.",
        ],
      },
    ],
    faq: [
      { q: "Are duties and taxes included in your prices?", a: "No. Our prices don't include import duty or VAT, which some countries charge on arrival. These are set by your local customs office." },
      { q: "Why was I charged customs on a small order?", a: "Many countries now charge VAT on imports of any value, and the US suspended its $800 duty-free allowance in 2025, so even small parcels can attract charges." },
    ],
  },
  {
    slug: "jewellery-returns-and-damaged-orders",
    title: "What Happens If My Jewellery Arrives Damaged or Doesn't Suit Me?",
    description:
      "How returns, refunds and replacements work for jewellery bought online, the hygiene rule for earrings, and how to make a return go smoothly.",
    topic: "buying",
    date: "2026-11-16",
    answer:
      "If something arrives damaged or wrong, email us a photo within 7 days and we'll replace it free of charge. If you've changed your mind, return unworn pieces in their original packaging within 30 days of delivery for a full refund of the item price. Earrings can only be returned unopened, for hygiene reasons.",
    hero: "aurora-crystal-drops",
    heroVariant: 2,
    shop: ["the-layering-edit", "aurora-crystal-drops", "eternity-band"],
    related: ["between-ring-sizes", "international-jewellery-delivery-times", "customs-duties-on-jewellery-orders"],
    sections: [
      {
        p: [
          "Buying jewellery you haven't held is a leap of faith. A clear returns policy is what makes it a safe one. Here's exactly how ours works, and what to look for in any shop's policy.",
        ],
      },
      {
        h: "If it arrives damaged or isn't what you ordered",
        steps: [
          "Take a clear photo of the piece, and of the packaging if it was damaged in transit.",
          "Email it to us with your order number within 7 days of delivery.",
          "We'll replace it free of charge.",
        ],
        after: [
          "Please don't wear or alter the piece in the meantime, so we can see exactly what went wrong.",
        ],
      },
      {
        h: "If you've changed your mind",
        steps: [
          "Email us with your order number within 30 days of delivery.",
          "We'll send you the return address and instructions.",
          "Send the piece back unworn, in its original packaging.",
          "Your refund for the item price goes back to your original payment method within 5 business days of the return arriving.",
        ],
        tip: "Ring the wrong size? Read [Between Two Ring Sizes?](/journal/between-ring-sizes) before reordering, so the next one fits first time.",
      },
      {
        h: "Why earrings are different",
        p: [
          "Earrings go through the skin, so for hygiene reasons we can only accept them back unopened. If you have sensitive ears, choose carefully before opening: our [guide for sensitive ears](/journal/earrings-for-sensitive-ears) explains which posts and styles are kindest.",
        ],
      },
      {
        h: "What \"unworn\" means",
        list: [
          "No signs of wear, scratches or marks on the metal or stones.",
          "Not resized or altered.",
          "Returned with its box and packaging.",
        ],
        after: [
          "Trying a piece on briefly at home to check the size and look is fine. Wearing it out for the evening isn't.",
        ],
      },
      {
        h: "What to check in any shop's returns policy",
        list: [
          "How many days you have, and whether that counts from order or delivery.",
          "Whether you get a refund or only store credit.",
          "Who covers damage in transit.",
          "Any items that can't be returned (earrings, personalised pieces).",
        ],
        after: [
          "It's one of the eight checks in our guide to [judging jewellery quality online](/journal/how-to-judge-jewellery-quality-online). And for how long the return trip takes, see [international delivery times](/journal/international-jewellery-delivery-times).",
        ],
      },
    ],
    faq: [
      { q: "How long do I have to return jewellery?", a: "30 days from delivery for unworn pieces in their original packaging. Earrings must be unopened." },
      { q: "What if my order arrives broken?", a: "Email us a photo with your order number within 7 days of delivery and we'll send a replacement free of charge." },
    ],
  },
  {
    slug: "jewellery-gift-without-knowing-size",
    title: "How to Buy Jewellery as a Gift When You Don't Know Their Size or Style",
    description:
      "The safest pieces to give when you can't ask, how to find out a ring size without spoiling the surprise, and how to read someone's style from what they already wear.",
    topic: "gifting",
    date: "2026-11-16",
    answer:
      "Choose pieces that don't need a size: a 45 cm necklace with an extender, stud or huggie earrings (check their ears are pierced), or a bracelet with an extender or an adjustable cuff. For a ring, borrow one they already wear on that finger and measure it. Match the metal and scale to what they wear most.",
    hero: "ember-ruby-heart-necklace",
    heroVariant: 2,
    shop: ["midnight-gift-box", "the-layering-edit", "ember-ruby-heart-necklace", "torque-cuff"],
    related: ["necklace-length-guide", "how-to-measure-ring-size-at-home", "international-jewellery-delivery-times"],
    sections: [
      {
        p: [
          "Jewellery is one of the most personal gifts you can give, and that's exactly what makes it nerve-racking to buy. The answer is to choose pieces where size doesn't matter, and to read their style from what they already wear.",
        ],
        figure: {
          src: "/media/journal/gift-sizing.svg",
          alt: "Guide to gifting without a size: necklaces are safest, earrings and bracelets are safe, rings are riskier.",
        },
      },
      {
        h: "The safest gifts, in order",
        list: [
          "**A necklace**: 45 cm with an extender suits almost everyone. See where it sits in our [necklace length guide](/journal/necklace-length-guide).",
          "**Earrings**: no size at all. Just check their ears are pierced, and choose studs or huggies if they have sensitive skin.",
          "**A bracelet**: an extender chain (our Figaro bracelet is 17 cm + 3 cm) or an open cuff (the Torque cuff fits 15–18 cm wrists).",
          "**A ring**: lovely, but only if you can find out the size.",
        ],
      },
      {
        h: "Finding a ring size without asking",
        steps: [
          "Borrow a ring they wear on the right finger, ideally overnight, and measure the inside diameter with a ruler.",
          "No chance to borrow one? Press it into a bar of soap or draw round the inside on paper.",
          "Ask a close friend or family member, who may already know.",
          "Still unsure? Choose the larger size: a slightly loose ring can be fixed with a sizing guard.",
        ],
        after: [
          "Then match the measurement using our [guide to measuring ring size at home](/journal/how-to-measure-ring-size-at-home).",
        ],
      },
      {
        h: "Reading their style",
        table: {
          head: ["If they usually wear…", "Try…"],
          rows: [
            ["Mostly gold, delicate pieces", "A fine pendant, like a teardrop or heart"],
            ["Mostly silver tones", "A silver-tone tennis necklace or halo ring"],
            ["Bold, minimal pieces", "A polished cuff or a paperclip chain"],
            ["Classic, polished outfits", "Pearl studs"],
            ["Lots of layers", "A pre-measured layering set"],
            ["Very little jewellery", "Small huggies or studs: easy first pieces"],
          ],
        },
      },
      {
        h: "Make it feel like a gift",
        list: [
          "Every order arrives in our signature red gift box at no extra cost.",
          "Add a gift note at checkout and we'll leave the prices off the parcel.",
          "Our gift sets (the Layering Edit, the Stack Trio and the Midnight box) are pre-matched, so the styling is done for you.",
        ],
      },
      {
        h: "Plan the timing",
        p: [
          "Allow 1–3 business days for dispatch plus the transit time for their region, or choose express. Our [delivery times guide](/journal/international-jewellery-delivery-times) lists each region, and [this guide to customs](/journal/customs-duties-on-jewellery-orders) explains any import charges if you're sending it abroad. And if the gift isn't quite right, unworn pieces can be returned within 30 days of delivery, as long as earrings are unopened.",
        ],
      },
    ],
    faq: [
      { q: "What is the safest jewellery gift?", a: "A necklace, especially an 18-inch (45 cm) pendant with an extender. It needs no ring size, suits most necklines and is easy to wear every day." },
      { q: "Is a ring a good gift if I don't know the size?", a: "Only if you can find out the size first, for example by measuring a ring they already wear. Otherwise a necklace, earrings or an adjustable bracelet is a safer choice." },
    ],
  },
];
