import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Our Story",
  description: "Aurum Rosso makes waterproof gold jewellery that catches the light, designed to layer and to gift, and shipped worldwide in our signature red box.",
  alternates: { canonical: "/about" },
};

export default function About() {
  return (
    <div className="wrap">
      <div className="prose" style={{ padding: "4rem 0" }}>
        <span className="eyebrow">Our story</span>
        <h1>Gold, and a little red.</h1>
        <p>
          <em>Aurum</em> is Latin for gold. <em>Rosso</em> is Italian for red. Put together, that&rsquo;s everything we care about:
          jewellery with the warmth of real gold, and the red box that turns it into a moment.
        </p>
        <div style={{ position: "relative", aspectRatio: "16 / 10", borderRadius: 14, overflow: "hidden", margin: "2rem 0" }}>
          <Image src="/media/products/midnight-gift-box-1.webp" alt="The Aurum Rosso red gift box" fill sizes="736px" style={{ objectFit: "cover" }} />
        </div>
        <h2>Made for real life</h2>
        <p>
          Our pieces are 18k gold PVD over 316L surgical-grade steel, so they handle showers, sweat and the sea without fading.
          We design them to layer and stack, so each one works on its own and with everything else you own.
        </p>
        <h2>Shipped to your door, anywhere</h2>
        <p>
          We ship to more than 190 countries with tracked delivery, free on orders over ${SITE.freeShippingUsd}. Every order
          arrives gift-boxed, because sooner or later most of our jewellery ends up as a present.
        </p>
        <h2 id="contact">Contact</h2>
        <p>
          Questions about an order, sizing or a gift? Email <a href={`mailto:${SITE.email}`} className="gold">{SITE.email}</a> and we&rsquo;ll
          reply within one business day. You can also <Link href="/track" className="gold">track your order</Link>.
        </p>
      </div>
    </div>
  );
}
