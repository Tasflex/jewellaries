import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import CartDrawer from "@/components/CartDrawer";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import JsonLd from "@/components/JsonLd";
import { StoreProvider } from "@/components/store";
import { getCatalog } from "@/lib/catalog";
import { FALLBACK_RATES } from "@/lib/currency";
import { organization, website } from "@/lib/jsonld";
import { SITE } from "@/lib/site";
import "./globals.css";

// Self-hosted (OFL) variable fonts: no build-time download, no third-party request for visitors.
const serif = localFont({
  src: [
    { path: "./fonts/CormorantGaramond.ttf", style: "normal", weight: "300 700" },
    { path: "./fonts/CormorantGaramond-Italic.ttf", style: "italic", weight: "300 700" },
  ],
  variable: "--font-serif",
  display: "swap",
});
const sans = localFont({ src: "./fonts/Inter.ttf", weight: "100 900", variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} | Waterproof Gold Jewellery That Catches the Light`, template: `%s | ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: ["gold jewellery", "waterproof jewelry", "layering necklaces", "huggie earrings", "stackable rings", "tennis bracelet", "jewellery gifts"],
  alternates: { canonical: "/" },
  openGraph: { type: "website", siteName: SITE.name, url: SITE.url, title: SITE.name, description: SITE.description, locale: "en_US" },
  twitter: { card: "summary_large_image", title: SITE.name, description: SITE.description },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-video-preview": -1 } },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { themeColor: "#0b0a0c", width: "device-width", initialScale: 1 };

async function getRates(): Promise<Record<string, number>> {
  try {
    const r = await fetch(`${process.env.API_URL || "http://127.0.0.1:8300"}/v1/currencies`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(2500),
    });
    if (r.ok) return (await r.json()).rates;
  } catch {}
  return FALLBACK_RATES;
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [cat, rates] = await Promise.all([getCatalog(), getRates()]);
  const mini = cat.products.map(({ slug, name, price, category }) => ({ slug, name, price, category }));
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`} data-theme="dark" suppressHydrationWarning>
      <head>
        {/* Apply the saved (or device) theme before first paint: no light/dark flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("jw_theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}document.documentElement.dataset.theme=t;var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",t==="light"?"#fbf8f2":"#0b0a0c")}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <a href="#main" className="sr-only">
          Skip to content
        </a>
        <StoreProvider rates={rates} products={mini}>
          <Header />
          <main id="main">{children}</main>
          <Footer />
          <CartDrawer />
        </StoreProvider>
        <JsonLd data={[organization(), website()]} />
      </body>
    </html>
  );
}
