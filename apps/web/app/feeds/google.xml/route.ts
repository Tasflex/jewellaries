import { getCatalog } from "@/lib/catalog";
import { SITE, abs } from "@/lib/site";

// Product feed for Google Merchant Center (free listings + Shopping ads).
// The same URL works for TikTok Shop and Meta (Instagram) catalogues.
export const revalidate = 3600;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const GOOGLE_CATEGORY: Record<string, string> = {
  necklaces: "Apparel & Accessories > Jewelry > Necklaces",
  earrings: "Apparel & Accessories > Jewelry > Earrings",
  rings: "Apparel & Accessories > Jewelry > Rings",
  bracelets: "Apparel & Accessories > Jewelry > Bracelets",
  "gift-sets": "Apparel & Accessories > Jewelry > Jewelry Sets",
};

export async function GET() {
  const c = await getCatalog();
  const items = c.products
    .map((p) => {
      const sale = SITE.showCompareAt && p.compare_at > p.price;
      return `<item>
<g:id>${esc(p.supplier.sku)}</g:id>
<g:title>${esc(`${p.name}: ${p.highlights[0]}`)}</g:title>
<g:description>${esc(p.description)}</g:description>
<g:link>${abs(`/product/${p.slug}`)}</g:link>
<g:image_link>${abs(`/media/products/${p.slug}-sq.jpg`)}</g:image_link>
<g:additional_image_link>${abs(`/media/products/${p.slug}-2.webp`)}</g:additional_image_link>
<g:availability>${p.stock > 0 ? "in_stock" : "out_of_stock"}</g:availability>
<g:price>${(sale ? p.compare_at : p.price).toFixed(2)} USD</g:price>
${sale ? `<g:sale_price>${p.price.toFixed(2)} USD</g:sale_price>` : ""}
<g:brand>${esc(SITE.name)}</g:brand>
<g:condition>new</g:condition>
<g:identifier_exists>no</g:identifier_exists>
<g:google_product_category>${esc(GOOGLE_CATEGORY[p.category] ?? "Apparel & Accessories > Jewelry")}</g:google_product_category>
<g:product_type>${esc(p.category)}</g:product_type>
<g:color>${p.metal === "gold" ? "Gold" : p.metal === "silver" ? "Silver" : "Rose Gold"}</g:color>
<g:age_group>adult</g:age_group>
<g:gender>unisex</g:gender>
<g:shipping><g:price>0 USD</g:price><g:min_handling_time>1</g:min_handling_time><g:max_handling_time>3</g:max_handling_time></g:shipping>
</item>`;
    })
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
<title>${esc(SITE.name)}</title>
<link>${SITE.url}</link>
<description>${esc(SITE.description)}</description>
${items}
</channel>
</rss>`;
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
