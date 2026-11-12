import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import Reel from "@/components/Reel";
import { getCatalog, getVideos } from "@/lib/catalog";
import { videoObject } from "@/lib/jsonld";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Watch & Shop: Jewellery Close-ups, Layering Demos & Unboxings",
  description: "Watch our jewellery catch the light: macro close-ups, necklace layering and ring stacking demos, and red-box gift unboxings. Shop every piece you see.",
  alternates: { canonical: "/watch" },
};

const LABEL = { glint: "Close-up", layering: "Layering demo", unboxing: "Unboxing" } as const;

export default async function Watch() {
  const [c, videos] = await Promise.all([getCatalog(), getVideos()]);
  const by = Object.fromEntries(c.products.map((p) => [p.slug, p]));
  return (
    <div className="wrap">
      <header className="page-head">
        <span className="eyebrow">Watch &amp; shop</span>
        <h1>Caught on camera</h1>
        <p className="muted">
          Every video is made in our own studio: real light sweeps, real layering, real red-box unboxings. Turn the sound on for the
          sparkle.
        </p>
      </header>
      {videos.length === 0 ? (
        <p className="muted">New videos are rendering. Check back shortly.</p>
      ) : (
        <div className="feed">
          {videos.map((v) => (
            <Reel
              key={v.video}
              src={v.video}
              poster={v.poster}
              label={`${LABEL[v.format]} · ${by[v.slug]?.name ?? ""}`}
              href={`/product/${v.slug}`}
            />
          ))}
        </div>
      )}
      <JsonLd data={{ "@context": "https://schema.org", "@type": "ItemList", itemListElement: videos.map((v, i) => ({ "@type": "ListItem", position: i + 1, item: videoObject(v, by[v.slug]) })) }} />
      <div style={{ height: "4rem" }} />
    </div>
  );
}
