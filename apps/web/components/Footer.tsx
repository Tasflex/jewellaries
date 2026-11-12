import Link from "next/link";
import { SITE } from "@/lib/site";
import { CurrencySelect } from "./Header";
import { Newsletter } from "./bits";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap footer-top">
        <div className="footer-brand">
          <p className="logo">
            JEWELLARI<span>ESS</span>
          </p>
          <p className="muted">{SITE.tagline} Waterproof, hypoallergenic, and made to be layered and gifted.</p>
          <Newsletter dark />
        </div>
        <nav aria-label="Shop">
          <h3>Shop</h3>
          <Link href="/shop">All jewellery</Link>
          <Link href="/shop/necklaces">Necklaces</Link>
          <Link href="/shop/earrings">Earrings</Link>
          <Link href="/shop/rings">Rings</Link>
          <Link href="/shop/bracelets">Bracelets</Link>
          <Link href="/shop/gift-sets">Gift sets</Link>
        </nav>
        <nav aria-label="Discover">
          <h3>Discover</h3>
          <Link href="/watch">Watch &amp; Shop</Link>
          <Link href="/gifts">Gift guide</Link>
          <Link href="/journal">Journal</Link>
          <Link href="/about">Our story</Link>
        </nav>
        <nav aria-label="Help">
          <h3>Help</h3>
          <Link href="/track">Track your order</Link>
          <Link href="/help/shipping">Shipping</Link>
          <Link href="/help/returns">Returns</Link>
          <Link href="/help/sizing">Ring sizing</Link>
          <Link href="/help/care">Jewellery care</Link>
          <Link href="/help/faq">FAQ</Link>
        </nav>
      </div>
      <div className="wrap footer-bottom">
        <p>
          © {new Date().getFullYear()} {SITE.name}. Ships worldwide.
        </p>
        <div className="footer-social">
          <a href={SITE.social.tiktok} rel="noopener" target="_blank">
            TikTok
          </a>
          <a href={SITE.social.instagram} rel="noopener" target="_blank">
            Instagram
          </a>
          <a href={SITE.social.youtube} rel="noopener" target="_blank">
            YouTube
          </a>
          <Link href="/help/privacy">Privacy</Link>
          <Link href="/help/terms">Terms</Link>
          <CurrencySelect />
        </div>
      </div>
    </footer>
  );
}
